import {
  getCurrentUser,
  userCanAccessBusiness,
} from "@/lib/supabase/auth";
import { notFound, redirect } from "next/navigation";

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
