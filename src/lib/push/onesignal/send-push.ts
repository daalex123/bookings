import {
  isOneSignalServerConfigured,
  ONESIGNAL_APP_ID,
} from "@/lib/push/onesignal/constants";

export type OneSignalPushPayload = {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
};

/** Send push to users linked via OneSignal.login(supabaseUserId). */
export async function sendOneSignalPush(
  payload: OneSignalPushPayload
): Promise<boolean> {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  const userIds = [...new Set(payload.userIds.filter(Boolean))];

  if (!isOneSignalServerConfigured() || !apiKey || userIds.length === 0) {
    return false;
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: userIds },
      target_channel: "push",
      headings: { en: payload.title },
      contents: { en: payload.body },
      url: payload.url,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(
      "[onesignal] Push failed:",
      response.status,
      text.slice(0, 300)
    );
    return false;
  }

  return true;
}
