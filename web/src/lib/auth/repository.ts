import { randomInt } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { hashOtpCode, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AuthAccountRow, CoachAccountStatus } from "@/lib/auth/types";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; message: string };
type Result<T> = Ok<T> | Err;

function dbOrError():
  | { client: NonNullable<ReturnType<typeof getSupabaseAdminClient>> }
  | { client: null; error: string } {
  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      client: null,
      error:
        "缺少 Supabase 伺服器設定，請檢查 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY。",
    };
  }

  return { client };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function ensureDefaultAdminAccount(): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data: existing, error: lookupError } = await db.client
    .from("auth_accounts")
    .select("*")
    .eq("email", "root")
    .eq("role", "admin")
    .maybeSingle();

  if (lookupError) return { ok: false, message: lookupError.message };
  if (existing) return { ok: true, data: null };

  const { error } = await db.client.from("auth_accounts").insert({
    email: "root",
    display_name: "系統管理員",
    role: "admin",
    password_hash: hashPassword("root"),
    coach_status: "approved",
    is_active: true,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: null };
}

export async function findAccountByEmail(
  email: string,
): Promise<Result<AuthAccountRow | null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data, error } = await db.client
    .from("auth_accounts")
    .select("*")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data ?? null) as AuthAccountRow | null };
}

export async function createCoachApplication(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(input.email);
  const existing = await findAccountByEmail(email);
  if (!existing.ok) return existing;
  if (existing.data) {
    return { ok: false, message: "此 Email 已被註冊。" };
  }

  const { error } = await db.client.from("auth_accounts").insert({
    email,
    display_name: input.displayName,
    role: "coach",
    password_hash: hashPassword(input.password),
    coach_status: "pending",
    is_active: true,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: null };
}

export async function authenticateAdmin(input: {
  username: string;
  password: string;
}): Promise<Result<AuthAccountRow>> {
  const ensureResult = await ensureDefaultAdminAccount();
  if (!ensureResult.ok) return ensureResult;

  const accountResult = await findAccountByEmail(input.username);
  if (!accountResult.ok) return accountResult;
  if (!accountResult.data || accountResult.data.role !== "admin") {
    return { ok: false, message: "管理員帳號或密碼錯誤。" };
  }

  if (!accountResult.data.password_hash) {
    return { ok: false, message: "管理員帳號尚未設定密碼。" };
  }

  if (!verifyPassword(input.password, accountResult.data.password_hash)) {
    return { ok: false, message: "管理員帳號或密碼錯誤。" };
  }

  if (!accountResult.data.is_active) {
    return { ok: false, message: "管理員帳號已停用。" };
  }

  await markAccountLogin(accountResult.data.id);
  return { ok: true, data: accountResult.data };
}

export async function authenticateCoach(input: {
  email: string;
  password: string;
}): Promise<Result<AuthAccountRow>> {
  const accountResult = await findAccountByEmail(input.email);
  if (!accountResult.ok) return accountResult;
  if (!accountResult.data || accountResult.data.role !== "coach") {
    return { ok: false, message: "找不到此教練帳號。" };
  }

  const account = accountResult.data;
  if (!account.password_hash || !verifyPassword(input.password, account.password_hash)) {
    return { ok: false, message: "Email 或密碼錯誤。" };
  }

  if (!account.is_active) {
    return { ok: false, message: "此教練帳號已停用。" };
  }

  if (account.coach_status === "pending") {
    return { ok: false, message: "此教練帳號尚待管理員審核。" };
  }
  if (account.coach_status === "rejected") {
    return { ok: false, message: "此教練申請已被拒絕。" };
  }

  await markAccountLogin(account.id);
  return { ok: true, data: account };
}

async function upsertMemberAccountFromPeople(
  email: string,
): Promise<Result<AuthAccountRow | null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const existing = await findAccountByEmail(email);
  if (!existing.ok) return existing;
  if (existing.data) {
    if (existing.data.role !== "member") {
      return { ok: false, message: "此 Email 不是學員帳號。" };
    }
    return { ok: true, data: existing.data };
  }

  const { data: personRows, error: peopleError } = await db.client
    .from("people")
    .select("full_name, email")
    .eq("person_type", "member")
    .eq("email", email)
    .limit(1);

  if (peopleError) return { ok: false, message: peopleError.message };
  if (!personRows?.length) {
    return { ok: false, message: "找不到此學員帳號。" };
  }

  const person = personRows[0];

  const { data: insertedRows, error: insertError } = await db.client
    .from("auth_accounts")
    .insert({
      email,
      display_name: person.full_name ?? email,
      role: "member",
      coach_status: "approved",
      is_active: true,
    })
    .select("*")
    .limit(1);

  if (insertError) return { ok: false, message: insertError.message };
  return {
    ok: true,
    data: (insertedRows?.[0] as AuthAccountRow | undefined) ?? null,
  };
}

export async function createMemberOtp(emailInput: string): Promise<
  Result<{
    otpCode: string;
    otpCodeForDev: string | null;
    account: AuthAccountRow;
  }>
> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(emailInput);
  const accountResult = await upsertMemberAccountFromPeople(email);
  if (!accountResult.ok) return accountResult;
  if (!accountResult.data) {
    return { ok: false, message: "找不到此學員帳號。" };
  }

  const otpCode = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const otpHash = hashOtpCode(email, otpCode);

  const { error } = await db.client.from("member_login_otps").insert({
    account_id: accountResult.data.id,
    email,
    otp_hash: otpHash,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    data: {
      otpCode,
      otpCodeForDev: process.env.NODE_ENV === "production" ? null : otpCode,
      account: accountResult.data,
    },
  };
}

