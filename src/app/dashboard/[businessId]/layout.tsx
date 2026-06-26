import {
  getCurrentUser,
  userCanAccessBusiness,
} from "@/lib/supabase/auth";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ADMIN_MANIFEST_PATH } from "@/lib/pwa/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessId: string }>;
}): Promise<Metadata> {
  const { businessId } = await params;
  return {
    manifest: `${ADMIN_MANIFEST_PATH}?business=${businessId}`,
  };
}

export default async function BusinessDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = await userCanAccessBusiness(user.id, businessId);
  if (!allowed) notFound();

  return <>{children}</>;
}
