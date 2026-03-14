import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ClassRow,
  ClassCourseChapterRow,
  ClassCourseItemRow,
  ClassCourseTopicRow,
  GroupRow,
  GroupCoachOwnerRow,
  GroupStudyReadingAssignmentRow,
  GroupStudyReadingItemRow,
  GroupStudySessionDutyMemberRow,
  GroupStudySessionMode,
  GroupStudySessionRow,
  GroupTrackingProgressRow,
  MembershipRow,
  PersonRow,
  RoleAssignmentRow,
  RoleDefinitionRow,
  TrackingItemResponseType,
  TrackingItemRow,
  TrackingItemMemberCompletionRow,
  TrackingSectionProgressRow,
  TrackingSectionRow,
  TrackingSubsectionRow,
} from "@/lib/types";
import { TRACKING_DIRECT_SUBSECTION_SENTINEL } from "@/lib/tracking";

type MutationResult = { ok: true } | { ok: false; message: string };

function getClientOrError():
  | { client: NonNullable<ReturnType<typeof getSupabaseAdminClient>> }
  | { client: null; error: string } {
  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      client: null,
      error:
        "Supabase server config is missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  return { client };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function normalizeHexColor(value: string, fallback = "#ffffff"): string {
  const normalized = value.trim().toLowerCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : fallback;
}

const TRACKING_ITEM_RESPONSE_TYPES: TrackingItemResponseType[] = [
  "checkbox",
  "number",
  "date",
  "select",
];

const GROUP_STUDY_SESSION_MODES: GroupStudySessionMode[] = ["offline", "online"];

function normalizeGroupStudySessionMode(value: unknown): GroupStudySessionMode {
  if (typeof value !== "string") return "offline";
  return GROUP_STUDY_SESSION_MODES.includes(value as GroupStudySessionMode)
    ? (value as GroupStudySessionMode)
    : "offline";
}

function normalizeTrackingItemResponseType(
  value: unknown,
): TrackingItemResponseType {
  if (typeof value !== "string") return "checkbox";
  return TRACKING_ITEM_RESPONSE_TYPES.includes(value as TrackingItemResponseType)
    ? (value as TrackingItemResponseType)
    : "checkbox";
}

function normalizeTrackingItemResponseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0),
    ),
  );
}

function normalizeTrackingItemMemberNumberValue(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return Number(value);
}

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

async function ensureSystemDefaultSubsectionId(input: {
  client: AdminClient;
  groupId: string;
  sectionId: string;
  accountId?: string | null;
}): Promise<{ ok: true; subsectionId: string } | { ok: false; message: string }> {
  const { client, groupId, sectionId } = input;

  const selectExisting = async () =>
    client
      .from("tracking_subsections")
      .select("id")
      .eq("group_id", groupId)
      .eq("section_id", sectionId)
      .eq("is_system_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

  const { data: existing, error: existingError } = await selectExisting();
  if (existingError) return { ok: false, message: existingError.message };
  if (existing?.id) return { ok: true, subsectionId: String(existing.id) };

  const { data: maxSortRow, error: maxSortError } = await client
    .from("tracking_subsections")
    .select("sort_order")
    .eq("group_id", groupId)
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxSortError) return { ok: false, message: maxSortError.message };

  const nextSortOrder =
    typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;

  const { data: inserted, error: insertError } = await client
    .from("tracking_subsections")
    .insert({
      group_id: groupId,
      section_id: sectionId,
      title: "",
      description: "",
      is_system_default: true,
      sort_order: nextSortOrder,
      created_by_account_id: input.accountId ?? null,
      updated_by_account_id: input.accountId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (!insertError && inserted?.id) {
    return { ok: true, subsectionId: String(inserted.id) };
  }

  if (insertError && (insertError as { code?: string }).code !== "23505") {
    return { ok: false, message: insertError.message };
  }

  const { data: racedExisting, error: racedError } = await selectExisting();
  if (racedError) return { ok: false, message: racedError.message };
  if (!racedExisting?.id) {
    return {
      ok: false,
      message: insertError?.message || "系統預設追蹤小項建立失敗。",
    };
  }

  return { ok: true, subsectionId: String(racedExisting.id) };
}

async function resolveTrackingItemSubsectionId(input: {
  client: AdminClient;
  groupId: string;
  sectionId: string;
  subsectionId?: string | null;
  accountId?: string | null;
}): Promise<{ ok: true; subsectionId: string } | { ok: false; message: string }> {
  const rawSubsectionId = input.subsectionId?.trim() ?? "";
  if (!rawSubsectionId || rawSubsectionId === TRACKING_DIRECT_SUBSECTION_SENTINEL) {
    return ensureSystemDefaultSubsectionId({
      client: input.client,
      groupId: input.groupId,
      sectionId: input.sectionId,
      accountId: input.accountId ?? null,
    });
  }

  const { data: subsection, error } = await input.client
    .from("tracking_subsections")
    .select("id, group_id, section_id")
    .eq("id", rawSubsectionId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!subsection) return { ok: false, message: "找不到追蹤小項。" };

  if (
    String(subsection.group_id) !== input.groupId ||
    String(subsection.section_id) !== input.sectionId
  ) {
    return { ok: false, message: "所選追蹤小項與追蹤大項不一致。" };
  }

  return { ok: true, subsectionId: rawSubsectionId };
}

export async function listClasses(): Promise<ClassRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as ClassRow[];
}

export async function getClassById(classId: string): Promise<ClassRow | null> {
  const db = getClientOrError();
  if (!db.client) return null;

  const { data } = await db.client.from("classes").select("*").eq("id", classId).maybeSingle();
  return (data as ClassRow | null) ?? null;
}

export async function listClassCourseItemsByClassId(
  classId: string,
): Promise<ClassCourseItemRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("class_course_items")
    .select("*, class:classes(id, code, name)")
    .eq("class_id", classId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as ClassCourseItemRow[];
}

export async function listClassCourseTopicsByClassId(
  classId: string,
): Promise<ClassCourseTopicRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data: itemRows, error: itemError } = await db.client
    .from("class_course_items")
    .select("id")
    .eq("class_id", classId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemError || !itemRows?.length) return [];

  const itemIds = itemRows.map((row) => String((row as { id: unknown }).id));
  const { data: topicRows, error: topicError } = await db.client
    .from("class_course_topics")
    .select("*")
    .in("class_course_item_id", itemIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (topicError) return [];
  return (topicRows ?? []) as ClassCourseTopicRow[];
}

export async function listClassCourseChaptersByClassId(
  classId: string,
): Promise<ClassCourseChapterRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data: itemRows, error: itemError } = await db.client
    .from("class_course_items")
    .select("id")
    .eq("class_id", classId);

  if (itemError || !itemRows?.length) return [];
  const itemIds = itemRows.map((row) => String((row as { id: unknown }).id));

  const { data: topicRows, error: topicError } = await db.client
    .from("class_course_topics")
    .select("id")
    .in("class_course_item_id", itemIds);

  if (topicError || !topicRows?.length) return [];
  const topicIds = topicRows.map((row) => String((row as { id: unknown }).id));

  const { data: chapterRows, error: chapterError } = await db.client
    .from("class_course_chapters")
    .select("*")
    .in("class_course_topic_id", topicIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (chapterError) return [];
  return (chapterRows ?? []) as ClassCourseChapterRow[];
}

export async function listGroups(): Promise<GroupRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("groups")
    .select("*, class:classes(id, code, name)")
    .order("created_at", { ascending: false });

  return (data ?? []) as GroupRow[];
}

export async function listPeople(): Promise<PersonRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("people")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as PersonRow[];
}

export async function listMembers(): Promise<PersonRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("people")
    .select("*")
    .eq("person_type", "member")
    .order("created_at", { ascending: false });

  return (data ?? []) as PersonRow[];
}