export async function verifyMemberOtp(input: {
  emailInput: string;
  otpCode: string;
}): Promise<Result<AuthAccountRow>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(input.emailInput);
  const accountResult = await findAccountByEmail(email);
  if (!accountResult.ok) return accountResult;
  if (!accountResult.data || accountResult.data.role !== "member") {
    return { ok: false, message: "找不到此學員帳號。" };
  }

  const { data: otpRows, error: otpError } = await db.client
    .from("member_login_otps")
    .select("id, otp_hash, expires_at, consumed_at")
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (otpError) return { ok: false, message: otpError.message };
  if (!otpRows?.length) return { ok: false, message: "OTP 不存在或已失效。" };

  const otp = otpRows[0];
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "OTP 已過期，請重新取得。" };
  }

  if (otp.otp_hash !== hashOtpCode(email, input.otpCode.trim())) {
    return { ok: false, message: "OTP 驗證碼錯誤。" };
  }

  const { error: consumeError } = await db.client
    .from("member_login_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);

  if (consumeError) return { ok: false, message: consumeError.message };
  await markAccountLogin(accountResult.data.id);
  return { ok: true, data: accountResult.data };
}

export async function listCoachAccounts(): Promise<Result<AuthAccountRow[]>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data, error } = await db.client
    .from("auth_accounts")
    .select("*")
    .eq("role", "coach")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data ?? []) as AuthAccountRow[] };
}

export async function listPendingCoachAccounts(): Promise<
  Result<AuthAccountRow[]>
> {
  const result = await listCoachAccounts();
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.filter((item) => item.coach_status === "pending"),
  };
}

export async function updateCoachStatus(input: {
  accountId: string;
  status: CoachAccountStatus;
  reviewerId: string;
}): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("auth_accounts")
    .update({
      coach_status: input.status,
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.accountId)
    .eq("role", "coach");

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: null };
}

export async function createCoachByAdmin(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(input.email);
  const account = await findAccountByEmail(email);
  if (!account.ok) return account;

  if (!account.data) {
    const { error: insertError } = await db.client.from("auth_accounts").insert({
      email,
      display_name: input.displayName,
      role: "coach",
      password_hash: hashPassword(input.password),
      coach_status: "approved",
      is_active: true,
    });

    if (insertError) return { ok: false, message: insertError.message };
    return { ok: true, data: null };
  }

  if (account.data.role !== "coach") {
    return { ok: false, message: "此 Email 已被其他身份使用。" };
  }

  const { error: updateError } = await db.client
    .from("auth_accounts")
    .update({
      display_name: input.displayName || account.data.display_name,
      password_hash: hashPassword(input.password),
      coach_status: "approved",
      is_active: true,
    })
    .eq("id", account.data.id);

  if (updateError) return { ok: false, message: updateError.message };
  return { ok: true, data: null };
}

export async function deleteCoachByAdmin(accountId: string): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("auth_accounts")
    .delete()
    .eq("id", accountId)
    .eq("role", "coach");

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: null };
}

export async function getAdminNotificationEmail(): Promise<Result<string | null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data, error } = await db.client
    .from("admin_settings")
    .select("id, notification_email")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) return { ok: false, message: error.message };

  const saved = data?.[0]?.notification_email?.trim();
  if (saved) return { ok: true, data: saved };

  const envEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ?? null;
  return { ok: true, data: envEmail || null };
}

export async function setAdminNotificationEmail(
  notificationEmail: string,
): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const email = normalizeEmail(notificationEmail);

  const { data, error: findError } = await db.client
    .from("admin_settings")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (findError) return { ok: false, message: findError.message };

  const existingId = data?.[0]?.id;
  if (!existingId) {
    const { error: insertError } = await db.client
      .from("admin_settings")
      .insert({ notification_email: email });
    if (insertError) return { ok: false, message: insertError.message };
    return { ok: true, data: null };
  }

  const { error: updateError } = await db.client
    .from("admin_settings")
    .update({ notification_email: email })
    .eq("id", existingId);

  if (updateError) return { ok: false, message: updateError.message };
  return { ok: true, data: null };
}

export async function markAccountLogin(accountId: string): Promise<Result<null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("auth_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: null };
}

export async function findAccountById(
  accountId: string,
): Promise<Result<AuthAccountRow | null>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data, error } = await db.client
    .from("auth_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data ?? null) as AuthAccountRow | null };
}

export async function updateAccountDisplayName(input: {
  accountId: string;
  displayName: string;
}): Promise<Result<AuthAccountRow>> {
  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { data, error } = await db.client
    .from("auth_accounts")
    .update({ display_name: input.displayName })
    .eq("id", input.accountId)
    .select("*")
    .limit(1);

  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "找不到帳號資料。" };
  return { ok: true, data: data[0] as AuthAccountRow };
}

export async function changeAccountPassword(input: {
  accountId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<Result<null>> {
  const accountResult = await findAccountById(input.accountId);
  if (!accountResult.ok) return accountResult;
  if (!accountResult.data) {
    return { ok: false, message: "找不到帳號資料。" };
  }

  const account = accountResult.data;
  if (account.role === "member") {
    return { ok: false, message: "學員帳號採 OTP 登入，不支援密碼變更。" };
  }

  if (!account.password_hash) {
    return { ok: false, message: "此帳號尚未設定密碼。" };
  }

  if (!verifyPassword(input.currentPassword, account.password_hash)) {
    return { ok: false, message: "目前密碼輸入錯誤。" };
  }

  const db = dbOrError();
  if (!db.client) return { ok: false, message: db.error };

  const { error } = await db.client
    .from("auth_accounts")
    .update({ password_hash: hashPassword(input.newPassword) })
    .eq("id", input.accountId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: null };
}
