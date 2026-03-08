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
  deleteGroup,
  deleteMemberAccount,
  deleteMemberAccounts,
  createRole,
  createRoleAssignment,
  createTrackingItem,
  createTrackingSection,
  createTrackingSubsection,
  copyTrackingItem,
  deleteTrackingItem,
  deleteTrackingSection,
  deleteTrackingSubsection,
  deleteRoleAssignment,
  moveTrackingSection,
  moveTrackingSubsection,
  moveTrackingItem,
  moveTrackingItemOrder,
  setTrackingItemMemberCompletion,
  updateRoleDefinition,
  updateRoleAssignment,
  updateTrackingItem,
  updateTrackingSection,
  updateTrackingSubsection,
  updateGroup,
  updateGroupDescription,
  updateGroupMemberDirectoryProfile,
  upsertGroupCoachOwner,
  listGroupIdsByEmail,
  listMembershipsByEmail,
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

async function requireGroupStructureAccess(groupId: string, redirectPath: string) {
  const session = await requireGroupAccess(groupId, redirectPath);
  if (session.role === "member") {
    redirectWithMessage(redirectPath, false, "學員僅可回報追蹤項目完成狀態。");
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

export async function updateGroupAction(formData: FormData) {
  await requireCoachOrAdmin("/groups");

  const groupId = readText(formData, "groupId");
  const code = readText(formData, "code");
  const name = readText(formData, "name");

  if (!groupId || !code || !name) {
    redirectWithMessage("/groups", false, "請填寫小組代碼與小組名稱。");
  }

  const result = await updateGroup({
    groupId,
    code,
    name,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組資料已更新。");
}

export async function deleteGroupAction(formData: FormData) {
  await requireCoachOrAdmin("/groups");

  const groupId = readText(formData, "groupId");
  if (!groupId) {
    redirectWithMessage("/groups", false, "缺少小組識別資料。");
  }

  const result = await deleteGroup(groupId);
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組已刪除。");
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

export async function createTrackingSectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const title = readText(formData, "title");
  const description = readText(formData, "description");

  if (!groupId || !title) {
    redirectWithMessage(returnTo, false, "請填寫追蹤大項名稱。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await createTrackingSection({
    groupId,
    title,
    description,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤大項已新增。");
}

export async function updateTrackingSectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");
  const title = readText(formData, "title");
  const description = readText(formData, "description");

  if (!groupId || !sectionId || !title) {
    redirectWithMessage(returnTo, false, "請填寫追蹤大項資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await updateTrackingSection({
    groupId,
    sectionId,
    title,
    description,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤大項已更新。");
}

export async function deleteTrackingSectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");

  if (!groupId || !sectionId) {
    redirectWithMessage(returnTo, false, "缺少追蹤大項識別資料。");
  }

  await requireGroupStructureAccess(groupId, returnTo);

  const result = await deleteTrackingSection({ groupId, sectionId });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤大項已刪除。");
}

export async function moveTrackingSectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");
  const directionRaw = readText(formData, "direction");
  const direction = directionRaw === "up" || directionRaw === "down" ? directionRaw : null;

  if (!groupId || !sectionId || !direction) {
    redirectWithMessage(returnTo, false, "缺少追蹤大項排序資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);
  const result = await moveTrackingSection({
    groupId,
    sectionId,
    direction,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, direction === "up" ? "追蹤大項已上移。" : "追蹤大項已下移。");
}

export async function createTrackingSubsectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");
  const title = readText(formData, "title");
  const description = readText(formData, "description");

  if (!groupId || !sectionId || !title) {
    redirectWithMessage(returnTo, false, "請填寫追蹤小項資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await createTrackingSubsection({
    groupId,
    sectionId,
    title,
    description,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤小項已新增。");
}

export async function updateTrackingSubsectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const subsectionId = readText(formData, "subsectionId");
  const sectionId = readText(formData, "sectionId");
  const title = readText(formData, "title");
  const description = readText(formData, "description");

  if (!groupId || !subsectionId || !sectionId || !title) {
    redirectWithMessage(returnTo, false, "請填寫追蹤小項資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await updateTrackingSubsection({
    groupId,
    subsectionId,
    sectionId,
    title,
    description,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤小項已更新。");
}

export async function deleteTrackingSubsectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const subsectionId = readText(formData, "subsectionId");

  if (!groupId || !subsectionId) {
    redirectWithMessage(returnTo, false, "缺少追蹤小項識別資料。");
  }

  await requireGroupStructureAccess(groupId, returnTo);

  const result = await deleteTrackingSubsection({
    groupId,
    subsectionId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤小項已刪除。");
}

export async function moveTrackingSubsectionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");
  const subsectionId = readText(formData, "subsectionId");
  const directionRaw = readText(formData, "direction");
  const direction = directionRaw === "up" || directionRaw === "down" ? directionRaw : null;

  if (!groupId || !sectionId || !subsectionId || !direction) {
    redirectWithMessage(returnTo, false, "缺少追蹤小項排序資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);
  const result = await moveTrackingSubsection({
    groupId,
    sectionId,
    subsectionId,
    direction,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, direction === "up" ? "追蹤小項已上移。" : "追蹤小項已下移。");
}

export async function createTrackingItemAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");
  const subsectionId = readText(formData, "subsectionId");
  const title = readText(formData, "title");
  const content = readText(formData, "content");
  const extraData = readText(formData, "extraData");
  const externalUrl = readText(formData, "externalUrl");
  const dueDate = readText(formData, "dueDate");

  if (!groupId || !sectionId || !subsectionId || !title) {
    redirectWithMessage(returnTo, false, "請填寫追蹤項目資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await createTrackingItem({
    groupId,
    sectionId,
    subsectionId,
    title,
    content,
    extraData,
    externalUrl,
    dueDate,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤項目已新增。");
}

export async function updateTrackingItemAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const itemId = readText(formData, "itemId");
  const sectionId = readText(formData, "sectionId");
  const subsectionId = readText(formData, "subsectionId");
  const title = readText(formData, "title");
  const content = readText(formData, "content");
  const extraData = readText(formData, "extraData");
  const externalUrl = readText(formData, "externalUrl");
  const dueDate = readText(formData, "dueDate");

  if (!groupId || !itemId || !sectionId || !subsectionId || !title) {
    redirectWithMessage(returnTo, false, "請填寫追蹤項目資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await updateTrackingItem({
    groupId,
    itemId,
    sectionId,
    subsectionId,
    title,
    content,
    extraData,
    externalUrl,
    dueDate,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤項目已更新。");
}

export async function deleteTrackingItemAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const itemId = readText(formData, "itemId");

  if (!groupId || !itemId) {
    redirectWithMessage(returnTo, false, "缺少追蹤項目識別資料。");
  }

  await requireGroupStructureAccess(groupId, returnTo);

  const result = await deleteTrackingItem({ groupId, itemId });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤項目已刪除。");
}

export async function moveTrackingItemAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const itemId = readText(formData, "itemId");
  const targetSectionId = readText(formData, "targetSectionId");
  const targetSubsectionId = readText(formData, "targetSubsectionId");

  if (!groupId || !itemId || !targetSectionId || !targetSubsectionId) {
    redirectWithMessage(returnTo, false, "請選擇要搬移到的追蹤項目位置。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await moveTrackingItem({
    groupId,
    itemId,
    targetSectionId,
    targetSubsectionId,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤項目已搬移。");
}

export async function moveTrackingItemOrderAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const sectionId = readText(formData, "sectionId");
  const subsectionId = readText(formData, "subsectionId");
  const itemId = readText(formData, "itemId");
  const directionRaw = readText(formData, "direction");
  const direction = directionRaw === "up" || directionRaw === "down" ? directionRaw : null;

  if (!groupId || !sectionId || !subsectionId || !itemId || !direction) {
    redirectWithMessage(returnTo, false, "缺少追蹤項目排序資料。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);
  const result = await moveTrackingItemOrder({
    groupId,
    sectionId,
    subsectionId,
    itemId,
    direction,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, direction === "up" ? "追蹤項目已上移。" : "追蹤項目已下移。");
}

export async function copyTrackingItemAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const itemId = readText(formData, "itemId");
  const targetSectionId = readText(formData, "targetSectionId");
  const targetSubsectionId = readText(formData, "targetSubsectionId");

  if (!groupId || !itemId || !targetSectionId || !targetSubsectionId) {
    redirectWithMessage(returnTo, false, "請選擇要複製到的追蹤項目位置。");
  }

  const session = await requireGroupStructureAccess(groupId, returnTo);

  const result = await copyTrackingItem({
    groupId,
    itemId,
    targetSectionId,
    targetSubsectionId,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "追蹤項目已複製。");
}

export async function setTrackingItemMemberCompletionAction(formData: FormData) {
  const returnTo = readReturnTo(formData) ?? "/groups";
  const groupId = readText(formData, "groupId");
  const itemId = readText(formData, "itemId");
  const personId = readText(formData, "personId");
  const isCompleted = readText(formData, "isCompleted") === "true";

  if (!groupId || !itemId || !personId) {
    redirectWithMessage(returnTo, false, "缺少追蹤項目識別資料。");
  }

  const session = await requireGroupAccess(groupId, returnTo);
  if (session.role === "member") {
    const memberships = await listMembershipsByEmail(session.email);
    const currentMembership = memberships.find(
      (membership) =>
        membership.group_id === groupId && membership.membership_type === "member",
    );

    if (!currentMembership || currentMembership.person_id !== personId) {
      redirectWithMessage(returnTo, false, "學員僅可勾選自己的追蹤項目。");
    }
  }

  const result = await setTrackingItemMemberCompletion({
    groupId,
    itemId,
    personId,
    isCompleted,
    accountId: session.accountId,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, isCompleted ? "已回報完成。" : "已取消完成。");
}

export async function updateGroupMemberDirectoryProfileAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const personId = readText(formData, "personId");
  const displayName = readText(formData, "displayName");
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
    lineId,
    intro,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/directory`);
  if (!result.ok) redirectWithMessage(redirectPath, false, result.message);
  redirectWithMessage(redirectPath, true, "學員通訊錄資料已更新。");
}
