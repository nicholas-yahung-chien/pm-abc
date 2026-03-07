"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClass,
  createGroup,
  createMemberAccount,
  createMembership,
  createPerson,
  deleteClass,
  deleteClasses,
  deleteMemberAccount,
  deleteMemberAccounts,
  createRole,
  createRoleAssignment,
  deleteRoleAssignment,
  updateRoleDefinition,
  updateRoleAssignment,
  updateGroupDescription,
  updateGroupMemberDirectoryProfile,
  upsertGroupCoachOwner,
  listGroupIdsByEmail,
  updateClass,
  updateMemberAccount,
} from "@/lib/repository";
import { getCurrentSession } from "@/lib/auth/session";
import type { AppSession } from "@/lib/auth/types";

function redirectWithMessage(path: string, ok: boolean, message: string): never {
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

async function requireSignedIn(redirectPath: string): Promise<AppSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirectWithMessage(redirectPath, false, "請先登入後再繼續使用。");
  }
  return session;
}

async function requireCoachOrAdmin(redirectPath: string) {
  const session = await requireSignedIn(redirectPath);
  if (session.role === "member") {
    redirectWithMessage(redirectPath, false, "學員身份無法執行此操作。");
  }
  return session;
}

async function requireGroupAccess(groupId: string, redirectPath: string) {
  const session = await requireSignedIn(redirectPath);
  if (session.role !== "member") return session;

  const groupIds = await listGroupIdsByEmail(session.email);
  if (!groupIds.includes(groupId)) {
    redirectWithMessage(redirectPath, false, "學員僅可管理已被指派的小組。");
  }
  return session;
}

export async function createClassAction(formData: FormData) {
  await requireCoachOrAdmin("/classes");

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

export async function updateClassAction(formData: FormData) {
  await requireCoachOrAdmin("/classes");

  const classId = readText(formData, "classId");
  const code = readText(formData, "code");
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const startDate = readText(formData, "startDate");
  const endDate = readText(formData, "endDate");

  if (!classId || !code || !name) {
    redirectWithMessage("/classes", false, "請填寫班別代碼與班別名稱。");
  }

  const result = await updateClass({
    classId,
    code,
    name,
    description,
    startDate,
    endDate,
  });

  revalidatePath("/classes");
  revalidatePath("/groups");
  if (!result.ok) redirectWithMessage("/classes", false, result.message);
  redirectWithMessage("/classes", true, "班別資料已更新。");
}

export async function deleteClassAction(formData: FormData) {
  await requireCoachOrAdmin("/classes");

  const classId = readText(formData, "classId");
  if (!classId) {
    redirectWithMessage("/classes", false, "缺少班別識別資料。");
  }

  const result = await deleteClass(classId);
  revalidatePath("/classes");
  revalidatePath("/groups");
  if (!result.ok) redirectWithMessage("/classes", false, result.message);
  redirectWithMessage("/classes", true, "班別已刪除。");
}

export async function batchDeleteClassesAction(formData: FormData) {
  await requireCoachOrAdmin("/classes");

  const classIds = readText(formData, "classIds")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!classIds.length) {
    redirectWithMessage("/classes", false, "請先勾選要刪除的班別。");
  }

  const result = await deleteClasses(classIds);
  revalidatePath("/classes");
  revalidatePath("/groups");
  if (!result.ok) redirectWithMessage("/classes", false, result.message);
  redirectWithMessage("/classes", true, `已批次刪除 ${classIds.length} 個班別。`);
}

