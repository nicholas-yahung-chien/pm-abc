/**
 * Notification logic for P1 — tracking due reminders & study session reminders.
 *
 * Each function:
 *  1. Queries relevant data from Supabase.
 *  2. Resolves recipients (with coach fallback for dev redirect).
 *  3. Checks idempotency — skips if log entry already exists.
 *  4. Inserts a pending log row, sends email, then updates the row.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Build a stable idempotency key for a given send attempt. */
function makeIdempotencyKey(type: string, ...ids: string[]): string {
  // Include the calendar date so the same item triggers at most once per day.
  return `${type}:${ids.join(":")}:${todayDateString()}`;
}

type NotifyResult = {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
};

// ─── 1. Tracking due-date reminders ─────────────────────────────────────────

/**
 * Find incomplete tracking items whose due_date is today or tomorrow,
 * then send a reminder to the responsible member.
 */
export async function checkTrackingDueDates(): Promise<NotifyResult> {
  const db = getSupabaseAdminClient();
  if (!db) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  const today = todayDateString();
  const tomorrow = tomorrowDateString();

  // Fetch items due today or tomorrow that are not yet completed
  const { data: items, error } = await db
    .from("tracking_items")
    .select(
      [
        "id",
        "group_id",
        "title",
        "due_date",
        "is_completed",
        "owner_person_id",
        "owner:people!tracking_items_owner_person_id_fkey(id, full_name, display_name, email)",
        "group:groups(id, name, code)",
        "section:tracking_sections!tracking_items_section_id_fkey(id, title)",
      ].join(", "),
    )
    .in("due_date", [today, tomorrow])
    .eq("is_completed", false)
    .not("owner_person_id", "is", null);

  if (error || !items) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  const rows = (items as unknown as Record<string, unknown>[]);

  // Build group_id → coach email map
  const coachMap = await buildGroupCoachEmailMap(db);

  const result: NotifyResult = { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  for (const item of rows) {
    const owner = Array.isArray(item.owner) ? (item.owner as Record<string, unknown>[])[0] : item.owner as Record<string, unknown> | null;
    if (!owner?.email) continue;

    const group = Array.isArray(item.group) ? (item.group as Record<string, unknown>[])[0] : item.group as Record<string, unknown> | null;
    const section = Array.isArray(item.section) ? (item.section as Record<string, unknown>[])[0] : item.section as Record<string, unknown> | null;

    const idempotencyKey = makeIdempotencyKey(
      "tracking_due_reminder",
      item.id as string,
      owner.id as string,
    );

    // Skip if already attempted today
    const { data: existing } = await db
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing) { result.skipped++; continue; }

    result.attempted++;

    const dueLabel = item.due_date === today ? "今天" : "明天";
    const subject = `【追蹤提醒】${item.title} 將於${dueLabel}到期`;
    const html = buildTrackingReminderHtml({
      recipientName: (owner.display_name || owner.full_name) as string,
      itemTitle: item.title as string,
      groupName: (group?.name as string) ?? "",
      sectionTitle: (section?.title as string) ?? "",
      dueDate: item.due_date as string | null,
      dueLabel,
    });

    const coachEmail = coachMap.get(item.group_id as string);

    // Insert pending log
    const { data: logRow } = await db
      .from("notification_logs")
      .insert({
        notification_type: "tracking_due_reminder",
        recipient_person_id: owner.id as string,
        recipient_email: owner.email as string,
        delivered_to_email: coachEmail ?? (owner.email as string),
        dev_redirected: false, // will be updated after send
        subject,
        tracking_item_id: item.id as string,
        idempotency_key: idempotencyKey,
        status: "pending",
      })
      .select("id")
      .single();

    const sendResult = await sendEmail({
      recipientEmail: owner.email as string,
      coachEmail,
      subject,
      html,
    });

    if (logRow?.id) {
      await db
        .from("notification_logs")
        .update({
          status: sendResult.skipped ? "skipped" : sendResult.error ? "failed" : "sent",
          dev_redirected: sendResult.devRedirected,
          delivered_to_email: sendResult.deliveredTo || owner.email,
          error_message: sendResult.error ?? null,
          sent_at: sendResult.error || sendResult.skipped ? null : new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }

    if (sendResult.skipped) result.skipped++;
    else if (sendResult.error) result.failed++;
    else result.sent++;
  }

  return result;
}

// ─── 2. Study session reminders ──────────────────────────────────────────────

/**
 * Send T-1 day reminders for sessions happening tomorrow.
 */
export async function checkStudySessionReminders1Day(): Promise<NotifyResult> {
  const db = getSupabaseAdminClient();
  if (!db) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  const tomorrow = tomorrowDateString();

  const { data: sessions, error } = await db
    .from("group_study_sessions")
    .select("id, group_id, title, session_date, start_time, mode, online_meeting_url, location_address, group:groups(id, name, code)")
    .eq("session_date", tomorrow);

  if (error || !sessions) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  return sendStudySessionReminders(db, sessions as unknown as Record<string, unknown>[], "study_session_reminder_1day", "明天");
}

/**
 * Send T-2 hour reminders for sessions starting within the next 2–3 hours.
 */
export async function checkStudySessionReminders2Hour(): Promise<NotifyResult> {
  const db = getSupabaseAdminClient();
  if (!db) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  const now = new Date();
  const windowStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h
  const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);   // +3h

  const todayStr = todayDateString();
  const startTime = windowStart.toTimeString().slice(0, 5); // "HH:MM"
  const endTime = windowEnd.toTimeString().slice(0, 5);

  const { data: sessions, error } = await db
    .from("group_study_sessions")
    .select("id, group_id, title, session_date, start_time, mode, online_meeting_url, location_address, group:groups(id, name, code)")
    .eq("session_date", todayStr)
    .gte("start_time", startTime)
    .lte("start_time", endTime);

  if (error || !sessions) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  return sendStudySessionReminders(db, sessions as unknown as Record<string, unknown>[], "study_session_reminder_2hour", "2 小時後");
}

// ─── Shared study session sender ─────────────────────────────────────────────

async function sendStudySessionReminders(
  db: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  sessions: Record<string, unknown>[],
  notificationType: "study_session_reminder_1day" | "study_session_reminder_2hour",
  timeLabel: string,
): Promise<NotifyResult> {
  const coachMap = await buildGroupCoachEmailMap(db);
  const result: NotifyResult = { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  for (const session of sessions) {
    const groupId = session.group_id as string;
    const group = Array.isArray(session.group) ? session.group[0] : session.group as Record<string, unknown> | null;

    // Get all members in this group
    const { data: memberships } = await db
      .from("group_memberships")
      .select("person_id, membership_type, person:people(id, full_name, display_name, email)")
      .eq("group_id", groupId);

    if (!memberships?.length) continue;

    for (const membership of memberships) {
      const person = Array.isArray(membership.person) ? membership.person[0] : membership.person as Record<string, unknown> | null;
      if (!person?.email) continue;

      const idempotencyKey = makeIdempotencyKey(
        notificationType,
        session.id as string,
        person.id as string,
      );

      const { data: existing } = await db
        .from("notification_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) { result.skipped++; continue; }

      result.attempted++;

      const subject = `【讀書會提醒】${session.title as string} 將於${timeLabel}開始`;
      const html = buildStudySessionReminderHtml({
        recipientName: (person.display_name || person.full_name) as string,
        sessionTitle: session.title as string,
        groupName: group?.name as string ?? "",
        sessionDate: session.session_date as string,
        startTime: session.start_time as string | null,
        mode: session.mode as string,
        onlineMeetingUrl: session.online_meeting_url as string,
        locationAddress: session.location_address as string,
        timeLabel,
      });

      const coachEmail = coachMap.get(groupId);

      const { data: logRow } = await db
        .from("notification_logs")
        .insert({
          notification_type: notificationType,
          recipient_person_id: person.id as string,
          recipient_email: person.email as string,
          delivered_to_email: coachEmail ?? (person.email as string),
          dev_redirected: false,
          subject,
          study_session_id: session.id as string,
          idempotency_key: idempotencyKey,
          status: "pending",
        })
        .select("id")
        .single();

      const sendResult = await sendEmail({
        recipientEmail: person.email as string,
        coachEmail,
        subject,
        html,
      });

      if (logRow?.id) {
        await db
          .from("notification_logs")
          .update({
            status: sendResult.skipped ? "skipped" : sendResult.error ? "failed" : "sent",
            dev_redirected: sendResult.devRedirected,
            delivered_to_email: sendResult.deliveredTo || (person.email as string),
            error_message: sendResult.error ?? null,
            sent_at: sendResult.error || sendResult.skipped ? null : new Date().toISOString(),
          })
          .eq("id", logRow.id);
      }

      if (sendResult.skipped) result.skipped++;
      else if (sendResult.error) result.failed++;
      else result.sent++;
    }
  }

  return result;
}

// ─── Data helpers ────────────────────────────────────────────────────────────

/** Returns a map of group_id → coach email for fast lookup. */
async function buildGroupCoachEmailMap(
  db: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
): Promise<Map<string, string>> {
  const { data } = await db
    .from("group_coach_owners")
    .select("group_id, coach:auth_accounts(email)");

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const coach = Array.isArray(row.coach) ? row.coach[0] : row.coach as { email?: string } | null;
    if (coach?.email) {
      map.set(row.group_id as string, coach.email);
    }
  }
  return map;
}

// ─── Email HTML builders ─────────────────────────────────────────────────────

function buildTrackingReminderHtml(opts: {
  recipientName: string;
  itemTitle: string;
  groupName: string;
  sectionTitle: string;
  dueDate: string | null;
  dueLabel: string;
}): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#10223a;">
  <h2 style="color:#b45309;margin-bottom:4px;">追蹤項目到期提醒</h2>
  <p>親愛的 ${opts.recipientName}，</p>
  <p>您有一個追蹤項目將於<strong>${opts.dueLabel}</strong>（${opts.dueDate ?? ""}）到期，請注意完成：</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">
    <tr style="background:#f0f2f5;">
      <td style="padding:6px 10px;font-weight:600;width:100px;">項目名稱</td>
      <td style="padding:6px 10px;">${opts.itemTitle}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;font-weight:600;">所屬小組</td>
      <td style="padding:6px 10px;">${opts.groupName}</td>
    </tr>
    <tr style="background:#f0f2f5;">
      <td style="padding:6px 10px;font-weight:600;">大項</td>
      <td style="padding:6px 10px;">${opts.sectionTitle}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;font-weight:600;">到期日</td>
      <td style="padding:6px 10px;">${opts.dueDate ?? "—"}</td>
    </tr>
  </table>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">此為系統自動發送，請勿直接回覆。</p>
</div>`;
}

function buildStudySessionReminderHtml(opts: {
  recipientName: string;
  sessionTitle: string;
  groupName: string;
  sessionDate: string;
  startTime: string | null;
  mode: string;
  onlineMeetingUrl: string;
  locationAddress: string;
  timeLabel: string;
}): string {
  const locationHtml =
    opts.mode === "online"
      ? `<a href="${opts.onlineMeetingUrl}" style="color:#b45309;">${opts.onlineMeetingUrl || "（連結待補）"}</a>`
      : opts.locationAddress || "（地點待確認）";

  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#10223a;">
  <h2 style="color:#b45309;margin-bottom:4px;">讀書會活動提醒</h2>
  <p>親愛的 ${opts.recipientName}，</p>
  <p>您的讀書會活動將於<strong>${opts.timeLabel}</strong>開始，請做好準備：</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">
    <tr style="background:#f0f2f5;">
      <td style="padding:6px 10px;font-weight:600;width:100px;">活動名稱</td>
      <td style="padding:6px 10px;">${opts.sessionTitle}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;font-weight:600;">所屬小組</td>
      <td style="padding:6px 10px;">${opts.groupName}</td>
    </tr>
    <tr style="background:#f0f2f5;">
      <td style="padding:6px 10px;font-weight:600;">日期</td>
      <td style="padding:6px 10px;">${opts.sessionDate}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;font-weight:600;">時間</td>
      <td style="padding:6px 10px;">${opts.startTime ?? "—"}</td>
    </tr>
    <tr style="background:#f0f2f5;">
      <td style="padding:6px 10px;font-weight:600;">形式</td>
      <td style="padding:6px 10px;">${opts.mode === "online" ? "線上" : "實體"}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;font-weight:600;">${opts.mode === "online" ? "會議連結" : "地點"}</td>
      <td style="padding:6px 10px;">${locationHtml}</td>
    </tr>
  </table>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">此為系統自動發送，請勿直接回覆。</p>
</div>`;
}
