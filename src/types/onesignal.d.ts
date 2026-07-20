type OneSignalWeb = {
  init: (options: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    serviceWorkerPath?: string;
    serviceWorkerParam?: { scope: string };
  }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<boolean>;
  };
  Slidedown?: {
    promptPush: (options?: { force?: boolean }) => Promise<void>;
  };
};

interface Window {
  OneSignalDeferred?: Array<(oneSignal: OneSignalWeb) => void | Promise<void>>;
}
