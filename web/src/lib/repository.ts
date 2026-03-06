import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ClassRow,
  GroupRow,
  MembershipRow,
  PersonRow,
  RoleAssignmentRow,
  RoleDefinitionRow,
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

export async function createMembership(input: {
  groupId: string;
  personId: string;
  membershipType: "coach" | "member";
  isLeader: boolean;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("group_memberships").insert({
    group_id: input.groupId,
    person_id: input.personId,
    membership_type: input.membershipType,
    is_leader: input.isLeader,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createRole(input: {
  groupId: string;
  name: string;
  description: string;
  sortOrder: number;
}): Promise<MutationResult> {
  const db = getClientOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client.from("role_definitions").insert({
    group_id: input.groupId,
    name: input.name,
    description: input.description,
    sort_order: input.sortOrder,
  });

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

