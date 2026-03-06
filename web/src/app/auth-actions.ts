"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  authenticateCoach,
  changeAccountPassword,
  createCoachApplication,
  createCoachByAdmin,
  createMemberOtp,
  deleteCoachByAdmin,
  findAccountById,
  getAdminNotificationEmail,
  setAdminNotificationEmail,
  upsertCoachDirectoryProfile,
  updateAccountDisplayName,
  updateCoachStatus,
  verifyMemberOtp,
} from "@/lib/auth/repository";
import { createSession, clearSession, getCurrentSession } from "@/lib/auth/session";
import { sendTransactionalEmail } from "@/lib/notifications/email";

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toMessage(
  path: string,
  status: "success" | "error",
  message: string,
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${separator}status=${status}&message=${encodeURIComponent(message)}`,
  );
}

export async function coachRegisterAction(formData: FormData) {
  const displayName = readText(formData, "displayName");
  const email = readText(formData, "email");
  const password = readText(formData, "password");

  if (!displayName || !email || !password) {
    toMessage("/login/coach", "error", "姓名、Email 與密碼皆為必填。");
  }

  const createResult = await createCoachApplication({ displayName, email, password });
  if (!createResult.ok) toMessage("/login/coach", "error", createResult.message);

  const notificationEmailResult = await getAdminNotificationEmail();
  if (!notificationEmailResult.ok) {
    toMessage(
      "/login/coach",
      "success",
      `申請已送出，但查詢管理員通知信箱失敗：${notificationEmailResult.message}`,
    );
  }

  const notificationEmail = notificationEmailResult.data;
  if (!notificationEmail) {
    toMessage(
      "/login/coach",
      "success",
      "申請已送出，但尚未設定管理員通知信箱。",
    );
  }

  const emailResult = await sendTransactionalEmail({
    to: notificationEmail,
    subject: "新的教練註冊申請待審核",
    text: `有新的教練註冊申請待審核。\n姓名：${displayName}\nEmail：${email}`,
    html: `<p>有新的教練註冊申請待審核。</p><p><strong>姓名：</strong>${displayName}<br/><strong>Email：</strong>${email}</p>`,
  });

  if (!emailResult.ok) {
    toMessage(
      "/login/coach",
      "success",
      `申請已送出，但通知信寄送失敗：${emailResult.message}`,
    );
  }

  toMessage("/login/coach", "success", "教練註冊申請已送出，等待管理員審核。");
}

export async function coachLoginAction(formData: FormData) {
  const email = readText(formData, "email");
  const password = readText(formData, "password");

  if (!email || !password) {
    toMessage("/login/coach", "error", "請輸入 Email 與密碼。");
  }

  const result = await authenticateCoach({ email, password });
  if (!result.ok) toMessage("/login/coach", "error", result.message);

  await createSession({
    accountId: result.data.id,
    email: result.data.email,
    displayName: result.data.display_name,
    role: result.data.role,
  });

  toMessage("/dashboard", "success", "教練登入成功。");
}

export async function memberSendOtpAction(formData: FormData) {
  const email = readText(formData, "email");
  if (!email) toMessage("/login/member", "error", "請輸入 Email。");

  const otpResult = await createMemberOtp(email);
  if (!otpResult.ok) toMessage("/login/member", "error", otpResult.message);

  const otpCodeForDev = otpResult.data.otpCodeForDev;
  const emailResult = await sendTransactionalEmail({
    to: email.toLowerCase(),
    subject: "PM-ABC 登入驗證碼",
    text: `您的 OTP 驗證碼是 ${otpResult.data.otpCode}，10 分鐘內有效。`,
    html: `<p>您的 OTP 驗證碼是 <strong>${otpResult.data.otpCode}</strong>，10 分鐘內有效。</p>`,
  });

  if (!emailResult.ok && !otpCodeForDev) {
    toMessage("/login/member", "error", `OTP 郵件寄送失敗：${emailResult.message}`);
  }

  if (otpCodeForDev) {
    toMessage(
      `/login/member?email=${encodeURIComponent(email.toLowerCase())}`,
      "success",
      `OTP 已送出（開發模式）：${otpCodeForDev}`,
    );
  }

  toMessage(
    `/login/member?email=${encodeURIComponent(email.toLowerCase())}`,
    "success",
    "OTP 已寄送，請到信箱收取。",
  );
}

export async function memberVerifyOtpAction(formData: FormData) {
  const email = readText(formData, "email");
  const otpCode = readText(formData, "otpCode");

  if (!email || !otpCode) {
    toMessage("/login/member", "error", "請輸入 Email 與 OTP 驗證碼。");
  }

  const result = await verifyMemberOtp({ emailInput: email, otpCode });
  if (!result.ok) {
    toMessage(
      `/login/member?email=${encodeURIComponent(email.toLowerCase())}`,
      "error",
      result.message,
    );
  }

  await createSession({
    accountId: result.data.id,
    email: result.data.email,
    displayName: result.data.display_name,
    role: result.data.role,
  });

  toMessage("/dashboard", "success", "學員登入成功。");
}

export async function adminLoginAction(formData: FormData) {
  const usernameInput = readText(formData, "username");
  const password = readText(formData, "password");
  const username = usernameInput.toLowerCase() === "root" ? "root" : usernameInput;

  if (!username || !password) {
    toMessage("/login/admin", "error", "請輸入帳號與密碼。");
  }

  const result = await authenticateAdmin({ username, password });
  if (!result.ok) toMessage("/login/admin", "error", result.message);

  await createSession({
    accountId: result.data.id,
    email: result.data.email,
    displayName: result.data.display_name,
    role: result.data.role,
  });

  toMessage("/dashboard", "success", "管理員登入成功。");
}

export async function logoutAction() {
  await clearSession();
  const message = encodeURIComponent("您已成功登出。");
  redirect(`/login?status=success&message=${message}`);
}

async function requireAdminSession() {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    toMessage("/login/admin", "error", "此操作僅限管理員執行。");
  }
  return session;
}

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    toMessage("/login", "error", "請先登入後再繼續使用。");
  }
  return session;
}

export async function approveCoachAction(formData: FormData) {
  const accountId = readText(formData, "accountId");
  const admin = await requireAdminSession();
  const result = await updateCoachStatus({
    accountId,
    status: "approved",
    reviewerId: admin.accountId,
  });

  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "已核准教練申請。");
}

export async function rejectCoachAction(formData: FormData) {
  const accountId = readText(formData, "accountId");
  const admin = await requireAdminSession();
  const result = await updateCoachStatus({
    accountId,
    status: "rejected",
    reviewerId: admin.accountId,
  });

  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "已拒絕教練申請。");
}

export async function createCoachByAdminAction(formData: FormData) {
  const email = readText(formData, "email");
  const displayName = readText(formData, "displayName");
  const password = readText(formData, "password");
  await requireAdminSession();

  if (!email || !displayName || !password) {
    toMessage(
      "/admin/coach-approvals",
      "error",
      "Email、顯示名稱與密碼皆為必填。",
    );
  }

  const result = await createCoachByAdmin({ email, displayName, password });
  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "教練帳號已儲存。");
}

export async function deleteCoachByAdminAction(formData: FormData) {
  const accountId = readText(formData, "accountId");
  await requireAdminSession();
  const result = await deleteCoachByAdmin(accountId);

  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "教練帳號已刪除。");
}

export async function updateAdminNotificationEmailAction(formData: FormData) {
  const notificationEmail = readText(formData, "notificationEmail");
  await requireAdminSession();

  if (!notificationEmail.includes("@")) {
    toMessage("/admin/coach-approvals", "error", "請輸入有效的 Email。");
  }

  const result = await setAdminNotificationEmail(notificationEmail);
  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "管理員通知信箱已更新。");
}

export async function updateAccountProfileAction(formData: FormData) {
  const session = await requireSession();
  const displayName = readText(formData, "displayName");

  if (!displayName) {
    toMessage("/account", "error", "顯示名稱不可為空白。");
  }

  const result = await updateAccountDisplayName({
    accountId: session.accountId,
    displayName,
  });

  if (!result.ok) toMessage("/account", "error", result.message);

  await createSession({
    accountId: result.data.id,
    email: result.data.email,
    displayName: result.data.display_name,
    role: result.data.role,
  });

  revalidatePath("/account");
  revalidatePath("/dashboard");
  toMessage("/account", "success", "帳號資訊已更新。");
}

export async function changeMyPasswordAction(formData: FormData) {
  const session = await requireSession();
  const currentPassword = readText(formData, "currentPassword");
  const newPassword = readText(formData, "newPassword");
  const confirmPassword = readText(formData, "confirmPassword");

  if (!currentPassword || !newPassword || !confirmPassword) {
    toMessage("/account", "error", "請完整填寫密碼欄位。");
  }

  if (newPassword.length < 8) {
    toMessage("/account", "error", "新密碼至少需要 8 碼。");
  }

  if (newPassword !== confirmPassword) {
    toMessage("/account", "error", "新密碼與確認密碼不一致。");
  }

  const accountResult = await findAccountById(session.accountId);
  if (!accountResult.ok) toMessage("/account", "error", accountResult.message);
  if (!accountResult.data) toMessage("/account", "error", "找不到帳號資料。");

  if (accountResult.data.role === "member") {
    toMessage("/account", "error", "學員帳號採 OTP 登入，不支援密碼變更。");
  }

  const result = await changeAccountPassword({
    accountId: session.accountId,
    currentPassword,
    newPassword,
  });

  if (!result.ok) toMessage("/account", "error", result.message);
  toMessage("/account", "success", "密碼已更新。");
}

export async function updateCoachDirectoryProfileAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "coach") {
    toMessage("/account", "error", "僅教練可編輯通訊錄資訊。");
  }

  const fullName = readText(formData, "fullName");
  const displayName = readText(formData, "displayName");
  const phone = readText(formData, "phone");
  const lineId = readText(formData, "lineId");
  const intro = readText(formData, "intro");

  if (!fullName) {
    toMessage("/account", "error", "姓名不可為空白。");
  }

  const profileResult = await upsertCoachDirectoryProfile({
    accountEmail: session.email,
    fullName,
    displayName,
    phone,
    lineId,
    intro,
  });
  if (!profileResult.ok) {
    toMessage("/account", "error", profileResult.message);
  }

  const nextDisplayName = displayName || fullName;
  const accountResult = await updateAccountDisplayName({
    accountId: session.accountId,
    displayName: nextDisplayName,
  });
  if (!accountResult.ok) {
    toMessage("/account", "error", accountResult.message);
  }

  await createSession({
    accountId: accountResult.data.id,
    email: accountResult.data.email,
    displayName: accountResult.data.display_name,
    role: accountResult.data.role,
  });

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/groups");
  toMessage("/account", "success", "教練通訊錄資料已更新。");
}
