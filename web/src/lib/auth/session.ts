import crypto from "crypto";
import { cookies } from "next/headers";
import type { AppRole, AppSession } from "@/lib/auth/types";

const SESSION_COOKIE_NAME = "pmabc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSessionSecret(): string {
  if (process.env.APP_SESSION_SECRET) return process.env.APP_SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") return "dev-insecure-session-secret";
  throw new Error("APP_SESSION_SECRET is required in production.");
}

function sign(input: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(input)
    .digest("base64url");
}

function encode(payload: AppSession): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encoded}.${sign(encoded)}`;
}

function decode(token: string): AppSession | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as AppSession;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(input: {
  accountId: string;
  email: string;
  displayName: string;
  role: AppRole;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AppSession = {
    accountId: input.accountId,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}
