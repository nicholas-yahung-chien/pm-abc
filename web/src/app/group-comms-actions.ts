"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  castGroupPollVote,
  createGroupPoll,
  deleteGroupPoll,
  listGroupCoachOwners,
  listMemberships,
  retractGroupPollVote,
} from "@/lib/repository";
import type { PollType } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function redirectWithMessage(to: string, ok: boolean, message: string): never {
  const params = new URLSearchParams({ status: ok ? "success" : "error", message });
  redirect(`${to}?${params}`);
}

function readText(fd: FormData, key: string): string {
  return (fd.get(key) as string | null)?.trim() ?? "";
}

async function requireCoachAccess(groupId: string, returnTo: string) {
  const session = await getCurrentSession();
  if (!session) redirectWithMessage(returnTo, false, "請先登入。");
  if (session!.role !== "coach" && session!.role !== "admin") {
    redirectWithMessage(returnTo, false, "此功能僅限教練使用。");
  }
  return session!;
}

// ─── Group Email Blast ───────────────────────────────────────────────────────

export async function sendGroupEmailBlastAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const subject = readText(formData, "subject");
  const body = readText(formData, "body");
  const returnTo = `/groups/${groupId}`;

  if (!groupId || !subject || !body) {
    redirectWithMessage(returnTo, false, "請填寫主旨與內容。");
  }

  await requireCoachAccess(groupId, returnTo);

  // Fetch all members in this group
  const allMemberships = await listMemberships();
  const groupMemberships = allMemberships.filter(
    (m) => m.group_id === groupId && m.membership_type === "member",
  );

  if (!groupMemberships.length) {
    redirectWithMessage(returnTo, false, "此小組目前無學員成員。");
  }

  // Resolve coach email for dev redirect
  const coachOwners = await listGroupCoachOwners();
  const coachOwner = coachOwners.find((c) => c.group_id === groupId);
  const coachEmail = coachOwner?.coach?.email;

  // Fetch member emails via Supabase (people table)
  const db = getSupabaseAdminClient();
  if (!db) redirectWithMessage(returnTo, false, "資料庫連線失敗。");

  const personIds = groupMemberships.map((m) => m.person_id);
  const { data: people } = await db!
    .from("people")
    .select("id, email, display_name, full_name")
    .in("id", personIds);

  const members = (people ?? []) as { id: string; email: string; display_name: string; full_name: string }[];
  if (!members.length) redirectWithMessage(returnTo, false, "找不到學員資料。");

  const html = buildBlastHtml({ subject, body });

  // Send to each member and log results
  let sentCount = 0;
  let failCount = 0;

  for (const member of members) {
    if (!member.email) continue;

    const idempotencyKey = `group_email_blast:${groupId}:${member.id}:${subject}:${Date.now()}`;

    const { data: logRow } = await db!
      .from("notification_logs")
      .insert({
        notification_type: "group_email_blast",
        recipient_person_id: member.id,
        recipient_email: member.email,
        delivered_to_email: coachEmail ?? member.email,
        dev_redirected: false,
        subject,
        idempotency_key: idempotencyKey,
        status: "pending",
      })
      .select("id")
      .single();

    const result = await sendEmail({
      recipientEmail: member.email,
      coachEmail,
      subject,
      html,
    });

    if (logRow?.id) {
      await db!
        .from("notification_logs")
        .update({
          status: result.error ? "failed" : "sent",
          dev_redirected: result.devRedirected,
          delivered_to_email: result.deliveredTo || member.email,
          error_message: result.error ?? null,
          sent_at: result.error ? null : new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }

    if (result.error) failCount++;
    else sentCount++;
  }

  const msg =
    failCount === 0
      ? `群發信已成功送出（共 ${sentCount} 位學員）。`
      : `群發信部分完成（成功 ${sentCount}，失敗 ${failCount}）。`;
  redirectWithMessage(returnTo, failCount === 0, msg);
}

function buildBlastHtml(opts: { subject: string; body: string }): string {
  const escaped = opts.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#10223a;">
  <h2 style="color:#b45309;margin-bottom:4px;">${opts.subject}</h2>
  <div style="margin-top:16px;line-height:1.7;font-size:14px;">${escaped}</div>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">此為教練透過系統發送的小組通知，請勿直接回覆此信件。</p>
</div>`;
}

// ─── Polls ───────────────────────────────────────────────────────────────────

export async function createGroupPollAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = `/groups/${groupId}/polls`;
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const pollType = readText(formData, "pollType") as PollType;
  const expiresAt = readText(formData, "expiresAt");

  if (!groupId || !title || !expiresAt) {
    redirectWithMessage(returnTo, false, "請填寫標題與截止時間。");
  }
  if (pollType !== "topic" && pollType !== "time") {
    redirectWithMessage(returnTo, false, "無效的投票類型。");
  }

  const session = await requireCoachAccess(groupId, returnTo);

  // Collect options: optionLabel_0, optionLabel_1, ...
  // For time polls: optionSlot_0, optionSlot_1, ...
  const options: { label: string; slotDatetime?: string | null }[] = [];
  let i = 0;
  while (formData.has(`optionLabel_${i}`)) {
    const label = readText(formData, `optionLabel_${i}`);
    const slot = readText(formData, `optionSlot_${i}`) || null;
    if (label) options.push({ label, slotDatetime: slot });
    i++;
  }

  if (options.length < 2) {
    redirectWithMessage(returnTo, false, "請至少提供兩個選項。");
  }

  const result = await createGroupPoll({
    groupId,
    title,
    description,
    pollType,
    expiresAt,
    options,
    accountId: session.accountId,
  });

  revalidatePath(`/groups/${groupId}/polls`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "投票已建立。");
}

export async function castGroupPollVoteAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const pollId = readText(formData, "pollId");
  const returnTo = `/groups/${groupId}/polls/${pollId}`;

  const session = await getCurrentSession();
  if (!session) redirectWithMessage(returnTo, false, "請先登入。");

  // Resolve personId from session email
  const db = getSupabaseAdminClient();
  if (!db) redirectWithMessage(returnTo, false, "資料庫連線失敗。");

  const { data: personRows } = await db!
    .from("people")
    .select("id")
    .eq("email", session!.email)
    .limit(1);

  const personId = (personRows as { id: string }[] | null)?.[0]?.id;
  if (!personId) redirectWithMessage(returnTo, false, "找不到學員資料。");

  // Collect voted option IDs from form (checkboxes named "optionId")
  const optionIds = formData.getAll("optionId") as string[];
  if (!optionIds.length) redirectWithMessage(returnTo, false, "請選擇至少一個選項。");

  for (const optionId of optionIds) {
    const result = await castGroupPollVote({ pollId, optionId, groupId, personId: personId! });
    if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  }

  revalidatePath(returnTo);
  redirectWithMessage(returnTo, true, "投票已儲存。");
}

export async function retractGroupPollVoteAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const pollId = readText(formData, "pollId");
  const optionId = readText(formData, "optionId");
  const returnTo = `/groups/${groupId}/polls/${pollId}`;

  const session = await getCurrentSession();
  if (!session) redirectWithMessage(returnTo, false, "請先登入。");

  const db = getSupabaseAdminClient();
  if (!db) redirectWithMessage(returnTo, false, "資料庫連線失敗。");

  const { data: personRows } = await db!
    .from("people")
    .select("id")
    .eq("email", session!.email)
    .limit(1);

  const personId = (personRows as { id: string }[] | null)?.[0]?.id;
  if (!personId) redirectWithMessage(returnTo, false, "找不到學員資料。");

  const result = await retractGroupPollVote({ pollId, optionId, personId: personId! });
  revalidatePath(returnTo);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "已取消投票。");
}

export async function deleteGroupPollAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const pollId = readText(formData, "pollId");
  const returnTo = `/groups/${groupId}/polls`;

  await requireCoachAccess(groupId, returnTo);

  const result = await deleteGroupPoll({ pollId, groupId });
  revalidatePath(`/groups/${groupId}/polls`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "投票已刪除。");
}
