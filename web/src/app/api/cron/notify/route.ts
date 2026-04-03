/**
 * Vercel Cron endpoint — triggered by vercel.json cron schedules.
 * Protected by CRON_SECRET header to prevent unauthorized calls.
 *
 * Supported ?type= values:
 *   tracking_due      — due-date reminders (run daily at ~08:00 UTC+8)
 *   study_1day        — T-1 day session reminders (run daily at ~18:00 UTC+8)
 *   study_2hour       — T-2 hour session reminders (run hourly)
 */
import { NextRequest, NextResponse } from "next/server";
import {
  checkTrackingDueDates,
  checkStudySessionReminders1Day,
  checkStudySessionReminders2Hour,
} from "@/lib/notifications";

export const runtime = "nodejs";
// Allow up to 60 seconds — notification runs may query many rows
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");

  try {
    let result;
    if (type === "tracking_due") {
      result = await checkTrackingDueDates();
    } else if (type === "study_1day") {
      result = await checkStudySessionReminders1Day();
    } else if (type === "study_2hour") {
      result = await checkStudySessionReminders2Hour();
    } else {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    console.log(`[cron/notify] type=${type}`, result);
    return NextResponse.json({ ok: true, type, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/notify] type=${type} error:`, message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
