"use client";

import { ArrowDown, ArrowUp, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FormModalTrigger } from "@/components/form-modal-trigger";
import type {
  GroupStudyReadingAssignmentRow,
  GroupStudyReadingItemRow,
  GroupStudySessionDutyMemberRow,
  GroupStudySessionMode,
  GroupStudySessionRow,
} from "@/lib/types";

type ActionHandler = (formData: FormData) => void | Promise<void>;
type MemberOption = { id: string; label: string };
type ChapterOption = { id: string; label: string };

type Props = {
  groupId: string;
  returnTo: string;
  canManage: boolean;
  sessions: GroupStudySessionRow[];
  dutyMembers: GroupStudySessionDutyMemberRow[];
  readingItems: GroupStudyReadingItemRow[];
  readingAssignments: GroupStudyReadingAssignmentRow[];
  memberOptions: MemberOption[];
  chapterOptions: ChapterOption[];
  onCreateSessionAction: ActionHandler;
  onUpdateSessionAction: ActionHandler;
  onDeleteSessionAction: ActionHandler;
  onMoveSessionAction: ActionHandler;
  onReplaceDutyMembersAction: ActionHandler;
  onCreateReadingItemAction: ActionHandler;
  onUpdateReadingItemAction: ActionHandler;
  onDeleteReadingItemAction: ActionHandler;
  onMoveReadingItemAction: ActionHandler;
  onSetReadingAssignmentAction: ActionHandler;
};

const TEXT = {
  title: "\u8b80\u66f8\u6703\u6d3b\u52d5\u8207\u5c0e\u8b80\u5206\u914d",
  subtitle:
    "\u7dad\u8b77\u8b80\u66f8\u6703\u6d3b\u52d5\u3001\u503c\u65e5\u751f\u8207\u5c0e\u8b80\u9805\u76ee\u3002",
  empty: "\u5c1a\u672a\u5efa\u7acb\u8b80\u66f8\u6703\u6d3b\u52d5\u3002",
};

