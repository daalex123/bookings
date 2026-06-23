import { NextResponse } from "next/server";
import { getActiveBusinessContext } from "@/lib/business-context";
import { getUserNotifications } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeBusiness = await getActiveBusinessContext();
  const notifications = await getUserNotifications(user.id, {
    businessId: activeBusiness?.businessId,
    customerOnly: Boolean(activeBusiness),
    limit: 15,
  });
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return NextResponse.json(
    { notifications, unreadCount },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
