/**
 * Zoom Server-to-Server OAuth integration.
 *
 * Uses client credentials grant — no per-user login required.
 * Required env vars: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 */

type ZoomTokenResponse = {
  access_token: string;
  expires_in: number;
};

type ZoomMeetingInput = {
  topic: string;
  /** ISO date string "YYYY-MM-DD" */
  startDate?: string | null;
  /** "HH:MM" 24-hour local time */
  startTime?: string | null;
  /** "HH:MM" 24-hour local time — used to calculate duration */
  endTime?: string | null;
  /** IANA timezone, e.g. "Asia/Taipei" */
  timezone?: string;
};

/** Returns duration in whole minutes between two "HH:MM" strings, or null if invalid. */
function calcDurationMinutes(start: string, end: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => isNaN(v))) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

export type ZoomMeetingResult =
  | { ok: true; joinUrl: string; meetingId: string }
  | { ok: false; error: string };

/** Fetch a short-lived access token via client credentials grant. */
async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials are not configured.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom token request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ZoomTokenResponse;
  return data.access_token;
}

/**
 * Create a Zoom meeting and return the join URL and meeting ID.
 * Falls back gracefully — never throws, returns { ok: false, error } on failure.
 */
export async function createZoomMeeting(input: ZoomMeetingInput): Promise<ZoomMeetingResult> {
  try {
    const token = await getZoomAccessToken();

    // Build start_time in Zoom's expected format: "YYYY-MM-DDThh:mm:ss"
    let startTimeIso: string | undefined;
    if (input.startDate && input.startTime) {
      startTimeIso = `${input.startDate}T${input.startTime}:00`;
    }

    const body = {
      topic: input.topic,
      type: startTimeIso ? 2 : 1, // 2 = scheduled, 1 = instant
      ...(startTimeIso && { start_time: startTimeIso }),
      ...((() => {
        const dur = input.startTime && input.endTime
          ? calcDurationMinutes(input.startTime, input.endTime)
          : null;
        return dur ? { duration: dur } : {};
      })()),
      timezone: input.timezone ?? "Asia/Taipei",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        waiting_room: false,
        auto_recording: "none",
      },
    };

    const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, error: `Zoom API error (${res.status}): ${errBody}` };
    }

    const data = (await res.json()) as { join_url: string; id: number };
    return {
      ok: true,
      joinUrl: data.join_url,
      meetingId: String(data.id),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