function sortByOrder<T extends { sort_order: number; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

function moveButtonClassName(): string {
  return "inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white p-0 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";
}

function iconButtonClassName(kind: "edit" | "delete"): string {
  if (kind === "delete") {
    return "rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100";
  }
  return "rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100";
}

function formatDate(dateInput: string | null): string {
  if (!dateInput) return "\u672a\u8a2d\u5b9a";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("zh-TW");
}

function formatTime(timeInput: string | null): string {
  if (!timeInput) return "--:--";
  const [hour = "00", minute = "00"] = timeInput.split(":");
  return `${hour}:${minute}`;
}

function clean(value: string): string {
  return value.trim() ? value : "";
}

function buildGoogleMapEmbedUrl(mapUrl: string, fallbackQuery: string): string | null {
  const normalizedFallback = fallbackQuery.trim();
  const fallback = normalizedFallback
    ? `https://www.google.com/maps?q=${encodeURIComponent(normalizedFallback)}&output=embed`
    : null;
  const trimmed = mapUrl.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed);
    const query = parsed.searchParams.get("q") || parsed.searchParams.get("query");
    if (query?.trim()) {
      return `https://www.google.com/maps?q=${encodeURIComponent(query.trim())}&output=embed`;
    }

    const placeId = parsed.searchParams.get("query_place_id");
    if (placeId?.trim()) {
      return `https://www.google.com/maps?output=embed&query_place_id=${encodeURIComponent(placeId.trim())}`;
    }

    const atMatch = parsed.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      return `https://www.google.com/maps?q=${encodeURIComponent(`${atMatch[1]},${atMatch[2]}`)}&output=embed`;
    }

    const placeMatch = parsed.pathname.match(/\/place\/([^/]+)/);
    if (placeMatch?.[1]) {
      const place = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
      return `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function GroupStudyManagementPanel({
  groupId,
  returnTo,
  canManage,
  sessions,
  dutyMembers,
  readingItems,
  readingAssignments,
  memberOptions,
  chapterOptions,
  onCreateSessionAction,
  onUpdateSessionAction,
  onDeleteSessionAction,
  onMoveSessionAction,
  onReplaceDutyMembersAction,
  onCreateReadingItemAction,
  onUpdateReadingItemAction,
  onDeleteReadingItemAction,
  onMoveReadingItemAction,
  onSetReadingAssignmentAction,
}: Props) {
  const [createMode, setCreateMode] = useState<GroupStudySessionMode>("offline");
  const orderedSessions = useMemo(() => sortByOrder(sessions), [sessions]);
  const orderedDutyMembers = useMemo(() => sortByOrder(dutyMembers), [dutyMembers]);
  const orderedReadingItems = useMemo(() => sortByOrder(readingItems), [readingItems]);

  const dutyBySession = useMemo(() => {
    const map = new Map<string, GroupStudySessionDutyMemberRow[]>();
    for (const row of orderedDutyMembers) {
      const list = map.get(row.session_id) ?? [];
      list.push(row);
      map.set(row.session_id, list);
    }
    return map;
  }, [orderedDutyMembers]);

  const readingBySession = useMemo(() => {
    const map = new Map<string, GroupStudyReadingItemRow[]>();
    for (const row of orderedReadingItems) {
      const list = map.get(row.session_id) ?? [];
      list.push(row);
      map.set(row.session_id, list);
    }
    return map;
  }, [orderedReadingItems]);

  const assignmentByItem = useMemo(
    () => new Map(readingAssignments.map((row) => [row.reading_item_id, row])),
    [readingAssignments],
  );

  const labelByMemberId = useMemo(
    () => new Map(memberOptions.map((member) => [member.id, member.label])),
    [memberOptions],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{TEXT.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{TEXT.subtitle}</p>
        </div>
        {canManage && (
          <FormModalTrigger
            buttonLabel={"\u65b0\u589e\u8b80\u66f8\u6703\u6d3b\u52d5"}
            modalTitle={"\u65b0\u589e\u8b80\u66f8\u6703\u6d3b\u52d5"}
            submitLabel={"\u65b0\u589e\u6d3b\u52d5"}
            action={onCreateSessionAction}
            formClassName="space-y-3"
          >
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{"\u6d3b\u52d5\u6a19\u984c *"}</span>
              <input name="title" required />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{"\u65e5\u671f"}</span>
                <input type="date" name="sessionDate" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{"\u958b\u59cb\u6642\u9593"}</span>
                <input type="time" name="startTime" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{"\u7d50\u675f\u6642\u9593"}</span>
                <input type="time" name="endTime" />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{"\u8209\u8fa6\u5f62\u5f0f"}</span>
              <select
                name="mode"
                value={createMode}
                onChange={(event) =>
                  setCreateMode(event.currentTarget.value === "online" ? "online" : "offline")
                }
              >
                <option value="offline">{"\u5be6\u9ad4"}</option>
                <option value="online">{"\u7dda\u4e0a"}</option>
              </select>
            </label>
            {createMode === "offline" ? (
              <>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    {"\u5730\u9ede\uff08\u5be6\u9ad4\uff09"}
                  </span>
                  <input name="locationAddress" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">{"Google Map \u9023\u7d50"}</span>
                  <input name="mapUrl" type="url" />
                </label>
              </>
            ) : (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{"\u7dda\u4e0a\u6703\u8b70\u9023\u7d50"}</span>
                <input name="onlineMeetingUrl" type="url" />
              </label>
            )}
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{"\u6ce8\u610f\u4e8b\u9805"}</span>
              <textarea name="note" rows={3} />
            </label>
          </FormModalTrigger>
        )}
      </div>
      {!orderedSessions.length ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {TEXT.empty}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orderedSessions.map((session, sessionIndex) => {
            const dutyRows = dutyBySession.get(session.id) ?? [];
            const itemRows = readingBySession.get(session.id) ?? [];
            const dutyAssignedIds = new Set(
              dutyRows
                .map((row) => row.person_id?.trim())
                .filter((personId): personId is string => Boolean(personId)),
            );
            const readingAssignedIds = new Set(
              itemRows
                .map((item) => assignmentByItem.get(item.id)?.person_id?.trim())
                .filter((personId): personId is string => Boolean(personId)),
            );
            const dutyText = dutyRows
              .map((row) => row.person?.display_name || row.person?.full_name || "")
              .filter(Boolean)
              .join("\u3001");
            const onlineMeetingUrl = clean(session.online_meeting_url);
            const mapUrl = clean(session.map_url);
            const offlineLocation = clean(session.location_address) || "\u672a\u8a2d\u5b9a";
            const mapPreviewUrl =
              session.mode === "offline" && mapUrl
                ? buildGoogleMapEmbedUrl(mapUrl, offlineLocation)
                : null;

            return (
              <article key={session.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <div className="flex items-start gap-3">
                  {canManage && (
                    <div className="mt-0.5 flex shrink-0 flex-col gap-1">
                      <form action={onMoveSessionAction}>
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input type="hidden" name="direction" value="up" />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className={moveButtonClassName()} disabled={sessionIndex === 0} title={"\u4e0a\u79fb"}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                      </form>
                      <form action={onMoveSessionAction}>
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input type="hidden" name="direction" value="down" />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button
                          className={moveButtonClassName()}
                          disabled={sessionIndex === orderedSessions.length - 1}
                          title={"\u4e0b\u79fb"}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-700">{`\u6d3b\u52d5 ${sessionIndex + 1}`}</p>
                    {session.mode === "online" && onlineMeetingUrl ? (
                      <a
                        href={onlineMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-lg font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2"
                      >
                        {session.title}
                      </a>
                    ) : (
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{session.title}</h3>
                    )}
                    <p className="mt-1 text-sm text-slate-700">{`\u65e5\u671f\uff1a${formatDate(session.session_date)} / \u6642\u9593\uff1a${formatTime(session.start_time)} - ${formatTime(session.end_time)}`}</p>
                    <p className="mt-1 text-sm text-slate-700">{`\u5f62\u5f0f\uff1a${session.mode === "online" ? "\u7dda\u4e0a" : "\u5be6\u9ad4"}`}</p>
                    {session.mode === "offline" ? (
                      <p className="mt-1 text-sm text-slate-700">
                        {"\u5730\u9ede\uff1a"}
                        {mapUrl ? (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 inline-flex items-center gap-1 text-blue-700 underline decoration-blue-300 underline-offset-2"
                          >
                            <span>{offlineLocation}</span>
                            <MapPin className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="ml-1">{offlineLocation}</span>
                        )}
                      </p>
                    ) : null}
                    {mapPreviewUrl ? (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <iframe
                          title={`${session.title} \u5730\u5716\u9810\u89bd`}
                          src={mapPreviewUrl}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="h-44 w-full border-0"
                        />
                      </div>
                    ) : null}
                    {clean(session.note) ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{session.note}</p> : null}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-start gap-2">
                      <SessionEditModal groupId={groupId} returnTo={returnTo} session={session} onAction={onUpdateSessionAction} />
                      <form action={onDeleteSessionAction}>
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className={iconButtonClassName("delete")} title={"\u522a\u9664\u6d3b\u52d5"}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{"\u503c\u65e5\u751f"}</h4>
                    </div>
                    {canManage ? (
                      <div className="mt-2 space-y-2">
                        {dutyRows.map((dutyRow) => {
                          const currentPersonId = dutyRow.person_id?.trim() || "";
                          const otherDutyIds = dutyRows
                            .map((row) => row.person_id?.trim() || "")
                            .filter((personId) => personId && personId !== currentPersonId);
                          const availableOptions = memberOptions.filter((member) => {
                            if (member.id === currentPersonId) return true;
                            if (otherDutyIds.includes(member.id)) return false;
                            if (readingAssignedIds.has(member.id)) return false;
                            return true;
                          });

                          return (
                            <form key={dutyRow.id} action={onReplaceDutyMembersAction}>
                              <input type="hidden" name="groupId" value={groupId} />
                              <input type="hidden" name="sessionId" value={session.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              {otherDutyIds.map((personId) => (
                                <input key={`${dutyRow.id}:${personId}`} type="hidden" name="personIds" value={personId} />
                              ))}
                              <select
                                name="personIds"
                                defaultValue={currentPersonId}
                                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                                className="w-full"
                              >
                                <option value="">
                                  {"\u672a\u6307\u5b9a"}
                                </option>
                                {availableOptions.map((member) => (
                                  <option key={`${dutyRow.id}:${member.id}`} value={member.id}>
                                    {member.label}
                                  </option>
                                ))}
                              </select>
                            </form>
                          );
                        })}
                        {(() => {
                          const addableOptions = memberOptions.filter((member) => {
                            if (dutyAssignedIds.has(member.id)) return false;
                            if (readingAssignedIds.has(member.id)) return false;
                            return true;
                          });
                          const existingDutyIds = dutyRows
                            .map((row) => row.person_id?.trim() || "")
                            .filter(Boolean);

                          return (
                            <form action={onReplaceDutyMembersAction}>
                              <input type="hidden" name="groupId" value={groupId} />
                              <input type="hidden" name="sessionId" value={session.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              {existingDutyIds.map((personId) => (
                                <input key={`${session.id}:existing:${personId}`} type="hidden" name="personIds" value={personId} />
                              ))}
                              <select
                                name="personIds"
                                defaultValue=""
                                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                                className="w-full"
                                disabled={!addableOptions.length}
                              >
                                <option value="">
                                  {addableOptions.length
                                    ? "\u672a\u6307\u5b9a"
                                    : "\u7121\u53ef\u6307\u6d3e\u5b78\u54e1"}
                                </option>
                                {addableOptions.map((member) => (
                                  <option key={`${session.id}:add:${member.id}`} value={member.id}>
                                    {member.label}
                                  </option>
                                ))}
                              </select>
                            </form>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-slate-700">{dutyText || "\u5c1a\u672a\u8a2d\u5b9a\u503c\u65e5\u751f"}</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{"\u5c0e\u8b80\u9805\u76ee"}</h4>
                      {canManage && (
                        <ReadingCreateModal
                          groupId={groupId}
                          returnTo={returnTo}
                          sessionId={session.id}
                          chapterOptions={chapterOptions}
                          onAction={onCreateReadingItemAction}
                        />
                      )}
                    </div>
                    {!itemRows.length ? (
                      <p className="mt-3 text-sm text-slate-500">{"\u5c1a\u7121\u5c0e\u8b80\u9805\u76ee\u3002"}</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {itemRows.map((item, itemIndex) => {
                          const assignment = assignmentByItem.get(item.id);
                          const assignedLabel =
                            assignment?.person_id && labelByMemberId.has(assignment.person_id)
                              ? labelByMemberId.get(assignment.person_id)
                              : "\u672a\u6307\u6d3e";
                          return (
                            <div key={item.id} className="grid gap-2 rounded-md border border-slate-200 p-2 md:grid-cols-[auto_minmax(0,1fr)_220px_auto]">
                              <div className="flex items-center gap-1">
                                {canManage && (
                                  <>
                                    <form action={onMoveReadingItemAction}>
                                      <input type="hidden" name="groupId" value={groupId} />
                                      <input type="hidden" name="sessionId" value={session.id} />
                                      <input type="hidden" name="readingItemId" value={item.id} />
                                      <input type="hidden" name="direction" value="up" />
                                      <input type="hidden" name="returnTo" value={returnTo} />
                                      <button className={moveButtonClassName()} disabled={itemIndex === 0} title={"\u4e0a\u79fb"}>
                                        <ArrowUp className="h-3.5 w-3.5" />
                                      </button>
                                    </form>
                                    <form action={onMoveReadingItemAction}>
                                      <input type="hidden" name="groupId" value={groupId} />
                                      <input type="hidden" name="sessionId" value={session.id} />
                                      <input type="hidden" name="readingItemId" value={item.id} />
                                      <input type="hidden" name="direction" value="down" />
                                      <input type="hidden" name="returnTo" value={returnTo} />
                                      <button className={moveButtonClassName()} disabled={itemIndex === itemRows.length - 1} title={"\u4e0b\u79fb"}>
                                        <ArrowDown className="h-3.5 w-3.5" />
                                      </button>
                                    </form>
                                  </>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900">{item.title || "\u672a\u547d\u540d\u9805\u76ee"}</p>
                                <p className="text-xs text-slate-500">{item.paper_page || "\u672a\u8a2d\u5b9a\u9801\u78bc"}</p>
                                {clean(item.note) ? <p className="mt-1 text-xs text-slate-500">{item.note}</p> : null}
                              </div>
                              {canManage ? (
                                <form action={onSetReadingAssignmentAction}>
                                  <input type="hidden" name="groupId" value={groupId} />
                                  <input type="hidden" name="readingItemId" value={item.id} />
                                  <input type="hidden" name="returnTo" value={returnTo} />
                                  <input type="hidden" name="note" value={assignment?.note ?? ""} />
                                  <select name="personId" defaultValue={assignment?.person_id ?? ""} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
                                    <option value="">{"\u672a\u6307\u6d3e"}</option>
                                    {memberOptions.map((member) => (
                                      <option key={`${item.id}:${member.id}`} value={member.id}>{member.label}</option>
                                    ))}
                                  </select>
                                </form>
                              ) : (
                                <p className="text-sm text-slate-700">{assignedLabel}</p>
                              )}
                              {canManage && (
                                <div className="flex items-center gap-2">
                                  <ReadingEditModal
                                    groupId={groupId}
                                    returnTo={returnTo}
                                    sessionId={session.id}
                                    item={item}
                                    chapterOptions={chapterOptions}
                                    onAction={onUpdateReadingItemAction}
                                  />
                                  <form action={onDeleteReadingItemAction}>
                                    <input type="hidden" name="groupId" value={groupId} />
                                    <input type="hidden" name="readingItemId" value={item.id} />
                                    <input type="hidden" name="returnTo" value={returnTo} />
                                    <button className={iconButtonClassName("delete")} title={"\u522a\u9664\u5c0e\u8b80\u9805\u76ee"}>
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SessionEditModal({
  groupId,
  returnTo,
  session,
  onAction,
}: {
  groupId: string;
  returnTo: string;
  session: GroupStudySessionRow;
  onAction: ActionHandler;
}) {
  const [mode, setMode] = useState<GroupStudySessionMode>(session.mode);

  return (
    <FormModalTrigger
      buttonLabel={"\u7de8\u8f2f\u6d3b\u52d5"}
      modalTitle={"\u7de8\u8f2f\u8b80\u66f8\u6703\u6d3b\u52d5"}
      submitLabel={"\u5132\u5b58\u8b8a\u66f4"}
      action={onAction}
      triggerClassName={iconButtonClassName("edit")}
      triggerContent={<Pencil className="h-4 w-4" />}
      formClassName="space-y-3"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="sessionId" value={session.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u6d3b\u52d5\u6a19\u984c *"}</span>
        <input name="title" required defaultValue={session.title} />
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">{"\u65e5\u671f"}</span>
          <input type="date" name="sessionDate" defaultValue={session.session_date ?? ""} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">{"\u958b\u59cb\u6642\u9593"}</span>
          <input type="time" name="startTime" defaultValue={session.start_time ?? ""} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">{"\u7d50\u675f\u6642\u9593"}</span>
          <input type="time" name="endTime" defaultValue={session.end_time ?? ""} />
        </label>
      </div>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u8209\u8fa6\u5f62\u5f0f"}</span>
        <select
          name="mode"
          value={mode}
          onChange={(event) =>
            setMode(event.currentTarget.value === "online" ? "online" : "offline")
          }
        >
          <option value="offline">{"\u5be6\u9ad4"}</option>
          <option value="online">{"\u7dda\u4e0a"}</option>
        </select>
      </label>
      {mode === "offline" ? (
        <>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">{"\u5730\u9ede\uff08\u5be6\u9ad4\uff09"}</span>
            <input name="locationAddress" defaultValue={session.location_address} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">{"Google Map \u9023\u7d50"}</span>
            <input name="mapUrl" type="url" defaultValue={session.map_url} />
          </label>
        </>
      ) : (
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">{"\u7dda\u4e0a\u6703\u8b70\u9023\u7d50"}</span>
          <input name="onlineMeetingUrl" type="url" defaultValue={session.online_meeting_url} />
        </label>
      )}
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u6ce8\u610f\u4e8b\u9805"}</span>
        <textarea name="note" rows={3} defaultValue={session.note} />
      </label>
    </FormModalTrigger>
  );
}

function ReadingCreateModal({
  groupId,
  returnTo,
  sessionId,
  chapterOptions,
  onAction,
}: {
  groupId: string;
  returnTo: string;
  sessionId: string;
  chapterOptions: ChapterOption[];
  onAction: ActionHandler;
}) {
  return (
    <FormModalTrigger
      buttonLabel={"\u65b0\u589e\u5c0e\u8b80\u9805\u76ee"}
      modalTitle={"\u65b0\u589e\u5c0e\u8b80\u9805\u76ee"}
      submitLabel={"\u65b0\u589e\u9805\u76ee"}
      action={onAction}
      triggerClassName="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-800"
      triggerContent={
        <>
          <Plus className="h-3.5 w-3.5" />
          {"\u65b0\u589e"}
        </>
      }
      formClassName="space-y-3"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u5c0e\u8b80\u7ae0\u7bc0\uff08\u8ab2\u7a0b\u8868\uff09"}</span>
        <select name="classCourseChapterId" defaultValue="">
          <option value="">{"\u4e0d\u6307\u5b9a\u7ae0\u7bc0\uff08\u624b\u52d5\u8f38\u5165\uff09"}</option>
          {chapterOptions.map((option) => (
            <option key={`${sessionId}:${option.id}`} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u5c0e\u8b80\u6a19\u984c"}</span>
        <input name="title" />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u7d19\u672c\u9801\u78bc"}</span>
        <input name="paperPage" />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u5099\u8a3b"}</span>
        <input name="note" />
      </label>
    </FormModalTrigger>
  );
}

function ReadingEditModal({
  groupId,
  returnTo,
  sessionId,
  item,
  chapterOptions,
  onAction,
}: {
  groupId: string;
  returnTo: string;
  sessionId: string;
  item: GroupStudyReadingItemRow;
  chapterOptions: ChapterOption[];
  onAction: ActionHandler;
}) {
  return (
    <FormModalTrigger
      buttonLabel={"\u7de8\u8f2f\u5c0e\u8b80\u9805\u76ee"}
      modalTitle={"\u7de8\u8f2f\u5c0e\u8b80\u9805\u76ee"}
      submitLabel={"\u5132\u5b58\u8b8a\u66f4"}
      action={onAction}
      triggerClassName={iconButtonClassName("edit")}
      triggerContent={<Pencil className="h-4 w-4" />}
      formClassName="space-y-3"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="readingItemId" value={item.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u5c0e\u8b80\u7ae0\u7bc0\uff08\u8ab2\u7a0b\u8868\uff09"}</span>
        <select name="classCourseChapterId" defaultValue={item.class_course_chapter_id ?? ""}>
          <option value="">{"\u4e0d\u6307\u5b9a\u7ae0\u7bc0\uff08\u624b\u52d5\u8f38\u5165\uff09"}</option>
          {chapterOptions.map((option) => (
            <option key={`${item.id}:${option.id}`} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u5c0e\u8b80\u6a19\u984c"}</span>
        <input name="title" defaultValue={item.title} />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u7d19\u672c\u9801\u78bc"}</span>
        <input name="paperPage" defaultValue={item.paper_page} />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">{"\u5099\u8a3b"}</span>
        <input name="note" defaultValue={item.note} />
      </label>
    </FormModalTrigger>
  );
}
