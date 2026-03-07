import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ClassRow,
  GroupRow,
  GroupCoachOwnerRow,
  GroupTrackingProgressRow,
  MembershipRow,
  PersonRow,
  RoleAssignmentRow,
  RoleDefinitionRow,
  TrackingItemRow,
  TrackingItemMemberCompletionRow,
  TrackingSectionProgressRow,
  TrackingSectionRow,
  TrackingSubsectionRow,
} from "@/lib/types";

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

export async function listClasses(): Promise<ClassRow[]> {
  const db = getClientOrError();
  if (!db.client) return [];

  const { data } = await db.client
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as ClassRow[];
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

  return ((data ?? []) as unknown) as TrackingItemRow[];
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

  return ((data ?? []) as unknown) as TrackingItemMemberCompletionRow[];
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
  phone: string;
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
      phone: input.phone,
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
  subsectionId: string;
  title: string;
  content: string;
  extraData: string;
  externalUrl: string;
  dueDate: string;
  sortOrder?: number | null;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  let sortOrder = input.sortOrder ?? null;
  if (sortOrder === null) {
    const { data: maxSortRow, error: maxSortError } = await db.client
      .from("tracking_items")
      .select("sort_order")
      .eq("group_id", input.groupId)
      .eq("section_id", input.sectionId)
      .eq("subsection_id", input.subsectionId)
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
    subsection_id: input.subsectionId,
    title: input.title,
    content: input.content,
    extra_data: input.extraData,
    external_url: input.externalUrl,
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
  subsectionId: string;
  title: string;
  content: string;
  extraData: string;
  externalUrl: string;
  dueDate: string;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("tracking_items")
    .update({
      section_id: input.sectionId,
      subsection_id: input.subsectionId,
      title: input.title,
      content: input.content,
      extra_data: input.extraData,
      external_url: input.externalUrl,
      due_date: input.dueDate || null,
      updated_by_account_id: input.accountId ?? null,
    })
    .eq("id", input.itemId)
    .eq("group_id", input.groupId);

  if (error) return { ok: false, message: error.message };
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

export async function setTrackingItemMemberCompletion(input: {
  groupId: string;
  itemId: string;
  personId: string;
  isCompleted: boolean;
  accountId?: string | null;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  if (input.isCompleted) {
    const { error } = await db.client.from("tracking_item_member_completions").upsert(
      {
        group_id: input.groupId,
        item_id: input.itemId,
        person_id: input.personId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by_account_id: input.accountId ?? null,
      },
      { onConflict: "item_id,person_id" },
    );

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await db.client
    .from("tracking_item_member_completions")
    .delete()
    .eq("group_id", input.groupId)
    .eq("item_id", input.itemId)
    .eq("person_id", input.personId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

