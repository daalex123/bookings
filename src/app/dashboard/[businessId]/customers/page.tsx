import Link from "next/link";
import { format } from "date-fns";
import { collectUniqueKeys, formatUniqueKey } from "@/lib/customer-unique-key";
import { asJoined } from "@/lib/utils";
import { UserAvatar } from "@/components/account/user-avatar";
import { PageHeader } from "@/components/dashboard/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `customer_id, start_at, status, custom_fields,
       profiles ( full_name, phone, avatar_url )`
    )
    .eq("business_id", businessId)
    .order("start_at", { ascending: false });

  const { data: business } = await supabase
    .from("businesses")
    .select("customer_unique_key_field, booking_custom_fields")
    .eq("id", businessId)
    .maybeSingle();

  const customerMap = new Map<
    string,
    {
      id: string;
      name: string;
      phone: string | null;
      avatarUrl: string | null;
      bookings: number;
      lastVisit: string;
      uniqueKeys: string[];
    }
  >();

  appointments?.forEach((appt) => {
    const profile = asJoined(appt.profiles);
    const existing = customerMap.get(appt.customer_id);
    if (existing) {
      existing.bookings += 1;
      if (appt.start_at > existing.lastVisit) {
        existing.lastVisit = appt.start_at;
      }
    } else {
      customerMap.set(appt.customer_id, {
        id: appt.customer_id,
        name: profile?.full_name ?? "Unknown",
        phone: profile?.phone ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        bookings: 1,
        lastVisit: appt.start_at,
        uniqueKeys: [],
      });
    }
    const keys = collectUniqueKeys(
      [appt],
      business?.customer_unique_key_field,
      business?.booking_custom_fields
    );
    const row = customerMap.get(appt.customer_id);
    if (row) {
      for (const key of keys) {
        const line = formatUniqueKey(key);
        if (line && !row.uniqueKeys.includes(line)) row.uniqueKeys.push(line);
      }
    }
  });

  const customers = Array.from(customerMap.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Open a customer to see their full job history."
      />

      {customers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/dashboard/${businessId}/customers/${customer.id}`}
              className="admin-card p-5 transition-colors hover:bg-[#f0f2f5]/50"
            >
              <div className="flex items-start gap-3">
                <UserAvatar name={customer.name} src={customer.avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1e2235]">
                    {customer.name}
                  </p>
                  <p className="text-sm text-[#8b92a5]">
                    {customer.phone || "No phone"} · {customer.bookings}{" "}
                    booking{customer.bookings !== 1 ? "s" : ""}
                  </p>
                  {customer.uniqueKeys.length > 0 && (
                    <p className="mt-1 truncate text-sm font-medium text-[#1e2235]">
                      {customer.uniqueKeys.join(" · ")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[#8b92a5]">
                    Last visit: {format(new Date(customer.lastVisit), "PPP")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="admin-card px-6 py-12 text-center text-sm text-[#8b92a5]">
          No customers yet. They will appear after the first booking.
        </div>
      )}
    </div>
  );
}
