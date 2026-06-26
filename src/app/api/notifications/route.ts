import { NextResponse } from "next/server";
import { getActiveBusinessContext } from "@/lib/business-context";
import {
  CUSTOMER_NOTIFICATION_AUDIENCE,
  getUserNotifications,
  STAFF_NOTIFICATION_AUDIENCE,
} from "@/lib/notifications/queries";
import type { NotificationAudience } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

function parseAudience(value: string | null): NotificationAudience {
  if (value === STAFF_NOTIFICATION_AUDIENCE) return STAFF_NOTIFICATION_AUDIENCE;
  return CUSTOMER_NOTIFICATION_AUDIENCE;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));
  const businessIdParam = searchParams.get("businessId");
  const activeBusiness = await getActiveBusinessContext();

  const businessId =
    businessIdParam ??
    (audience === CUSTOMER_NOTIFICATION_AUDIENCE
      ? activeBusiness?.businessId
      : undefined) ??
    undefined;

  const notifications = await getUserNotifications(user.id, {
    businessId,
    audience,
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
