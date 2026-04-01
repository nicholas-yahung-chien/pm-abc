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
  createPasswordResetToken,
  deleteCoachByAdmin,
  findAccountById,
  findAccountByEmail,
  findAndConsumePasswordResetToken,
  getAdminNotificationEmail,
  setAccountPassword,
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

export async function requestPasswordResetAction(formData: FormData) {
  const emailInput = readText(formData, "email");
  if (!emailInput) toMessage("/login/reset-password", "error", "請輸入 Email 或帳號識別碼。");

  const email = emailInput.toLowerCase();
  const accountResult = await findAccountByEmail(email);

  if (!accountResult.ok || !accountResult.data) {
    // Generic response — do not reveal whether the account exists
    toMessage(
      "/login/reset-password",
      "success",
      "若此帳號已存在，重設密碼連結將於幾分鐘內送達信箱。",
    );
  }

  const account = accountResult.data!;

  if (account.role === "member") {
    toMessage(
      "/login/reset-password",
      "error",
      "學員帳號使用 OTP 驗證碼登入，無需重設密碼。請前往學員登入頁面取得 OTP。",
    );
  }

  // Admin root account: send reset email to the configured admin notification email
  let recipientEmail = email;
  if (account.role === "admin" && email === "root") {
    const notifResult = await getAdminNotificationEmail();
    if (!notifResult.ok || !notifResult.data) {
      toMessage(
        "/login/reset-password",
        "error",
        "管理員通知信箱尚未設定，無法自動寄送重設連結。請至管理後台設定通知信箱後再試。",
      );
    }
    recipientEmail = notifResult.data!;
  }

  const tokenResult = await createPasswordResetToken(account.id);
  if (!tokenResult.ok) toMessage("/login/reset-password", "error", tokenResult.message);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const resetUrl = `${baseUrl}/login/reset-password/confirm?token=${tokenResult.data}`;

  const emailResult = await sendTransactionalEmail({
    to: recipientEmail,
    subject: "PM-ABC 密碼重設連結",
    text: `您好，\n\n請點擊以下連結重設您的密碼（有效期限：1 小時）：\n\n${resetUrl}\n\n若您未申請重設密碼，請忽略此郵件。`,
    html: `<p>您好，</p><p>請點擊以下連結重設您的密碼（有效期限：1 小時）：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>若您未申請重設密碼，請忽略此郵件。</p>`,
  });

  if (!emailResult.ok) {
    toMessage("/login/reset-password", "error", `重設密碼郵件寄送失敗：${emailResult.message}`);
  }

  toMessage(
    "/login/reset-password",
    "success",
    "重設密碼連結已寄出，請至信箱查收（有效期限 1 小時）。",
  );
}

export async function resetPasswordWithTokenAction(formData: FormData) {
  const rawToken = readText(formData, "token");
  const newPassword = readText(formData, "newPassword");
  const confirmPassword = readText(formData, "confirmPassword");

  if (!rawToken) toMessage("/login/reset-password", "error", "重設連結無效，請重新申請。");

  const confirmPath = `/login/reset-password/confirm?token=${rawToken}`;

  if (!newPassword || !confirmPassword) {
    toMessage(confirmPath, "error", "請完整填寫密碼欄位。");
  }
  if (newPassword.length < 8) {
    toMessage(confirmPath, "error", "新密碼至少需要 8 碼。");
  }
  if (newPassword !== confirmPassword) {
    toMessage(confirmPath, "error", "新密碼與確認密碼不一致。");
  }

  const accountResult = await findAndConsumePasswordResetToken(rawToken);
  if (!accountResult.ok) {
    toMessage("/login/reset-password", "error", accountResult.message);
  }

  const account = accountResult.data!;
  const setResult = await setAccountPassword(account.id, newPassword);
  if (!setResult.ok) toMessage(confirmPath, "error", setResult.message);

  const loginPath = account.role === "admin" ? "/login/admin" : "/login/coach";
  toMessage(loginPath, "success", "密碼已成功重設，請使用新密碼登入。");
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