export async function listMemberships(): Promise<MembershipRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("group_memberships")
    .select(
      "*, group:groups(id, name, code), person:people(id, full_name, display_name, person_type)",
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as MembershipRow[];
}

export async function listMembershipsByEmail(
  emailInput: string,
): Promise<MembershipRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const email = normalizeEmail(emailInput);
  if (!email) return [];

  const { data: peopleRows, error: peopleError } = await db.client
    .from("people")
    .select("id")
    .eq("email", email);

  if (peopleError) return [];
  const personIds = (peopleRows ?? []).map((row) => row.id as string).filter(Boolean);
  if (!personIds.length) return [];

  const { data } = await db.client
    .from("group_memberships")
    .select(
      "*, group:groups(id, name, code), person:people(id, full_name, display_name, person_type)",
    )
    .in("person_id", personIds)
    .order("created_at", { ascending: false });

  return (data ?? []) as MembershipRow[];
}

export async function listGroupIdsByEmail(emailInput: string): Promise<string[]> {
  const memberships = await listMembershipsByEmail(emailInput);
  return Array.from(new Set(memberships.map((item) => item.group_id).filter(Boolean)));
}

export async function listRoles(): Promise<RoleDefinitionRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("role_definitions")
    .select("*, group:groups(id, name, code)")
    .order("sort_order", { ascending: true });

  return (data ?? []) as RoleDefinitionRow[];
}

export async function listRoleAssignments(): Promise<RoleAssignmentRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("role_assignments")
    .select(
      "*, group:groups(id, name, code), role:role_definitions(id, name), person:people(id, full_name, display_name)",
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as RoleAssignmentRow[];
}

export async function listGroupCoachOwners(): Promise<GroupCoachOwnerRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("group_coach_owners")
    .select(
      "group_id, coach_account_id, created_at, updated_at, coach:auth_accounts(id, email, display_name, coach_status, is_active)",
    );

  return (data ?? []).map((row) => {
    const coachValue = (row as { coach?: unknown }).coach;
    const coach = Array.isArray(coachValue)
      ? (coachValue[0] ?? null)
      : (coachValue ?? null);

    return {
      group_id: String((row as { group_id: unknown }).group_id),
      coach_account_id: String((row as { coach_account_id: unknown }).coach_account_id),
      created_at: String((row as { created_at: unknown }).created_at),
      updated_at: String((row as { updated_at: unknown }).updated_at),
      coach: coach as GroupCoachOwnerRow["coach"],
    };
  });
}

export async function listTrackingSections(): Promise<TrackingSectionRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("tracking_sections")
    .select("*, group:groups(id, name, code)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as TrackingSectionRow[];
}

export async function listTrackingSubsections(): Promise<TrackingSubsectionRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("tracking_subsections")
    .select(
      "*, group:groups(id, name, code), section:tracking_sections(id, title, sort_order)",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as TrackingSubsectionRow[];
}

export async function listTrackingItems(): Promise<TrackingItemRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data, error } = await db.client
    .from("tracking_items")
    .select(
      [
        "*",
        "group:groups(id, name, code)",
        "section:tracking_sections!tracking_items_section_id_fkey(id, title, sort_order)",
        "subsection:tracking_subsections!tracking_items_subsection_id_fkey(id, title, sort_order)",
        "owner:people!tracking_items_owner_person_id_fkey(id, person_no, full_name, display_name, email)",
        "completed_by:people!tracking_items_completed_by_person_id_fkey(id, person_no, full_name, display_name, email)",
      ].join(", "),
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listTrackingItems query failed:", error.message);
    return [];
  }

  return (((data ?? []) as unknown[]) ?? []).map((rawRow) => {
    const row = rawRow as Record<string, unknown>;
    return {
      ...(row as unknown as TrackingItemRow),
      response_type: normalizeTrackingItemResponseType(row.response_type),
      response_options: normalizeTrackingItemResponseOptions(row.response_options),
    };
  });
}

export async function listTrackingItemMemberCompletions(): Promise<
  TrackingItemMemberCompletionRow[]
> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("tracking_item_member_completions")
    .select("*")
    .order("updated_at", { ascending: false });

  return (((data ?? []) as unknown[]) ?? []).map((rawRow) => {
    const row = rawRow as Record<string, unknown>;
    return {
      ...(row as unknown as TrackingItemMemberCompletionRow),
      number_value: normalizeTrackingItemMemberNumberValue(row.number_value),
      date_value: typeof row.date_value === "string" ? row.date_value : null,
      select_value: typeof row.select_value === "string" ? row.select_value : null,
    };
  });
}

export async function listGroupTrackingProgress(): Promise<GroupTrackingProgressRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("v_group_tracking_progress")
    .select("*")
    .order("group_id", { ascending: true });

  return ((data ?? []) as GroupTrackingProgressRow[]).map((row) => ({
    group_id: row.group_id,
    total_items: Number(row.total_items ?? 0),
    completed_items: Number(row.completed_items ?? 0),
    completion_percent: Number(row.completion_percent ?? 0),
  }));
}

export async function listTrackingSectionProgress(): Promise<TrackingSectionProgressRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("v_tracking_section_progress")
    .select("*")
    .order("group_id", { ascending: true })
    .order("section_id", { ascending: true });

  return ((data ?? []) as TrackingSectionProgressRow[]).map((row) => ({
    section_id: row.section_id,
    group_id: row.group_id,
    total_items: Number(row.total_items ?? 0),
    completed_items: Number(row.completed_items ?? 0),
    completion_percent: Number(row.completion_percent ?? 0),
  }));
}

export function getDataLayerStatus(): { ok: boolean; message: string } {
  const db = getClientOrError();
  if (!db.client) {
    return { ok: false, message: db.error };
  }

  return { ok: true, message: "Connected" };
}

