"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  authenticateCoach,
  createCoachApplication,
  createCoachByAdmin,
  createMemberOtp,
  deleteCoachByAdmin,
  getAdminNotificationEmail,
  setAdminNotificationEmail,
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
    toMessage("/login/coach", "error", "Name, email, and password are required.");
  }

  const createResult = await createCoachApplication({ displayName, email, password });
  if (!createResult.ok) toMessage("/login/coach", "error", createResult.message);

  const notificationEmailResult = await getAdminNotificationEmail();
  if (!notificationEmailResult.ok) {
    toMessage(
      "/login/coach",
      "success",
      `Application submitted. Admin email lookup failed: ${notificationEmailResult.message}`,
    );
  }

  const notificationEmail = notificationEmailResult.data;
  if (!notificationEmail) {
    toMessage(
      "/login/coach",
      "success",
      "Application submitted. Admin notification email is not configured yet.",
    );
  }

  const emailResult = await sendTransactionalEmail({
    to: notificationEmail,
    subject: "New coach registration pending approval",
    text: `Coach registration pending approval.\nName: ${displayName}\nEmail: ${email}`,
    html: `<p>Coach registration pending approval.</p><p><strong>Name:</strong> ${displayName}<br/><strong>Email:</strong> ${email}</p>`,
  });

  if (!emailResult.ok) {
    toMessage(
      "/login/coach",
      "success",
      `Application submitted. Notification email failed: ${emailResult.message}`,
    );
  }

  toMessage("/login/coach", "success", "Application submitted and sent to admin.");
}

export async function coachLoginAction(formData: FormData) {
  const email = readText(formData, "email");
  const password = readText(formData, "password");

  if (!email || !password) {
    toMessage("/login/coach", "error", "Email and password are required.");
  }

  const result = await authenticateCoach({ email, password });
  if (!result.ok) toMessage("/login/coach", "error", result.message);

  await createSession({
    accountId: result.data.id,
    email: result.data.email,
    displayName: result.data.display_name,
    role: result.data.role,
  });

  toMessage("/dashboard", "success", "Coach login successful.");
}

export async function memberSendOtpAction(formData: FormData) {
  const email = readText(formData, "email");
  if (!email) toMessage("/login/member", "error", "Email is required.");

  const otpResult = await createMemberOtp(email);
  if (!otpResult.ok) toMessage("/login/member", "error", otpResult.message);

  const otpCodeForDev = otpResult.data.otpCodeForDev;
  const emailResult = await sendTransactionalEmail({
    to: email.toLowerCase(),
    subject: "Your PM-ABC login OTP",
    text: `Your OTP code is ${otpResult.data.otpCode} (valid for 10 minutes).`,
    html: `<p>Your OTP code is <strong>${otpResult.data.otpCode}</strong> (valid for 10 minutes).</p>`,
  });

  if (!emailResult.ok && !otpCodeForDev) {
    toMessage("/login/member", "error", `OTP email failed: ${emailResult.message}`);
  }

  if (otpCodeForDev) {
    toMessage(
      `/login/member?email=${encodeURIComponent(email.toLowerCase())}`,
      "success",
      `OTP sent (dev mode). Code: ${otpCodeForDev}`,
    );
  }

  toMessage(
    `/login/member?email=${encodeURIComponent(email.toLowerCase())}`,
    "success",
    "OTP has been sent to your email.",
  );
}

export async function memberVerifyOtpAction(formData: FormData) {
  const email = readText(formData, "email");
  const otpCode = readText(formData, "otpCode");

  if (!email || !otpCode) {
    toMessage("/login/member", "error", "Email and OTP are required.");
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

  toMessage("/dashboard", "success", "Member login successful.");
}

export async function adminLoginAction(formData: FormData) {
  const usernameInput = readText(formData, "username");
  const password = readText(formData, "password");
  const username = usernameInput.toLowerCase() === "root" ? "root" : usernameInput;

  if (!username || !password) {
    toMessage("/login/admin", "error", "Username and password are required.");
  }

  const result = await authenticateAdmin({ username, password });
  if (!result.ok) toMessage("/login/admin", "error", result.message);

  await createSession({
    accountId: result.data.id,
    email: result.data.email,
    displayName: result.data.display_name,
    role: result.data.role,
  });

  toMessage("/dashboard", "success", "Admin login successful.");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login?status=success&message=Signed%20out%20successfully.");
}

async function requireAdminSession() {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    toMessage("/login/admin", "error", "Admin access is required.");
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
  toMessage("/admin/coach-approvals", "success", "Coach approved.");
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
  toMessage("/admin/coach-approvals", "success", "Coach rejected.");
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
      "Email, display name, and password are required.",
    );
  }

  const result = await createCoachByAdmin({ email, displayName, password });
  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "Coach account saved.");
}

export async function deleteCoachByAdminAction(formData: FormData) {
  const accountId = readText(formData, "accountId");
  await requireAdminSession();
  const result = await deleteCoachByAdmin(accountId);

  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "Coach account deleted.");
}

export async function updateAdminNotificationEmailAction(formData: FormData) {
  const notificationEmail = readText(formData, "notificationEmail");
  await requireAdminSession();

  if (!notificationEmail.includes("@")) {
    toMessage("/admin/coach-approvals", "error", "Please provide a valid email.");
  }

  const result = await setAdminNotificationEmail(notificationEmail);
  revalidatePath("/admin/coach-approvals");
  if (!result.ok) toMessage("/admin/coach-approvals", "error", result.message);
  toMessage("/admin/coach-approvals", "success", "Admin notification email updated.");
}
