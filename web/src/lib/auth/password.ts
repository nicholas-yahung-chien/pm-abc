import crypto from "crypto";

const HASH_KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .scryptSync(password, salt, HASH_KEY_LEN)
    .toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algo, salt, hash] = storedHash.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(password, salt, expected.length);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function generatePasswordResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashResetToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function hashOtpCode(email: string, otpCode: string): string {
  const secret = process.env.OTP_HASH_SECRET ?? process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing OTP_HASH_SECRET or APP_SESSION_SECRET.");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${email.toLowerCase()}::${otpCode}`)
    .digest("base64url");
}