export async function createClass(input: {
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("classes").insert({
    code: input.code,
    name: input.name,
    description: input.description,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateClass(input: {
  classId: string;
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("classes")
    .update({
      code: input.code,
      name: input.name,
      description: input.description,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
    })
    .eq("id", input.classId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteClass(classId: string): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("classes").delete().eq("id", classId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteClasses(classIds: string[]): Promise<MutationResult> {
  const uniqueIds = Array.from(new Set(classIds.map((item) => item.trim()).filter(Boolean)));

  if (!uniqueIds.length) {
    return { ok: false, message: "請至少選擇一筆班別。" };
  }

  for (const classId of uniqueIds) {
    const result = await deleteClass(classId);
    if (!result.ok) return result;
  }

  return { ok: true };
}

export async function createGroup(input: {
  classId: string;
  code: string;
  name: string;
  description: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("groups").insert({
    class_id: input.classId,
    code: input.code,
    name: input.name,
    description: input.description,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateGroup(input: {
  groupId: string;
  code: string;
  name: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("groups")
    .update({
      code: input.code,
      name: input.name,
    })
    .eq("id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("groups").delete().eq("id", groupId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateGroupDescription(input: {
  groupId: string;
  description: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("groups")
    .update({ description: input.description })
    .eq("id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function upsertGroupCoachOwner(input: {
  groupId: string;
  coachAccountId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: coach, error: coachError } = await db.client
    .from("auth_accounts")
    .select("id, role, coach_status, is_active")
    .eq("id", input.coachAccountId)
    .maybeSingle();

  if (coachError) return { ok: false, message: coachError.message };
  if (!coach || coach.role !== "coach" || coach.coach_status !== "approved" || !coach.is_active) {
    return { ok: false, message: "指派的小組教練帳號不存在或尚未通過審核。" };
  }

  const { error } = await db.client.from("group_coach_owners").upsert(
    {
      group_id: input.groupId,
      coach_account_id: input.coachAccountId,
    },
    { onConflict: "group_id" },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createPerson(input: {
  personNo: string;
  fullName: string;
  displayName: string;
  personType: "coach" | "member";
  email: string;
  phone: string;
  lineId: string;
  intro: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("people").insert({
    person_no: input.personNo || null,
    full_name: input.fullName,
    display_name: input.displayName,
    person_type: input.personType,
    email: input.email,
    phone: input.phone,
    line_id: input.lineId,
    intro: input.intro,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createMemberAccount(input: {
  email: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    return { ok: false, message: "請輸入有效的 Email。" };
  }

  const { data: existingPeople, error: existingPeopleError } = await db.client
    .from("people")
    .select("id")
    .eq("person_type", "member")
    .eq("email", email)
    .limit(1);

  if (existingPeopleError) return { ok: false, message: existingPeopleError.message };
  if (existingPeople?.length) {
    return { ok: false, message: "此 Email 已被使用。" };
  }

  const { data: existingAuth, error: existingAuthError } = await db.client
    .from("auth_accounts")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingAuthError) return { ok: false, message: existingAuthError.message };
  if (existingAuth && existingAuth.role !== "member") {
    return { ok: false, message: "此 Email 已被其他身份使用。" };
  }

  const { error: insertPeopleError } = await db.client.from("people").insert({
    person_no: null,
    full_name: email,
    display_name: "",
    person_type: "member",
    email,
    phone: "",
    line_id: "",
    intro: "",
  });
  if (insertPeopleError) return { ok: false, message: insertPeopleError.message };

  if (!existingAuth) {
    const { error: insertAuthError } = await db.client.from("auth_accounts").insert({
      email,
      display_name: email,
      role: "member",
      coach_status: "approved",
      is_active: true,
    });
    if (insertAuthError) return { ok: false, message: insertAuthError.message };
  }

  return { ok: true };
}

export async function updateMemberAccount(input: {
  personId: string;
  email: string;
  personNo: string;
  fullName: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, message: "請輸入有效的 Email。" };
  }
  if (!fullName) {
    return { ok: false, message: "請填寫學員姓名。" };
  }

  const { data: currentMember, error: currentMemberError } = await db.client
    .from("people")
    .select("id, email, full_name")
    .eq("id", input.personId)
    .eq("person_type", "member")
    .maybeSingle();

  if (currentMemberError) return { ok: false, message: currentMemberError.message };
  if (!currentMember) return { ok: false, message: "找不到學員資料。" };

  const { data: duplicateMember, error: duplicateMemberError } = await db.client
    .from("people")
    .select("id")
    .eq("person_type", "member")
    .eq("email", email)
    .neq("id", input.personId)
    .limit(1);

  if (duplicateMemberError) return { ok: false, message: duplicateMemberError.message };
  if (duplicateMember?.length) {
    return { ok: false, message: "此 Email 已被使用。" };
  }

  const { data: targetAuth, error: targetAuthError } = await db.client
    .from("auth_accounts")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (targetAuthError) return { ok: false, message: targetAuthError.message };
  if (targetAuth && targetAuth.role !== "member") {
    return { ok: false, message: "此 Email 已被其他身份使用。" };
  }

  const oldEmail = normalizeEmail(currentMember.email ?? "");

  const updatePayload: {
    person_no: string | null;
    email: string;
    full_name: string;
  } = {
    person_no: input.personNo.trim() || null,
    email,
    full_name: fullName,
  };

  const { error: updatePeopleError } = await db.client
    .from("people")
    .update(updatePayload)
    .eq("id", input.personId)
    .eq("person_type", "member");

  if (updatePeopleError) return { ok: false, message: updatePeopleError.message };

  const { data: oldAuth, error: oldAuthError } = await db.client
    .from("auth_accounts")
    .select("id")
    .eq("email", oldEmail)
    .eq("role", "member")
    .maybeSingle();

  if (oldAuthError) return { ok: false, message: oldAuthError.message };

  if (oldAuth && targetAuth && oldAuth.id !== targetAuth.id) {
    const { error: deleteOldAuthError } = await db.client
      .from("auth_accounts")
      .delete()
      .eq("id", oldAuth.id)
      .eq("role", "member");
    if (deleteOldAuthError) return { ok: false, message: deleteOldAuthError.message };
  } else if (oldAuth && oldEmail !== email) {
    const { error: updateAuthError } = await db.client
      .from("auth_accounts")
      .update({ email, display_name: email })
      .eq("id", oldAuth.id)
      .eq("role", "member");
    if (updateAuthError) return { ok: false, message: updateAuthError.message };
  } else if (!oldAuth && !targetAuth) {
    const { error: insertAuthError } = await db.client.from("auth_accounts").insert({
      email,
      display_name: email,
      role: "member",
      coach_status: "approved",
      is_active: true,
    });
    if (insertAuthError) return { ok: false, message: insertAuthError.message };
  }

  return { ok: true };
}

export async function updateGroupMemberDirectoryProfile(input: {
  groupId: string;
  personId: string;
  displayName: string;
  lineId: string;
  intro: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: membership, error: membershipError } = await db.client
    .from("group_memberships")
    .select("id, membership_type")
    .eq("group_id", input.groupId)
    .eq("person_id", input.personId)
    .maybeSingle();

  if (membershipError) return { ok: false, message: membershipError.message };
  if (!membership || membership.membership_type !== "member") {
    return { ok: false, message: "找不到該小組成員資料。" };
  }

  const { error } = await db.client
    .from("people")
    .update({
      display_name: input.displayName,
      line_id: input.lineId,
      intro: input.intro,
    })
    .eq("id", input.personId)
    .eq("person_type", "member");

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteMemberAccount(personId: string): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: member, error: memberError } = await db.client
    .from("people")
    .select("id, email")
    .eq("id", personId)
    .eq("person_type", "member")
    .maybeSingle();

  if (memberError) return { ok: false, message: memberError.message };
  if (!member) return { ok: false, message: "找不到學員資料。" };

  const normalizedEmail = normalizeEmail(member.email ?? "");
  let authAccountId: string | null = null;
  if (normalizedEmail) {
    const { data: authAccount, error: authLookupError } = await db.client
      .from("auth_accounts")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("role", "member")
      .maybeSingle();

    if (authLookupError) return { ok: false, message: authLookupError.message };
    authAccountId = authAccount?.id ?? null;
  }

  const { error: deleteRoleAssignmentsError } = await db.client
    .from("role_assignments")
    .delete()
    .eq("person_id", personId);
  if (deleteRoleAssignmentsError) {
    return { ok: false, message: deleteRoleAssignmentsError.message };
  }

  const { error: deleteMembershipsError } = await db.client
    .from("group_memberships")
    .delete()
    .eq("person_id", personId);
  if (deleteMembershipsError) return { ok: false, message: deleteMembershipsError.message };

  const { error: deletePeopleError } = await db.client
    .from("people")
    .delete()
    .eq("id", personId)
    .eq("person_type", "member");
  if (deletePeopleError) return { ok: false, message: deletePeopleError.message };

  if (authAccountId) {
    const { error: deleteOtpsError } = await db.client
      .from("member_login_otps")
      .delete()
      .eq("account_id", authAccountId);
    if (deleteOtpsError) return { ok: false, message: deleteOtpsError.message };

    const { error: deleteAuthError } = await db.client
      .from("auth_accounts")
      .delete()
      .eq("id", authAccountId)
      .eq("role", "member");
    if (deleteAuthError) return { ok: false, message: deleteAuthError.message };
  }

  return { ok: true };
}

export async function deleteMemberAccounts(personIds: string[]): Promise<MutationResult> {
  const uniqueIds = Array.from(
    new Set(personIds.map((item) => item.trim()).filter(Boolean)),
  );

  if (!uniqueIds.length) {
    return { ok: false, message: "請至少選擇一位學員。" };
  }

  for (const personId of uniqueIds) {
    const result = await deleteMemberAccount(personId);
    if (!result.ok) return result;
  }

  return { ok: true };
}

export async function createMembership(input: {
  groupId: string;
  personId: string;
  membershipType: "coach" | "member";
  isLeader: boolean;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: person, error: personError } = await db.client
    .from("people")
    .select("id, person_type")
    .eq("id", input.personId)
    .maybeSingle();

  if (personError) return { ok: false, message: personError.message };
  if (!person || person.person_type !== "member") {
    return { ok: false, message: "小組成員指派僅能選擇學員。" };
  }

  const { error } = await db.client.from("group_memberships").insert({
    group_id: input.groupId,
    person_id: input.personId,
    membership_type: "member",
    is_leader: false,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createRole(input: {
  groupId: string;
  name: string;
  description: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: maxSortRow, error: maxSortError } = await db.client
    .from("role_definitions")
    .select("sort_order")
    .eq("group_id", input.groupId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxSortError) return { ok: false, message: maxSortError.message };

  const nextSortOrder =
    typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;

  const { error } = await db.client.from("role_definitions").insert({
    group_id: input.groupId,
    name: input.name,
    description: input.description,
    sort_order: nextSortOrder,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateRoleDefinition(input: {
  groupId: string;
  roleId: string;
  name: string;
  description: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("role_definitions")
    .update({
      name: input.name,
      description: input.description,
    })
    .eq("id", input.roleId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createRoleAssignment(input: {
  groupId: string;
  roleId: string;
  personId: string;
  note: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("role_assignments").insert({
    group_id: input.groupId,
    role_id: input.roleId,
    person_id: input.personId,
    note: input.note,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateRoleAssignment(input: {
  assignmentId: string;
  groupId: string;
  roleId: string;
  personId: string;
  note: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("role_assignments")
    .update({
      role_id: input.roleId,
      person_id: input.personId,
      note: input.note,
    })
    .eq("id", input.assignmentId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteRoleAssignment(input: {
  assignmentId: string;
  groupId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("role_assignments")
    .delete()
    .eq("id", input.assignmentId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

type MoveDirection = "up" | "down";

function reorderIds(ids: string[], currentId: string, direction: MoveDirection): string[] | null {
  const currentIndex = ids.findIndex((id) => id === currentId);
  if (currentIndex < 0) return null;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= ids.length) return [];

  const next = ids.slice();
  const [current] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, current);
  return next;
}

async function getClassCourseItemScope(input: {
  client: AdminClient;
  itemId: string;
}): Promise<{ ok: true; classId: string } | { ok: false; message: string }> {
  const { data, error } = await input.client
    .from("class_course_items")
    .select("id, class_id")
    .eq("id", input.itemId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "找不到指定的課程項目。" };
  return { ok: true, classId: String((data as { class_id: unknown }).class_id) };
}

async function getClassCourseTopicScope(input: {
  client: AdminClient;
  topicId: string;
}): Promise<
  | { ok: true; itemId: string; classId: string }
  | { ok: false; message: string }
> {
  const { data: topicRow, error: topicError } = await input.client
    .from("class_course_topics")
    .select("id, class_course_item_id")
    .eq("id", input.topicId)
    .maybeSingle();

  if (topicError) return { ok: false, message: topicError.message };
  if (!topicRow) return { ok: false, message: "找不到指定的課程主題。" };

  const itemId = String((topicRow as { class_course_item_id: unknown }).class_course_item_id);
  const itemScope = await getClassCourseItemScope({
    client: input.client,
    itemId,
  });
  if (!itemScope.ok) return itemScope;
  return { ok: true, itemId, classId: itemScope.classId };
}

async function getClassCourseChapterScope(input: {
  client: AdminClient;
  chapterId: string;
}): Promise<
  | { ok: true; topicId: string; itemId: string; classId: string }
  | { ok: false; message: string }
> {
  const { data: chapterRow, error: chapterError } = await input.client
    .from("class_course_chapters")
    .select("id, class_course_topic_id")
    .eq("id", input.chapterId)
    .maybeSingle();

  if (chapterError) return { ok: false, message: chapterError.message };
  if (!chapterRow) return { ok: false, message: "找不到指定的章節。" };

  const topicId = String((chapterRow as { class_course_topic_id: unknown }).class_course_topic_id);
  const topicScope = await getClassCourseTopicScope({
    client: input.client,
    topicId,
  });
  if (!topicScope.ok) return topicScope;

  return {
    ok: true,
    topicId,
    itemId: topicScope.itemId,
    classId: topicScope.classId,
  };
}

async function resequenceClassCourseItems(input: {
  classId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("class_course_items")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("class_id", input.classId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

async function resequenceClassCourseTopics(input: {
  classCourseItemId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("class_course_topics")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("class_course_item_id", input.classCourseItemId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

async function resequenceClassCourseChapters(input: {
  classCourseTopicId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("class_course_chapters")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("class_course_topic_id", input.classCourseTopicId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function createClassCourseItem(input: {
  classId: string;
  courseDate: string;
  instructorName: string;
  bgColor: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("class_course_items")
      .select("sort_order")
      .eq("class_id", input.classId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("class_course_items").insert({
    class_id: input.classId,
    course_date: input.courseDate || null,
    instructor_name: input.instructorName,
    bg_color: normalizeHexColor(input.bgColor),
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateClassCourseItem(input: {
  classId: string;
  itemId: string;
  courseDate: string;
  instructorName: string;
  bgColor: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("class_course_items")
    .update({
      course_date: input.courseDate || null,
      instructor_name: input.instructorName,
      bg_color: normalizeHexColor(input.bgColor),
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.itemId)
    .eq("class_id", input.classId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteClassCourseItem(input: {
  classId: string;
  itemId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("class_course_items")
    .delete()
    .eq("id", input.itemId)
    .eq("class_id", input.classId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveClassCourseItem(input: {
  classId: string;
  itemId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("class_course_items")
    .select("id")
    .eq("class_id", input.classId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.itemId, input.direction);
  if (nextOrder === null) return { ok: false, message: "找不到指定的課程項目。" };
  if (!nextOrder.length) return { ok: true };

  return resequenceClassCourseItems({
    classId: input.classId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function createClassCourseTopic(input: {
  classId: string;
  classCourseItemId: string;
  title: string;
  bgColor: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const itemScope = await getClassCourseItemScope({
    client: db.client,
    itemId: input.classCourseItemId,
  });
  if (!itemScope.ok) return itemScope;
  if (itemScope.classId !== input.classId) {
    return { ok: false, message: "課程主題所屬課程項目與班別不一致。" };
  }

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("class_course_topics")
      .select("sort_order")
      .eq("class_course_item_id", input.classCourseItemId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("class_course_topics").insert({
    class_course_item_id: input.classCourseItemId,
    title: input.title,
    bg_color: normalizeHexColor(input.bgColor),
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateClassCourseTopic(input: {
  classId: string;
  topicId: string;
  classCourseItemId: string;
  title: string;
  bgColor: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const itemScope = await getClassCourseItemScope({
    client: db.client,
    itemId: input.classCourseItemId,
  });
  if (!itemScope.ok) return itemScope;
  if (itemScope.classId !== input.classId) {
    return { ok: false, message: "課程主題所屬課程項目與班別不一致。" };
  }

  const topicScope = await getClassCourseTopicScope({
    client: db.client,
    topicId: input.topicId,
  });
  if (!topicScope.ok) return topicScope;
  if (topicScope.classId !== input.classId) {
    return { ok: false, message: "找不到指定的課程主題。" };
  }

  const { error } = await db.client
    .from("class_course_topics")
    .update({
      class_course_item_id: input.classCourseItemId,
      title: input.title,
      bg_color: normalizeHexColor(input.bgColor),
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.topicId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteClassCourseTopic(input: {
  classId: string;
  topicId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const topicScope = await getClassCourseTopicScope({
    client: db.client,
    topicId: input.topicId,
  });
  if (!topicScope.ok) return topicScope;
  if (topicScope.classId !== input.classId) {
    return { ok: false, message: "找不到指定的課程主題。" };
  }

  const { error } = await db.client.from("class_course_topics").delete().eq("id", input.topicId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveClassCourseTopic(input: {
  classId: string;
  classCourseItemId: string;
  topicId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const itemScope = await getClassCourseItemScope({
    client: db.client,
    itemId: input.classCourseItemId,
  });
  if (!itemScope.ok) return itemScope;
  if (itemScope.classId !== input.classId) {
    return { ok: false, message: "課程主題所屬課程項目與班別不一致。" };
  }

  const { data: rows, error } = await db.client
    .from("class_course_topics")
    .select("id")
    .eq("class_course_item_id", input.classCourseItemId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.topicId, input.direction);
  if (nextOrder === null) return { ok: false, message: "找不到指定的課程主題。" };
  if (!nextOrder.length) return { ok: true };

  return resequenceClassCourseTopics({
    classCourseItemId: input.classCourseItemId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function createClassCourseChapter(input: {
  classId: string;
  classCourseTopicId: string;
  title: string;
  paperPage: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const topicScope = await getClassCourseTopicScope({
    client: db.client,
    topicId: input.classCourseTopicId,
  });
  if (!topicScope.ok) return topicScope;
  if (topicScope.classId !== input.classId) {
    return { ok: false, message: "章節所屬課程主題與班別不一致。" };
  }

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("class_course_chapters")
      .select("sort_order")
      .eq("class_course_topic_id", input.classCourseTopicId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("class_course_chapters").insert({
    class_course_topic_id: input.classCourseTopicId,
    title: input.title,
    paper_page: input.paperPage,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateClassCourseChapter(input: {
  classId: string;
  chapterId: string;
  classCourseTopicId: string;
  title: string;
  paperPage: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const topicScope = await getClassCourseTopicScope({
    client: db.client,
    topicId: input.classCourseTopicId,
  });
  if (!topicScope.ok) return topicScope;
  if (topicScope.classId !== input.classId) {
    return { ok: false, message: "章節所屬課程主題與班別不一致。" };
  }

  const chapterScope = await getClassCourseChapterScope({
    client: db.client,
    chapterId: input.chapterId,
  });
  if (!chapterScope.ok) return chapterScope;
  if (chapterScope.classId !== input.classId) {
    return { ok: false, message: "找不到指定的章節。" };
  }

  const { error } = await db.client
    .from("class_course_chapters")
    .update({
      class_course_topic_id: input.classCourseTopicId,
      title: input.title,
      paper_page: input.paperPage,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.chapterId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteClassCourseChapter(input: {
  classId: string;
  chapterId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const chapterScope = await getClassCourseChapterScope({
    client: db.client,
    chapterId: input.chapterId,
  });
  if (!chapterScope.ok) return chapterScope;
  if (chapterScope.classId !== input.classId) {
    return { ok: false, message: "找不到指定的章節。" };
  }

  const { error } = await db.client
    .from("class_course_chapters")
    .delete()
    .eq("id", input.chapterId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveClassCourseChapter(input: {
  classId: string;
  classCourseTopicId: string;
  chapterId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const topicScope = await getClassCourseTopicScope({
    client: db.client,
    topicId: input.classCourseTopicId,
  });
  if (!topicScope.ok) return topicScope;
  if (topicScope.classId !== input.classId) {
    return { ok: false, message: "章節所屬課程主題與班別不一致。" };
  }

  const { data: rows, error } = await db.client
    .from("class_course_chapters")
    .select("id")
    .eq("class_course_topic_id", input.classCourseTopicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.chapterId, input.direction);
  if (nextOrder === null) return { ok: false, message: "找不到指定的章節。" };
  if (!nextOrder.length) return { ok: true };

  return resequenceClassCourseChapters({
    classCourseTopicId: input.classCourseTopicId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

async function getGroupStudySessionScope(input: {
  client: AdminClient;
  sessionId: string;
}): Promise<{ ok: true; groupId: string } | { ok: false; message: string }> {
  const { data, error } = await input.client
    .from("group_study_sessions")
    .select("id, group_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Group study session was not found." };
  return { ok: true, groupId: String((data as { group_id: unknown }).group_id) };
}

async function getGroupStudyReadingItemScope(input: {
  client: AdminClient;
  readingItemId: string;
}): Promise<
  | { ok: true; groupId: string; sessionId: string }
  | { ok: false; message: string }
> {
  const { data, error } = await input.client
    .from("group_study_reading_items")
    .select("id, group_id, session_id")
    .eq("id", input.readingItemId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Group study reading item was not found." };
  return {
    ok: true,
    groupId: String((data as { group_id: unknown }).group_id),
    sessionId: String((data as { session_id: unknown }).session_id),
  };
}

async function resequenceGroupStudySessions(input: {
  groupId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("group_study_sessions")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("group_id", input.groupId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

async function resequenceGroupStudySessionDutyMembers(input: {
  groupId: string;
  sessionId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("group_study_session_duty_members")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("group_id", input.groupId)
      .eq("session_id", input.sessionId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

async function resequenceGroupStudyReadingItems(input: {
  groupId: string;
  sessionId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("group_study_reading_items")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("group_id", input.groupId)
      .eq("session_id", input.sessionId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function listGroupStudySessionsByGroupId(
  groupId: string,
): Promise<GroupStudySessionRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data, error } = await db.client
    .from("group_study_sessions")
    .select("*, group:groups(id, code, name)")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];

  return (((data ?? []) as unknown[]) ?? []).map((rawRow) => {
    const row = rawRow as Record<string, unknown>;
    return {
      ...(row as unknown as GroupStudySessionRow),
      mode: normalizeGroupStudySessionMode(row.mode),
    };
  });
}

export async function listGroupStudySessionDutyMembersByGroupId(
  groupId: string,
): Promise<GroupStudySessionDutyMemberRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data, error } = await db.client
    .from("group_study_session_duty_members")
    .select(
      [
        "*",
        "session:group_study_sessions!fk_group_study_session_duty_members_session_group(id, title, session_date, sort_order)",
        "person:people(id, person_no, full_name, display_name, email)",
      ].join(", "),
    )
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];

  return (((data ?? []) as unknown[]) ?? []).map(
    (row) => row as GroupStudySessionDutyMemberRow,
  );
}

export async function replaceGroupStudySessionDutyMembers(input: {
  groupId: string;
  sessionId: string;
  personIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const sessionScope = await getGroupStudySessionScope({
    client: db.client,
    sessionId: input.sessionId,
  });
  if (!sessionScope.ok) return sessionScope;
  if (sessionScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study session does not belong to this group." };
  }

  const uniquePersonIds = Array.from(
    new Set(input.personIds.map((item) => item.trim()).filter(Boolean)),
  );

  if (uniquePersonIds.length) {
    const { data: membershipRows, error: membershipError } = await db.client
      .from("group_memberships")
      .select("person_id")
      .eq("group_id", input.groupId)
      .eq("membership_type", "member")
      .in("person_id", uniquePersonIds);

    if (membershipError) return { ok: false, message: membershipError.message };
    const allowedIds = new Set(
      (membershipRows ?? []).map((row) => String((row as { person_id: unknown }).person_id)),
    );
    if (uniquePersonIds.some((personId) => !allowedIds.has(personId))) {
      return { ok: false, message: "Duty members must be selected from group members." };
    }
  }

  const { error: deleteError } = await db.client
    .from("group_study_session_duty_members")
    .delete()
    .eq("group_id", input.groupId)
    .eq("session_id", input.sessionId);

  if (deleteError) return { ok: false, message: deleteError.message };
  if (!uniquePersonIds.length) return { ok: true };

  const { error: insertError } = await db.client
    .from("group_study_session_duty_members")
    .insert(
      uniquePersonIds.map((personId, index) => ({
        group_id: input.groupId,
        session_id: input.sessionId,
        person_id: personId,
        note: "",
        sort_order: 100 + index * 10,
        created_by_account_id: input.accountId ?? null,
        updated_by_account_id: input.accountId ?? null,
      })),
    );

  if (insertError) return { ok: false, message: insertError.message };
  return { ok: true };
}

export async function listGroupStudyReadingItemsByGroupId(
  groupId: string,
): Promise<GroupStudyReadingItemRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data, error } = await db.client
    .from("group_study_reading_items")
    .select(
      [
        "*",
        "session:group_study_sessions!fk_group_study_reading_items_session_group(id, title, session_date, sort_order)",
        "chapter:class_course_chapters(id, title, paper_page, sort_order)",
      ].join(", "),
    )
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];

  return (((data ?? []) as unknown[]) ?? []).map((row) => row as GroupStudyReadingItemRow);
}

export async function listGroupStudyReadingAssignmentsByGroupId(
  groupId: string,
): Promise<GroupStudyReadingAssignmentRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data, error } = await db.client
    .from("group_study_reading_assignments")
    .select(
      [
        "*",
        "reading_item:group_study_reading_items!fk_group_study_reading_assignments_item_group(id, session_id, title, paper_page, sort_order)",
        "person:people(id, person_no, full_name, display_name, email)",
      ].join(", "),
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (((data ?? []) as unknown[]) ?? []).map(
    (row) => row as GroupStudyReadingAssignmentRow,
  );
}

export async function createGroupStudySession(input: {
  groupId: string;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  mode: GroupStudySessionMode;
  locationAddress: string;
  mapUrl: string;
  onlineMeetingUrl: string;
  note: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("group_study_sessions")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("group_study_sessions").insert({
    group_id: input.groupId,
    title: input.title,
    session_date: input.sessionDate || null,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    mode: normalizeGroupStudySessionMode(input.mode),
    location_address: input.locationAddress,
    map_url: input.mapUrl,
    online_meeting_url: input.onlineMeetingUrl,
    note: input.note,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateGroupStudySession(input: {
  groupId: string;
  sessionId: string;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  mode: GroupStudySessionMode;
  locationAddress: string;
  mapUrl: string;
  onlineMeetingUrl: string;
  note: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("group_study_sessions")
    .update({
      title: input.title,
      session_date: input.sessionDate || null,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      mode: normalizeGroupStudySessionMode(input.mode),
      location_address: input.locationAddress,
      map_url: input.mapUrl,
      online_meeting_url: input.onlineMeetingUrl,
      note: input.note,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.sessionId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteGroupStudySession(input: {
  groupId: string;
  sessionId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("group_study_sessions")
    .delete()
    .eq("id", input.sessionId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveGroupStudySession(input: {
  groupId: string;
  sessionId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("group_study_sessions")
    .select("id")
    .eq("group_id", input.groupId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.sessionId, input.direction);
  if (nextOrder === null) return { ok: false, message: "Group study session was not found." };
  if (!nextOrder.length) return { ok: true };

  return resequenceGroupStudySessions({
    groupId: input.groupId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function createGroupStudySessionDutyMember(input: {
  groupId: string;
  sessionId: string;
  personId: string;
  note: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const sessionScope = await getGroupStudySessionScope({
    client: db.client,
    sessionId: input.sessionId,
  });
  if (!sessionScope.ok) return sessionScope;
  if (sessionScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study session does not belong to this group." };
  }

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("group_study_session_duty_members")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .eq("session_id", input.sessionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("group_study_session_duty_members").insert({
    group_id: input.groupId,
    session_id: input.sessionId,
    person_id: input.personId,
    note: input.note,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateGroupStudySessionDutyMember(input: {
  groupId: string;
  sessionId: string;
  dutyMemberId: string;
  personId: string;
  note: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const sessionScope = await getGroupStudySessionScope({
    client: db.client,
    sessionId: input.sessionId,
  });
  if (!sessionScope.ok) return sessionScope;
  if (sessionScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study session does not belong to this group." };
  }

  const { error } = await db.client
    .from("group_study_session_duty_members")
    .update({
      person_id: input.personId,
      note: input.note,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.dutyMemberId)
    .eq("group_id", input.groupId)
    .eq("session_id", input.sessionId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteGroupStudySessionDutyMember(input: {
  groupId: string;
  dutyMemberId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("group_study_session_duty_members")
    .delete()
    .eq("id", input.dutyMemberId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveGroupStudySessionDutyMember(input: {
  groupId: string;
  sessionId: string;
  dutyMemberId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("group_study_session_duty_members")
    .select("id")
    .eq("group_id", input.groupId)
    .eq("session_id", input.sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.dutyMemberId, input.direction);
  if (nextOrder === null) return { ok: false, message: "Group study duty member was not found." };
  if (!nextOrder.length) return { ok: true };

  return resequenceGroupStudySessionDutyMembers({
    groupId: input.groupId,
    sessionId: input.sessionId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function createGroupStudyReadingItem(input: {
  groupId: string;
  sessionId: string;
  classCourseChapterId?: string | null;
  title: string;
  paperPage: string;
  note: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const sessionScope = await getGroupStudySessionScope({
    client: db.client,
    sessionId: input.sessionId,
  });
  if (!sessionScope.ok) return sessionScope;
  if (sessionScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study session does not belong to this group." };
  }

  let chapterTitle = input.title;
  let chapterPaperPage = input.paperPage;
  const chapterId = input.classCourseChapterId?.trim() || null;
  if (chapterId) {
    const { data: chapterRow, error: chapterError } = await db.client
      .from("class_course_chapters")
      .select("title, paper_page")
      .eq("id", chapterId)
      .maybeSingle();

    if (chapterError) return { ok: false, message: chapterError.message };
    if (!chapterRow) return { ok: false, message: "Class course chapter was not found." };

    chapterTitle =
      input.title.trim() || String((chapterRow as { title: unknown }).title ?? "");
    chapterPaperPage =
      input.paperPage.trim() ||
      String((chapterRow as { paper_page: unknown }).paper_page ?? "");
  }

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("group_study_reading_items")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .eq("session_id", input.sessionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("group_study_reading_items").insert({
    group_id: input.groupId,
    session_id: input.sessionId,
    class_course_chapter_id: chapterId,
    title: chapterTitle,
    paper_page: chapterPaperPage,
    note: input.note,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateGroupStudyReadingItem(input: {
  groupId: string;
  sessionId: string;
  readingItemId: string;
  classCourseChapterId?: string | null;
  title: string;
  paperPage: string;
  note: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const sessionScope = await getGroupStudySessionScope({
    client: db.client,
    sessionId: input.sessionId,
  });
  if (!sessionScope.ok) return sessionScope;
  if (sessionScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study session does not belong to this group." };
  }

  const readingItemScope = await getGroupStudyReadingItemScope({
    client: db.client,
    readingItemId: input.readingItemId,
  });
  if (!readingItemScope.ok) return readingItemScope;
  if (readingItemScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study reading item does not belong to this group." };
  }

  let chapterTitle = input.title;
  let chapterPaperPage = input.paperPage;
  const chapterId = input.classCourseChapterId?.trim() || null;
  if (chapterId) {
    const { data: chapterRow, error: chapterError } = await db.client
      .from("class_course_chapters")
      .select("title, paper_page")
      .eq("id", chapterId)
      .maybeSingle();

    if (chapterError) return { ok: false, message: chapterError.message };
    if (!chapterRow) return { ok: false, message: "Class course chapter was not found." };

    chapterTitle =
      input.title.trim() || String((chapterRow as { title: unknown }).title ?? "");
    chapterPaperPage =
      input.paperPage.trim() ||
      String((chapterRow as { paper_page: unknown }).paper_page ?? "");
  }

  const { error } = await db.client
    .from("group_study_reading_items")
    .update({
      session_id: input.sessionId,
      class_course_chapter_id: chapterId,
      title: chapterTitle,
      paper_page: chapterPaperPage,
      note: input.note,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.readingItemId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteGroupStudyReadingItem(input: {
  groupId: string;
  readingItemId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("group_study_reading_items")
    .delete()
    .eq("id", input.readingItemId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveGroupStudyReadingItem(input: {
  groupId: string;
  sessionId: string;
  readingItemId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("group_study_reading_items")
    .select("id")
    .eq("group_id", input.groupId)
    .eq("session_id", input.sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.readingItemId, input.direction);
  if (nextOrder === null) return { ok: false, message: "Group study reading item was not found." };
  if (!nextOrder.length) return { ok: true };

  return resequenceGroupStudyReadingItems({
    groupId: input.groupId,
    sessionId: input.sessionId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function setGroupStudyReadingAssignment(input: {
  groupId: string;
  readingItemId: string;
  personId: string;
  note: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const readingItemScope = await getGroupStudyReadingItemScope({
    client: db.client,
    readingItemId: input.readingItemId,
  });
  if (!readingItemScope.ok) return readingItemScope;
  if (readingItemScope.groupId !== input.groupId) {
    return { ok: false, message: "The group study reading item does not belong to this group." };
  }

  const personId = input.personId.trim();
  if (!personId) {
    const { error } = await db.client
      .from("group_study_reading_assignments")
      .delete()
      .eq("group_id", input.groupId)
      .eq("reading_item_id", input.readingItemId);

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await db.client.from("group_study_reading_assignments").upsert(
    {
      group_id: input.groupId,
      reading_item_id: input.readingItemId,
      person_id: personId,
      note: input.note,
      created_by_account_id: input.accountId ?? null,
      updated_by_account_id: input.accountId ?? null,
    },
    { onConflict: "reading_item_id" },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteGroupStudyReadingAssignment(input: {
  groupId: string;
  assignmentId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("group_study_reading_assignments")
    .delete()
    .eq("id", input.assignmentId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function resequenceTrackingSections(input: {
  groupId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("tracking_sections")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("group_id", input.groupId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

async function resequenceTrackingSubsections(input: {
  groupId: string;
  sectionId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("tracking_subsections")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("group_id", input.groupId)
      .eq("section_id", input.sectionId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

async function resequenceTrackingItems(input: {
  groupId: string;
  sectionId: string;
  subsectionId: string;
  orderedIds: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await db.client
      .from("tracking_items")
      .update({
        sort_order: 100 + index * 10,
        updated_by_account_id: input.accountId ?? null,
      })
      .eq("id", id)
      .eq("group_id", input.groupId)
      .eq("section_id", input.sectionId)
      .eq("subsection_id", input.subsectionId);

    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function createTrackingSection(input: {
  groupId: string;
  title: string;
  description: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("tracking_sections")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("tracking_sections").insert({
    group_id: input.groupId,
    title: input.title,
    description: input.description,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateTrackingSection(input: {
  groupId: string;
  sectionId: string;
  title: string;
  description: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("tracking_sections")
    .update({
      title: input.title,
      description: input.description,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.sectionId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteTrackingSection(input: {
  groupId: string;
  sectionId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("tracking_sections")
    .delete()
    .eq("id", input.sectionId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveTrackingSection(input: {
  groupId: string;
  sectionId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("tracking_sections")
    .select("id")
    .eq("group_id", input.groupId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.sectionId, input.direction);
  if (nextOrder === null) return { ok: false, message: "找不到追蹤大項。" };
  if (!nextOrder.length) return { ok: true };

  return resequenceTrackingSections({
    groupId: input.groupId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function createTrackingSubsection(input: {
  groupId: string;
  sectionId: string;
  title: string;
  description: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("tracking_subsections")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .eq("section_id", input.sectionId)
      .eq("is_system_default", false)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("tracking_subsections").insert({
    group_id: input.groupId,
    section_id: input.sectionId,
    title: input.title,
    description: input.description,
    is_system_default: false,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateTrackingSubsection(input: {
  groupId: string;
  sectionId: string;
  subsectionId: string;
  title: string;
  description: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("tracking_subsections")
    .update({
      section_id: input.sectionId,
      title: input.title,
      description: input.description,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.subsectionId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteTrackingSubsection(input: {
  groupId: string;
  subsectionId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("tracking_subsections")
    .delete()
    .eq("id", input.subsectionId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveTrackingSubsection(input: {
  groupId: string;
  sectionId: string;
  subsectionId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("tracking_subsections")
    .select("id")
    .eq("group_id", input.groupId)
    .eq("section_id", input.sectionId)
    .eq("is_system_default", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.subsectionId, input.direction);
  if (nextOrder === null) return { ok: false, message: "找不到追蹤小項。" };
  if (!nextOrder.length) return { ok: true };

  return resequenceTrackingSubsections({
    groupId: input.groupId,
    sectionId: input.sectionId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function createTrackingItem(input: {
  groupId: string;
  sectionId: string;
  subsectionId?: string | null;
  title: string;
  content: string;
  extraData: string;
  externalUrl: string;
  dueDate: string;
  responseType: TrackingItemResponseType;
  responseOptions: string[];
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const responseType = normalizeTrackingItemResponseType(input.responseType);
  const responseOptions =
    responseType === "select"
      ? normalizeTrackingItemResponseOptions(input.responseOptions)
      : [];

  if (responseType === "select" && !responseOptions.length) {
    return { ok: false, message: "下拉式選單回報至少需要一個選項。" };
  }

  const resolvedSubsection = await resolveTrackingItemSubsectionId({
    client: db.client,
    groupId: input.groupId,
    sectionId: input.sectionId,
    subsectionId: input.subsectionId ?? null,
    accountId: input.accountId ?? null,
  });
  if (!resolvedSubsection.ok) return resolvedSubsection;
  const subsectionId = resolvedSubsection.subsectionId;

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("tracking_items")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .eq("section_id", input.sectionId)
      .eq("subsection_id", subsectionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxSortError) return { ok: false, message: maxSortError.message };
    sortOrder =
      typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;
  }

  const { error } = await db.client.from("tracking_items").insert({
    group_id: input.groupId,
    section_id: input.sectionId,
    subsection_id: subsectionId,
    title: input.title,
    content: input.content,
    extra_data: input.extraData,
    external_url: input.externalUrl,
    response_type: responseType,
    response_options: responseOptions,
    due_date: input.dueDate || null,
    owner_person_id: null,
    progress_percent: 0,
    is_completed: false,
    sort_order: sortOrder,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateTrackingItem(input: {
  groupId: string;
  itemId: string;
  sectionId: string;
  subsectionId?: string | null;
  title: string;
  content: string;
  extraData: string;
  externalUrl: string;
  dueDate: string;
  responseType: TrackingItemResponseType;
  responseOptions: string[];
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const responseType = normalizeTrackingItemResponseType(input.responseType);
  const responseOptions =
    responseType === "select"
      ? normalizeTrackingItemResponseOptions(input.responseOptions)
      : [];

  if (responseType === "select" && !responseOptions.length) {
    return { ok: false, message: "下拉式選單回報至少需要一個選項。" };
  }

  const { data: existingItem, error: existingItemError } = await db.client
    .from("tracking_items")
    .select("response_type, response_options")
    .eq("id", input.itemId)
    .eq("group_id", input.groupId)
    .maybeSingle();

  if (existingItemError) return { ok: false, message: existingItemError.message };
  if (!existingItem) return { ok: false, message: "找不到追蹤項目。" };

  const resolvedSubsection = await resolveTrackingItemSubsectionId({
    client: db.client,
    groupId: input.groupId,
    sectionId: input.sectionId,
    subsectionId: input.subsectionId ?? null,
    accountId: input.accountId ?? null,
  });
  if (!resolvedSubsection.ok) return resolvedSubsection;

  const { error } = await db.client
    .from("tracking_items")
    .update({
      section_id: input.sectionId,
      subsection_id: resolvedSubsection.subsectionId,
      title: input.title,
      content: input.content,
      extra_data: input.extraData,
      external_url: input.externalUrl,
      response_type: responseType,
      response_options: responseOptions,
      due_date: input.dueDate || null,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.itemId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };

  const previousResponseType = normalizeTrackingItemResponseType(existingItem.response_type);
  const previousResponseOptions = normalizeTrackingItemResponseOptions(
    existingItem.response_options,
  );
  const shouldResetCompletions =
    previousResponseType !== responseType ||
    (responseType === "select" &&
      JSON.stringify(previousResponseOptions) !== JSON.stringify(responseOptions));

  if (shouldResetCompletions) {
    const { error: resetError } = await db.client
      .from("tracking_item_member_completions")
      .delete()
      .eq("group_id", input.groupId)
      .eq("item_id", input.itemId);

    if (resetError) return { ok: false, message: resetError.message };
  }

  return { ok: true };
}

export async function deleteTrackingItem(input: {
  groupId: string;
  itemId: string;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("tracking_items")
    .delete()
    .eq("id", input.itemId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveTrackingItem(input: {
  groupId: string;
  itemId: string;
  targetSectionId: string;
  targetSubsectionId: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: currentItem, error: currentError } = await db.client
    .from("tracking_items")
    .select("id, section_id, subsection_id")
    .eq("id", input.itemId)
    .eq("group_id", input.groupId)
    .maybeSingle();

  if (currentError) return { ok: false, message: currentError.message };
  if (!currentItem) return { ok: false, message: "找不到追蹤項目。" };

  const { data: maxSortRow, error: maxSortError } = await db.client
    .from("tracking_items")
    .select("sort_order")
    .eq("group_id", input.groupId)
    .eq("section_id", input.targetSectionId)
    .eq("subsection_id", input.targetSubsectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxSortError) return { ok: false, message: maxSortError.message };
  const nextSortOrder =
    typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;

  const { error } = await db.client
    .from("tracking_items")
    .update({
      section_id: input.targetSectionId,
      subsection_id: input.targetSubsectionId,
      sort_order: nextSortOrder,
      moved_from_section_id: currentItem.section_id,
      moved_from_subsection_id: currentItem.subsection_id,
      moved_at: new Date().toISOString(),
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.itemId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function moveTrackingItemOrder(input: {
  groupId: string;
  sectionId: string;
  subsectionId: string;
  itemId: string;
  direction: MoveDirection;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: rows, error } = await db.client
    .from("tracking_items")
    .select("id")
    .eq("group_id", input.groupId)
    .eq("section_id", input.sectionId)
    .eq("subsection_id", input.subsectionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };

  const orderedIds = (rows ?? []).map((row) => String((row as { id: unknown }).id));
  const nextOrder = reorderIds(orderedIds, input.itemId, input.direction);
  if (nextOrder === null) return { ok: false, message: "找不到追蹤項目。" };
  if (!nextOrder.length) return { ok: true };

  return resequenceTrackingItems({
    groupId: input.groupId,
    sectionId: input.sectionId,
    subsectionId: input.subsectionId,
    orderedIds: nextOrder,
    accountId: input.accountId ?? null,
  });
}

export async function copyTrackingItem(input: {
  groupId: string;
  itemId: string;
  targetSectionId: string;
  targetSubsectionId: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  type SourceItem = {
    id: string;
    title: string;
    content: string;
    extra_data: string;
    external_url: string;
    response_type: TrackingItemResponseType;
    response_options: unknown;
    due_date: string | null;
  };

  const { data: sourceItem, error: sourceError } = await db.client
    .from("tracking_items")
    .select(
      [
        "id",
        "title",
        "content",
        "extra_data",
        "external_url",
        "response_type",
        "response_options",
        "due_date",
      ].join(", "),
    )
    .eq("id", input.itemId)
    .eq("group_id", input.groupId)
    .maybeSingle();

  if (sourceError) return { ok: false, message: sourceError.message };

  const source = (sourceItem as unknown as SourceItem | null) ?? null;
  if (!source) return { ok: false, message: "找不到要複製的追蹤項目。" };

  const { data: maxSortRow, error: maxSortError } = await db.client
    .from("tracking_items")
    .select("sort_order")
    .eq("group_id", input.groupId)
    .eq("section_id", input.targetSectionId)
    .eq("subsection_id", input.targetSubsectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxSortError) return { ok: false, message: maxSortError.message };
  const nextSortOrder =
    typeof maxSortRow?.sort_order === "number" ? maxSortRow.sort_order + 10 : 100;

  const { error } = await db.client.from("tracking_items").insert({
    group_id: input.groupId,
    section_id: input.targetSectionId,
    subsection_id: input.targetSubsectionId,
    title: `${source.title}（複製）`,
    content: source.content,
    extra_data: source.extra_data,
    external_url: source.external_url,
    response_type: normalizeTrackingItemResponseType(source.response_type),
    response_options: normalizeTrackingItemResponseOptions(source.response_options),
    due_date: source.due_date,
    owner_person_id: null,
    progress_percent: 0,
    is_completed: false,
    completed_at: null,
    completed_by_person_id: null,
    sort_order: nextSortOrder,
    copied_from_item_id: source.id,
    created_by_account_id: input.accountId ?? null,
    updated_by_account_id: input.accountId ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setTrackingItemMemberResponse(input: {
  groupId: string;
  itemId: string;
  personId: string;
  isCompleted: boolean;
  numberValue: string;
  dateValue: string;
  selectValue: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: itemRow, error: itemError } = await db.client
    .from("tracking_items")
    .select("response_type")
    .eq("id", input.itemId)
    .eq("group_id", input.groupId)
    .maybeSingle();

  if (itemError) return { ok: false, message: itemError.message };
  if (!itemRow) return { ok: false, message: "找不到追蹤項目。" };

  const responseType = normalizeTrackingItemResponseType(
    (itemRow as { response_type?: unknown }).response_type,
  );
  const numberText = input.numberValue.trim();
  const dateText = input.dateValue.trim();
  const selectText = input.selectValue.trim();

  let shouldDelete = false;
  const payload = {
    group_id: input.groupId,
    item_id: input.itemId,
    person_id: input.personId,
    is_completed: false,
    number_value: null as number | null,
    date_value: null as string | null,
    select_value: null as string | null,
    completed_at: null as string | null,
    completed_by_account_id: input.accountId ?? null,
  };

  if (responseType === "checkbox") {
    shouldDelete = !input.isCompleted;
    if (!shouldDelete) {
      payload.is_completed = true;
      payload.completed_at = new Date().toISOString();
    }
  } else if (responseType === "number") {
    if (!numberText) {
      shouldDelete = true;
    } else {
      if (!/^\d+(\.\d{1,2})?$/.test(numberText)) {
        return { ok: false, message: "請輸入有效數字（最多 2 位小數）。" };
      }
      const numberValue = Number(numberText);
      if (!Number.isFinite(numberValue)) {
        return { ok: false, message: "請輸入有效數字（最多 2 位小數）。" };
      }
      payload.number_value = numberValue;
    }
  } else if (responseType === "date") {
    if (!dateText) {
      shouldDelete = true;
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        return { ok: false, message: "請輸入有效日期。" };
      }
      payload.date_value = dateText;
    }
  } else {
    if (!selectText) {
      shouldDelete = true;
    } else {
      payload.select_value = selectText;
    }
  }

  if (shouldDelete) {
    const { error } = await db.client
      .from("tracking_item_member_completions")
      .delete()
      .eq("group_id", input.groupId)
      .eq("item_id", input.itemId)
      .eq("person_id", input.personId);

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await db.client
    .from("tracking_item_member_completions")
    .upsert(payload, { onConflict: "item_id,person_id" });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