export async function createGroupAction(formData: FormData) {
  await requireCoachOrAdmin("/groups");

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

export async function updateGroupDescriptionAction(formData: FormData) {
  await requireCoachOrAdmin("/groups");

  const groupId = readText(formData, "groupId");
  const description = readText(formData, "description");
  if (!groupId) {
    redirectWithMessage("/groups", false, "缺少小組識別資料。");
  }

  const result = await updateGroupDescription({
    groupId,
    description,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組說明已更新。");
}

export async function createPersonAction(formData: FormData) {
  await requireCoachOrAdmin("/people");

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
  await requireCoachOrAdmin("/people");

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
  await requireCoachOrAdmin("/people");

  const personId = readText(formData, "personId");
  const email = readText(formData, "email");
  const personNo = readText(formData, "personNo");
  const fullName = readText(formData, "fullName");

  if (!personId || !email || !fullName) {
    redirectWithMessage("/people", false, "請填寫學員姓名與 Email。");
  }

  const result = await updateMemberAccount({
    personId,
    email,
    personNo,
    fullName,
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
  await requireCoachOrAdmin("/people");

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

export async function batchDeleteMemberAccountsAction(formData: FormData) {
  await requireCoachOrAdmin("/people");

  const personIds = readText(formData, "personIds")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!personIds.length) {
    redirectWithMessage("/people", false, "請先勾選要刪除的學員。");
  }

  const result = await deleteMemberAccounts(personIds);
  revalidatePath("/people");
  revalidatePath("/groups");
  revalidatePath("/groups/[groupId]", "page");
  revalidatePath("/groups/[groupId]/roles", "page");
  revalidatePath("/groups/[groupId]/directory", "page");
  if (!result.ok) redirectWithMessage("/people", false, result.message);
  redirectWithMessage("/people", true, `已批次刪除 ${personIds.length} 位學員。`);
}

export async function createMembershipAction(formData: FormData) {
  await requireCoachOrAdmin("/groups");

  const groupId = readText(formData, "groupId");
  const personId = readText(formData, "personId");
  if (!groupId || !personId) {
    redirectWithMessage("/groups", false, "請填寫小組與學員。");
  }

  const result = await createMembership({
    groupId,
    personId,
    membershipType: "member",
    isLeader: false,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/directory`);
  revalidatePath(`/groups/${groupId}/roles`);
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組成員指派成功。");
}

export async function assignGroupCoachOwnerAction(formData: FormData) {
  await requireCoachOrAdmin("/groups");

  const groupId = readText(formData, "groupId");
  const coachAccountId = readText(formData, "coachAccountId");
  if (!groupId || !coachAccountId) {
    redirectWithMessage("/groups", false, "請選擇小組與教練。");
  }

  const result = await upsertGroupCoachOwner({
    groupId,
    coachAccountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組教練已更新。");
}

export async function createRoleAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!groupId || !name) {
    redirectWithMessage(returnTo, false, "請填寫小組與角色名稱。");
  }

  await requireGroupAccess(groupId, returnTo);

  const result = await createRole({
    groupId,
    name,
    description,
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

  await requireGroupAccess(groupId, returnTo);

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

export async function updateRoleAssignmentAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const assignmentId = readText(formData, "assignmentId");
  const roleId = readText(formData, "roleId");
  const personId = readText(formData, "personId");
  const note = readText(formData, "note");

  if (!groupId || !assignmentId || !roleId || !personId) {
    redirectWithMessage(returnTo, false, "請填寫角色與學員。");
  }

  await requireGroupAccess(groupId, returnTo);

  const result = await updateRoleAssignment({
    assignmentId,
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
  redirectWithMessage(returnTo, true, "角色指派已更新。");
}

export async function deleteRoleAssignmentAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const assignmentId = readText(formData, "assignmentId");

  if (!groupId || !assignmentId) {
    redirectWithMessage(returnTo, false, "缺少角色指派識別資料。");
  }

  await requireGroupAccess(groupId, returnTo);

  const result = await deleteRoleAssignment({
    assignmentId,
    groupId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/roles`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "角色指派已刪除。");
}

export async function updateRoleDefinitionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const roleId = readText(formData, "roleId");
  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!groupId || !roleId || !name) {
    redirectWithMessage(returnTo, false, "請填寫角色名稱。");
  }

  await requireGroupAccess(groupId, returnTo);

  const result = await updateRoleDefinition({
    groupId,
    roleId,
    name,
    description,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/roles`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "角色已更新。");
}

export async function updateGroupMemberDirectoryProfileAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const personId = readText(formData, "personId");
  const displayName = readText(formData, "displayName");
  const phone = readText(formData, "phone");
  const lineId = readText(formData, "lineId");
  const intro = readText(formData, "intro");

  const redirectPath = groupId ? `/groups/${groupId}/directory` : "/groups";
  if (!groupId || !personId) {
    redirectWithMessage(redirectPath, false, "缺少小組或學員識別資料。");
  }

  await requireGroupAccess(groupId, redirectPath);

  const result = await updateGroupMemberDirectoryProfile({
    groupId,
    personId,
    displayName,
    phone,
    lineId,
    intro,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage(redirectPath, false, result.message);
  redirectWithMessage(redirectPath, true, "學員通訊錄資料已更新。");
}
