import { NextResponse } from "next/server";
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

  const notifications = await getUserNotifications(user.id, 15);
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
