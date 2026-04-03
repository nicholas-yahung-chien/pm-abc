"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createGroupStudyReadingItem,
  createGroupStudySession,
  deleteGroupStudyReadingItem,
  deleteGroupStudySession,
  listGroupIdsByEmail,
  moveGroupStudyReadingItem,
  moveGroupStudySession,
  replaceGroupStudySessionDutyMembers,
  setGroupStudyReadingAssignment,
  updateGroupStudyReadingItem,
  updateGroupStudySession,
} from "@/lib/repository";
import { createZoomMeeting } from "@/lib/zoom";
import type { AppSession } from "@/lib/auth/types";
import type { GroupStudySessionMode } from "@/lib/types";

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

function readDirection(formData: FormData): "up" | "down" | null {
  const value = readText(formData, "direction");
  if (value === "up" || value === "down") return value;
  return null;
}

function readBoolean(formData: FormData, key: string): boolean {
  const values = formData
    .getAll(key)
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  return values.some(
    (value) => value === "1" || value === "true" || value === "on" || value === "yes",
  );
}

function normalizeSessionMode(value: string): GroupStudySessionMode {
  return value === "online" ? "online" : "offline";
}

async function requireSignedIn(redirectPath: string): Promise<AppSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirectWithMessage(redirectPath, false, "\u8acb\u5148\u767b\u5165\u5f8c\u518d\u7e7c\u7e8c\u4f7f\u7528\u3002");
  }
  return session;
}

async function requireGroupAccess(groupId: string, redirectPath: string): Promise<AppSession> {
  const session = await requireSignedIn(redirectPath);
  if (session.role !== "member") return session;

  const groupIds = await listGroupIdsByEmail(session.email);
  if (!groupIds.includes(groupId)) {
    redirectWithMessage(
      redirectPath,
      false,
      "\u5b78\u54e1\u50c5\u53ef\u7ba1\u7406\u5df2\u88ab\u6307\u6d3e\u7684\u5c0f\u7d44\u3002",
    );
  }
  return session;
}

async function requireManageAccess(groupId: string, redirectPath: string): Promise<AppSession> {
  const session = await requireGroupAccess(groupId, redirectPath);
  if (session.role === "member") {
    redirectWithMessage(redirectPath, false, "學員僅可查看讀書會內容。");
  }
  return session;
}

