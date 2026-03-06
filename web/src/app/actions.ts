"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClass,
  createGroup,
  createMembership,
  createPerson,
  createRole,
  createRoleAssignment,
} from "@/lib/repository";

function redirectWithMessage(path: string, ok: boolean, message: string) {
  const status = ok ? "success" : "error";
  const encoded = encodeURIComponent(message);
  redirect(`${path}?status=${status}&message=${encoded}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createClassAction(formData: FormData) {
  const code = readText(formData, "code");
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const startDate = readText(formData, "startDate");
  const endDate = readText(formData, "endDate");

  if (!code || !name) {
    redirectWithMessage("/classes", false, "班別代碼與名稱為必填。");
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
  redirectWithMessage("/classes", true, "班別已建立。");
}

export async function createGroupAction(formData: FormData) {
  const classId = readText(formData, "classId");
  const code = readText(formData, "code");
  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!classId || !code || !name) {
    redirectWithMessage("/groups", false, "請完整填寫班別、組別代碼與名稱。");
  }

  const result = await createGroup({ classId, code, name, description });
  revalidatePath("/groups");
  revalidatePath("/roles");
  revalidatePath("/directory");

  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "小組已建立。");
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
    redirectWithMessage("/people", false, "姓名與人員類型為必填。");
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
  revalidatePath("/directory");
  if (!result.ok) redirectWithMessage("/people", false, result.message);
  redirectWithMessage("/people", true, "人員資料已建立。");
}

export async function createMembershipAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const personId = readText(formData, "personId");
  const membershipType = readText(formData, "membershipType") as
    | "coach"
    | "member";
  const isLeader = formData.get("isLeader") === "on";

  if (!groupId || !personId || !membershipType) {
    redirectWithMessage("/groups", false, "請完整選擇小組、人員與類型。");
  }

  const result = await createMembership({
    groupId,
    personId,
    membershipType,
    isLeader,
  });

  revalidatePath("/groups");
  revalidatePath("/directory");
  if (!result.ok) redirectWithMessage("/groups", false, result.message);
  redirectWithMessage("/groups", true, "已加入小組成員。");
}

export async function createRoleAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const sortOrderRaw = readText(formData, "sortOrder");
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 100;

  if (!groupId || !name) {
    redirectWithMessage("/roles", false, "請完整填寫小組與角色名稱。");
  }

  const result = await createRole({
    groupId,
    name,
    description,
    sortOrder: Number.isNaN(sortOrder) ? 100 : sortOrder,
  });

  revalidatePath("/roles");
  revalidatePath("/directory");
  if (!result.ok) redirectWithMessage("/roles", false, result.message);
  redirectWithMessage("/roles", true, "角色已建立。");
}

export async function createRoleAssignmentAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const roleId = readText(formData, "roleId");
  const personId = readText(formData, "personId");
  const note = readText(formData, "note");

  if (!groupId || !roleId || !personId) {
    redirectWithMessage("/roles", false, "請完整選擇小組、角色與人員。");
  }

  const result = await createRoleAssignment({
    groupId,
    roleId,
    personId,
    note,
  });

  revalidatePath("/roles");
  revalidatePath("/directory");
  if (!result.ok) redirectWithMessage("/roles", false, result.message);
  redirectWithMessage("/roles", true, "角色分派已建立。");
}

