import { randomInt } from "node:crypto";
import { z } from "zod";
import { getZoomConfig, IRAN_TIME_ZONE } from "./config";

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_URL = "https://api.zoom.us/v2";
const REQUEST_TIMEOUT_MS = 15_000;

export type ZoomMeetingInput = {
  topic: string;
  startAt: Date;
  durationMinutes: number;
  agenda?: string;
  timeZone?: typeof IRAN_TIME_ZONE;
};

export type ZoomMeeting = {
  id: string;
  meetingId: string;
  meetingUuid?: string;
  joinUrl: string;
  startUrl?: string;
  passcode?: string;
  provider: "zoom" | "mock";
};

export class ZoomApiError extends Error {
  constructor(
    message: string,
    readonly operation: "oauth" | "create" | "delete",
    readonly status?: number,
  ) {
    super(message);
    this.name = "ZoomApiError";
  }
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive().default(3600),
});

const meetingResponseSchema = z.object({
  id: z.union([z.number(), z.string()]),
  uuid: z.string().optional(),
  join_url: z.string().url(),
  start_url: z.string().url().optional(),
  password: z.string().optional(),
});

let tokenCache:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | undefined;

function validateMeetingInput(input: ZoomMeetingInput) {
  if (!input.topic.trim() || input.topic.length > 200) {
    throw new RangeError("Zoom meeting topic must contain 1 to 200 characters.");
  }
  if (Number.isNaN(input.startAt.getTime())) {
    throw new RangeError("Zoom meeting start time is invalid.");
  }
  if (
    !Number.isSafeInteger(input.durationMinutes) ||
    input.durationMinutes < 1 ||
    input.durationMinutes > 480
  ) {
    throw new RangeError("Zoom meeting duration must be between 1 and 480 minutes.");
  }
}

export function isZoomConfigured() {
  try {
    const config = getZoomConfig();
    return (
      config.mode === "mock" ||
      Boolean(config.accountId && config.clientId && config.clientSecret)
    );
  } catch {
    return false;
  }
}

async function zoomAccessToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    tokenCache &&
    tokenCache.expiresAt > Date.now() + 30_000
  ) {
    return tokenCache.accessToken;
  }

  const config = getZoomConfig();
  if (
    config.mode !== "zoom" ||
    !config.accountId ||
    !config.clientId ||
    !config.clientSecret
  ) {
    throw new ZoomApiError(
      "Zoom Server-to-Server OAuth is not configured.",
      "oauth",
    );
  }

  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
    "utf8",
  ).toString("base64");
  const response = await fetch(ZOOM_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: config.accountId,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new ZoomApiError(
      `Zoom OAuth failed with status ${response.status}.`,
      "oauth",
      response.status,
    );
  }

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ZoomApiError(
      "Zoom OAuth returned an invalid response.",
      "oauth",
      response.status,
    );
  }

  tokenCache = {
    accessToken: parsed.data.access_token,
    expiresAt: Date.now() + parsed.data.expires_in * 1_000,
  };
  return tokenCache.accessToken;
}

async function authenticatedZoomRequest(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  },
  retryAuthentication = true,
) {
  const accessToken = await zoomAccessToken(!retryAuthentication);
  const response = await fetch(`${ZOOM_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401 && retryAuthentication) {
    tokenCache = undefined;
    return authenticatedZoomRequest(path, init, false);
  }
  return response;
}

function mockMeeting(input: ZoomMeetingInput): ZoomMeeting {
  if (process.env.NODE_ENV === "production") {
    throw new ZoomApiError(
      "ZOOM_MODE=mock is not permitted in production.",
      "create",
    );
  }

  const randomMeetingId = String(
    randomInt(10_000_000_000, 99_999_999_999),
  );
  const id = `mock-${randomMeetingId}`;
  return {
    id,
    meetingId: id,
    joinUrl: `https://zoom.invalid/mock/${randomMeetingId}`,
    provider: "mock",
  };
}

export function createZoomMeeting(
  input: ZoomMeetingInput,
): Promise<ZoomMeeting>;
export function createZoomMeeting(
  memberName: string,
  startAt: Date,
): Promise<ZoomMeeting>;
export async function createZoomMeeting(
  inputOrMemberName: ZoomMeetingInput | string,
  legacyStartAt?: Date,
): Promise<ZoomMeeting> {
  const input: ZoomMeetingInput =
    typeof inputOrMemberName === "string"
      ? {
          topic: `TenXPros Office Hour | ${inputOrMemberName}`,
          startAt: legacyStartAt ?? new Date(Number.NaN),
          durationMinutes: 30,
          agenda: "جلسه اختصاصی سی دقیقه‌ای عضو TenXPros",
          timeZone: IRAN_TIME_ZONE,
        }
      : inputOrMemberName;

  validateMeetingInput(input);
  const config = getZoomConfig();
  if (config.mode === "mock") return mockMeeting(input);

  const response = await authenticatedZoomRequest(
    `/users/${encodeURIComponent(config.userId!)}/meetings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: input.topic.trim(),
        type: 2,
        start_time: input.startAt.toISOString(),
        duration: input.durationMinutes,
        timezone: input.timeZone ?? IRAN_TIME_ZONE,
        agenda: input.agenda?.trim() || undefined,
        settings: {
          waiting_room: true,
          join_before_host: false,
          mute_upon_entry: true,
          participant_video: false,
          host_video: true,
          approval_type: 2,
          auto_recording: "none",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new ZoomApiError(
      `Zoom meeting creation failed with status ${response.status}.`,
      "create",
      response.status,
    );
  }

  const parsed = meetingResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ZoomApiError(
      "Zoom did not return valid meeting details.",
      "create",
      response.status,
    );
  }

  const meetingId = String(parsed.data.id);
  return {
    id: meetingId,
    meetingId,
    meetingUuid: parsed.data.uuid,
    joinUrl: parsed.data.join_url,
    startUrl: parsed.data.start_url,
    passcode: parsed.data.password,
    provider: "zoom",
  };
}

export function createOfficeHourZoomMeeting(input: {
  memberName: string;
  startAt: Date;
}) {
  return createZoomMeeting({
    topic: `TenXPros Office Hour | ${input.memberName}`,
    startAt: input.startAt,
    durationMinutes: 30,
    agenda: "جلسه اختصاصی سی دقیقه‌ای عضو TenXPros",
    timeZone: IRAN_TIME_ZONE,
  });
}

export function createWeeklyGatheringZoomMeeting(input: {
  topic: string;
  startAt: Date;
  agenda?: string;
}) {
  return createZoomMeeting({
    topic: input.topic,
    startAt: input.startAt,
    durationMinutes: 90,
    agenda: input.agenda,
    timeZone: IRAN_TIME_ZONE,
  });
}

export async function deleteZoomMeeting(meetingId: string) {
  if (!meetingId.trim()) {
    throw new RangeError("A Zoom meeting ID is required.");
  }

  const config = getZoomConfig();
  if (config.mode === "mock") return;

  const response = await authenticatedZoomRequest(
    `/meetings/${encodeURIComponent(meetingId)}`,
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 404) {
    throw new ZoomApiError(
      `Zoom meeting deletion failed with status ${response.status}.`,
      "delete",
      response.status,
    );
  }
}

export function clearZoomTokenCache() {
  tokenCache = undefined;
}