function revalidateGroupStudyPaths(groupId: string) {
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/study`);
}

function defaultReturnPath(groupId: string): string {
  return groupId ? `/groups/${groupId}/study` : "/groups";
}

export async function createGroupStudySessionAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const title = readText(formData, "title");
  const sessionDate = readText(formData, "sessionDate");
  const startTime = readText(formData, "startTime");
  const endTime = readText(formData, "endTime");
  const mode = normalizeSessionMode(readText(formData, "mode"));
  const locationAddress = readText(formData, "locationAddress");
  const mapUrl = readText(formData, "mapUrl");
  const onlineMeetingUrl = readText(formData, "onlineMeetingUrl");
  const note = readText(formData, "note");

  if (!groupId || !title) {
    redirectWithMessage(returnTo, false, "\u8acb\u586b\u5beb\u6d3b\u52d5\u6a19\u984c\u3002");
  }

  const session = await requireManageAccess(groupId, returnTo);

  // Auto-create Zoom meeting when mode is online and no URL was provided
  let resolvedMeetingUrl = onlineMeetingUrl;
  let zoomMeetingId: string | null = null;
  if (mode === "online" && !onlineMeetingUrl) {
    const zoom = await createZoomMeeting({ topic: title, startDate: sessionDate, startTime });
    if (zoom.ok) {
      resolvedMeetingUrl = zoom.joinUrl;
      zoomMeetingId = zoom.meetingId;
    }
    // If Zoom fails, proceed without a URL — coach can fill it in manually
  }

  const result = await createGroupStudySession({
    groupId,
    title,
    sessionDate,
    startTime,
    endTime,
    mode,
    locationAddress,
    mapUrl,
    onlineMeetingUrl: resolvedMeetingUrl,
    note,
    accountId: session.accountId,
    zoomMeetingId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u8b80\u66f8\u6703\u6d3b\u52d5\u5df2\u65b0\u589e\u3002");
}

export async function updateGroupStudySessionAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");
  const title = readText(formData, "title");
  const sessionDate = readText(formData, "sessionDate");
  const startTime = readText(formData, "startTime");
  const endTime = readText(formData, "endTime");
  const mode = normalizeSessionMode(readText(formData, "mode"));
  const locationAddress = readText(formData, "locationAddress");
  const mapUrl = readText(formData, "mapUrl");
  const onlineMeetingUrl = readText(formData, "onlineMeetingUrl");
  const note = readText(formData, "note");

  if (!groupId || !sessionId || !title) {
    redirectWithMessage(returnTo, false, "\u8acb\u586b\u5beb\u6d3b\u52d5\u6a19\u984c\u3002");
  }

  const session = await requireManageAccess(groupId, returnTo);

  // Auto-create Zoom meeting when switching to online with no URL
  let resolvedMeetingUrl = onlineMeetingUrl;
  let zoomMeetingId: string | null | undefined = undefined; // undefined = don't overwrite existing
  if (mode === "online" && !onlineMeetingUrl) {
    const zoom = await createZoomMeeting({ topic: title, startDate: sessionDate, startTime });
    if (zoom.ok) {
      resolvedMeetingUrl = zoom.joinUrl;
      zoomMeetingId = zoom.meetingId;
    }
  }

  const result = await updateGroupStudySession({
    groupId,
    sessionId,
    title,
    sessionDate,
    startTime,
    endTime,
    mode,
    locationAddress,
    mapUrl,
    onlineMeetingUrl: resolvedMeetingUrl,
    note,
    accountId: session.accountId,
    zoomMeetingId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u8b80\u66f8\u6703\u6d3b\u52d5\u5df2\u66f4\u65b0\u3002");
}

export async function deleteGroupStudySessionAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");

  if (!groupId || !sessionId) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u6d3b\u52d5\u8b58\u5225\u8cc7\u8a0a\u3002");
  }

  await requireManageAccess(groupId, returnTo);
  const result = await deleteGroupStudySession({ groupId, sessionId });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u8b80\u66f8\u6703\u6d3b\u52d5\u5df2\u522a\u9664\u3002");
}

export async function moveGroupStudySessionAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");
  const direction = readDirection(formData);

  if (!groupId || !sessionId || !direction) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u6392\u5e8f\u8abf\u6574\u8cc7\u8a0a\u3002");
  }

  const session = await requireManageAccess(groupId, returnTo);
  const result = await moveGroupStudySession({
    groupId,
    sessionId,
    direction,
    accountId: session.accountId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(
    returnTo,
    true,
    direction === "up"
      ? "\u8b80\u66f8\u6703\u6d3b\u52d5\u5df2\u4e0a\u79fb\u3002"
      : "\u8b80\u66f8\u6703\u6d3b\u52d5\u5df2\u4e0b\u79fb\u3002",
  );
}

export async function replaceGroupStudySessionDutyMembersAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");
  const personIds = formData
    .getAll("personIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!groupId || !sessionId) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u503c\u65e5\u751f\u8a2d\u5b9a\u8cc7\u8a0a\u3002");
  }

  const session = await requireManageAccess(groupId, returnTo);
  const result = await replaceGroupStudySessionDutyMembers({
    groupId,
    sessionId,
    personIds,
    accountId: session.accountId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u503c\u65e5\u751f\u8a2d\u5b9a\u5df2\u66f4\u65b0\u3002");
}

export async function createGroupStudyReadingItemAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");
  const classCourseChapterId = readText(formData, "classCourseChapterId");
  const title = readText(formData, "title");
  const paperPage = readText(formData, "paperPage");
  const note = readText(formData, "note");

  if (!groupId || !sessionId) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u5c0e\u8b80\u9805\u76ee\u8cc7\u8a0a\u3002");
  }

  if (!classCourseChapterId && !title) {
    redirectWithMessage(
      returnTo,
      false,
      "\u672a\u6307\u5b9a\u7ae0\u7bc0\u6642\uff0c\u8acb\u81f3\u5c11\u586b\u5beb\u5c0e\u8b80\u6a19\u984c\u3002",
    );
  }

  const session = await requireManageAccess(groupId, returnTo);
  const result = await createGroupStudyReadingItem({
    groupId,
    sessionId,
    classCourseChapterId: classCourseChapterId || null,
    title,
    paperPage,
    note,
    accountId: session.accountId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u5c0e\u8b80\u9805\u76ee\u5df2\u65b0\u589e\u3002");
}

export async function updateGroupStudyReadingItemAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");
  const readingItemId = readText(formData, "readingItemId");
  const classCourseChapterId = readText(formData, "classCourseChapterId");
  const title = readText(formData, "title");
  const paperPage = readText(formData, "paperPage");
  const note = readText(formData, "note");

  if (!groupId || !sessionId || !readingItemId) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u5c0e\u8b80\u9805\u76ee\u8b58\u5225\u8cc7\u8a0a\u3002");
  }

  if (!classCourseChapterId && !title) {
    redirectWithMessage(
      returnTo,
      false,
      "\u672a\u6307\u5b9a\u7ae0\u7bc0\u6642\uff0c\u8acb\u81f3\u5c11\u586b\u5beb\u5c0e\u8b80\u6a19\u984c\u3002",
    );
  }

  const session = await requireManageAccess(groupId, returnTo);
  const result = await updateGroupStudyReadingItem({
    groupId,
    sessionId,
    readingItemId,
    classCourseChapterId: classCourseChapterId || null,
    title,
    paperPage,
    note,
    accountId: session.accountId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u5c0e\u8b80\u9805\u76ee\u5df2\u66f4\u65b0\u3002");
}

export async function deleteGroupStudyReadingItemAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const readingItemId = readText(formData, "readingItemId");

  if (!groupId || !readingItemId) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u5c0e\u8b80\u9805\u76ee\u8b58\u5225\u8cc7\u8a0a\u3002");
  }

  await requireManageAccess(groupId, returnTo);
  const result = await deleteGroupStudyReadingItem({ groupId, readingItemId });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(returnTo, true, "\u5c0e\u8b80\u9805\u76ee\u5df2\u522a\u9664\u3002");
}

export async function moveGroupStudyReadingItemAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const sessionId = readText(formData, "sessionId");
  const readingItemId = readText(formData, "readingItemId");
  const direction = readDirection(formData);

  if (!groupId || !sessionId || !readingItemId || !direction) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u6392\u5e8f\u8abf\u6574\u8cc7\u8a0a\u3002");
  }

  const session = await requireManageAccess(groupId, returnTo);
  const result = await moveGroupStudyReadingItem({
    groupId,
    sessionId,
    readingItemId,
    direction,
    accountId: session.accountId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(
    returnTo,
    true,
    direction === "up"
      ? "\u5c0e\u8b80\u9805\u76ee\u5df2\u4e0a\u79fb\u3002"
      : "\u5c0e\u8b80\u9805\u76ee\u5df2\u4e0b\u79fb\u3002",
  );
}

export async function setGroupStudyReadingAssignmentAction(formData: FormData) {
  const groupId = readText(formData, "groupId");
  const returnTo = readReturnTo(formData) ?? defaultReturnPath(groupId);
  const readingItemId = readText(formData, "readingItemId");
  const personId = readText(formData, "personId");
  const isCoachLed = readBoolean(formData, "isCoachLed");
  const note = readText(formData, "note");

  if (!groupId || !readingItemId) {
    redirectWithMessage(returnTo, false, "\u7f3a\u5c11\u5c0e\u8b80\u5206\u914d\u8b58\u5225\u8cc7\u8a0a\u3002");
  }

  const session = await requireManageAccess(groupId, returnTo);
  const result = await setGroupStudyReadingAssignment({
    groupId,
    readingItemId,
    personId,
    isCoachLed,
    note,
    accountId: session.accountId,
  });

  revalidateGroupStudyPaths(groupId);
  if (!result.ok) redirectWithMessage(returnTo, false, result.message);
  redirectWithMessage(
    returnTo,
    true,
    isCoachLed
      ? "\u5c0e\u8b80\u5206\u914d\u5df2\u8a2d\u70ba\u6559\u7df4\u4ee3\u8b80\u3002"
      : personId
      ? "\u5c0e\u8b80\u5206\u914d\u5df2\u66f4\u65b0\u3002"
      : "\u5c0e\u8b80\u5206\u914d\u5df2\u6e05\u9664\u3002",
  );
}
