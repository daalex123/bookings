/** OneSignal Web app ID — set in .env.local as NEXT_PUBLIC_ONESIGNAL_APP_ID */
export const ONESIGNAL_APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? "";

export const ONESIGNAL_SERVICE_WORKER_PATH = "/OneSignalSDKWorker.js";

export function isOneSignalConfigured(): boolean {
  return Boolean(ONESIGNAL_APP_ID);
}

export function isOneSignalServerConfigured(): boolean {
  return Boolean(
    ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY?.trim()
  );
}
