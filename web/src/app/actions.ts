"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClass,
  createGroup,
  createMemberAccount,
  createMembership,
  createPerson,
  deleteMemberAccount,
  createRole,
  createRoleAssignment,
  updateMemberAccount,
} from "@/lib/repository";

function redirectWithMessage(path: string, ok: boolean, message: string) {
  const status = ok ? "success" : "error";
  const encoded = encodeURIComponent(message);
  redirect(`${path}?status=${status}&message=${encoded}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readReturnTo(formData: FormData): string | null {
  const value = readText(formData, "returnTo");
  if (!value) return null;
  if (!value.startsWith("/groups/")) return null;
  return value;
}

export async function createClassAction(formData: FormData) {
  const code = readText(formData, "code");
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const startDate = readText(formData, "startDate");
  const endDate = readText(formData, "endDate");

  if (!code || !name) {
    redirectWithMessage("/classes", false, "班別代碼與班別名稱為必填欄位。");
  }

  const result = await createClass({
    code,
    name,
    description,
    startDate,
    endDate,
  });

  revalidatePath("/classes");
  revalidatePath("/groups");
  if (!result.ok) redirectWithMessage("/classes", false, result.message);
  redirectWithMessage("/classes", true, "班別新增成功。");
}

export async function createGroupAction(formData: FormData) {
  const classId = readText(formData, "classId");
  const code = readText(formData, "code");
  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!classId || !code || !name) {
    redirectWithMessage("/groups", false, "請填寫班別、小組代碼與小組名稱。");
  }

  const result = await createGroup({ classId, code, name, description });
  revalidatePath("/groups");

  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組新增成功。");
}

export async function createPersonAction(formData: FormData) {
  const personNo = readText(formData, "personNo");
  const fullName = readText(formData, "fullName");
  const displayName = readText(formData, "displayName");
  const personType = readText(formData, "personType") as "coach" | "member";
  const email = readText(formData, "email");
  const phone = readText(formData, "phone");
  const lineId = readText(formData, "lineId");
  const intro = readText(formData, "intro");

  if (!fullName || !personType) {
    redirectWithMessage("/people", false, "姓名與身份類型為必填欄位。");
  }

  const result = await createPerson({
    personNo,
    fullName,
    displayName,
    personType,
    email,
    phone,
    lineId,
    intro,
  });

  revalidatePath("/people");
  revalidatePath("/groups");
  if (!result.ok) redirectWithMessage("/people", false, result.message);
  redirectWithMessage("/people", true, "學員新增成功。");
}

export async function createMemberAccountAction(formData: FormData) {
  const email = readText(formData, "email");
  if (!email) {
    redirectWithMessage("/people", false, "請輸入學員 Email。");
  }

  const result = await createMemberAccount({ email });
  revalidatePath("/people");
  revalidatePath("/groups");
  revalidatePath("/groups/[groupId]", "page");
  revalidatePath("/groups/[groupId]/roles", "page");
  revalidatePath("/groups/[groupId]/directory", "page");
  if (!result.ok) redirectWithMessage("/people", false, result.message);
  redirectWithMessage("/people", true, "學員帳號新增成功。");
}

export async function updateMemberAccountAction(formData: FormData) {
  const personId = readText(formData, "personId");
  const email = readText(formData, "email");
  const personNo = readText(formData, "personNo");

  if (!personId || !email) {
    redirectWithMessage("/people", false, "請填寫學員 Email。");
  }

  const result = await updateMemberAccount({
    personId,
    email,
    personNo,
  });

  revalidatePath("/people");
  revalidatePath("/groups");
  revalidatePath("/groups/[groupId]", "page");
  revalidatePath("/groups/[groupId]/roles", "page");
  revalidatePath("/groups/[groupId]/directory", "page");
  if (!result.ok) redirectWithMessage("/people", false, result.message);
  redirectWithMessage("/people", true, "學員資料已更新。");
}

export async function deleteMemberAccountAction(formData: FormData) {
  const personId = readText(formData, "personId");
  if (!personId) {
    redirectWithMessage("/people", false, "缺少學員識別資料。");
  }

  const result = await deleteMemberAccount(personId);
  revalidatePath("/people");
  revalidatePath("/groups");
  revalidatePath("/groups/[groupId]", "page");
  revalidatePath("/groups/[groupId]/roles", "page");
  revalidatePath("/groups/[groupId]/directory", "page");
  if (!result.ok) redirectWithMessage("/people", false, result.message);
  redirectWithMessage("/people", true, "學員已刪除。");
}

export async function createMembershipAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const personId = readText(formData, "personId");
  const membershipType = readText(formData, "membershipType") as
    | "coach"
    | "member";
  const isLeader = formData.get("isLeader") === "on";

  if (!groupId || !personId || !membershipType) {
    redirectWithMessage("/groups", false, "請填寫小組、學員與成員類型。");
  }

  const result = await createMembership({
    groupId,
    personId,
    membershipType,
    isLeader,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/directory`);
  revalidatePath(`/groups/${groupId}/roles`);
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組成員指派成功。");
}

export async function createRoleAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const sortOrderRaw = readText(formData, "sortOrder");
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 100;

  if (!groupId || !name) {
    redirectWithMessage(returnTo, false, "請填寫小組與角色名稱。");
  }

  const result = await createRole({
    groupId,
    name,
    description,
    sortOrder: Number.isNaN(sortOrder) ? 100 : sortOrder,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/roles`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "角色新增成功。");
}

export async function createRoleAssignmentAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const roleId = readText(formData, "roleId");
  const personId = readText(formData, "personId");
  const note = readText(formData, "note");

  if (!groupId || !roleId || !personId) {
    redirectWithMessage(returnTo, false, "請填寫小組、角色與學員。");
  }

  const result = await createRoleAssignment({
    groupId,
    roleId,
    personId,
    note,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/roles`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "角色指派成功。");
}
