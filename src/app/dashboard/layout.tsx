import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/dashboard/admin-shell";
import {
  ADMIN_MANIFEST_PATH,
  ADMIN_PWA_DESCRIPTION,
  ADMIN_PWA_NAME,
  ADMIN_PWA_SHORT_NAME,
  ADMIN_PWA_THEME_COLOR,
} from "@/lib/pwa/constants";

export const metadata: Metadata = {
  title: `${ADMIN_PWA_NAME} — Business Dashboard`,
  description: ADMIN_PWA_DESCRIPTION,
  applicationName: ADMIN_PWA_NAME,
  manifest: ADMIN_MANIFEST_PATH,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: ADMIN_PWA_SHORT_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: ADMIN_PWA_THEME_COLOR,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
