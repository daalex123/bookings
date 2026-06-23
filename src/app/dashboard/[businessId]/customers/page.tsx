import { format } from "date-fns";
import { Users } from "lucide-react";
import { asJoined } from "@/lib/utils";
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
      `customer_id, start_at, status,
       profiles ( full_name, phone )`
    )
    .eq("business_id", businessId)
    .order("start_at", { ascending: false });

  const customerMap = new Map<
    string,
    {
      name: string;
      phone: string | null;
      bookings: number;
      lastVisit: string;
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
        name: profile?.full_name ?? "Unknown",
        phone: profile?.phone ?? null,
        bookings: 1,
        lastVisit: appt.start_at,
      });
    }
  });

  const customers = Array.from(customerMap.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customers who have booked with this business"
      />

      {customers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer, i) => (
            <div key={i} className="admin-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0f2f5] text-[#1e2235]">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1e2235]">
                    {customer.name}
                  </p>
                  <p className="text-sm text-[#8b92a5]">
                    {customer.phone || "No phone"} · {customer.bookings}{" "}
                    booking{customer.bookings !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-2 text-xs text-[#8b92a5]">
                    Last visit: {format(new Date(customer.lastVisit), "PPP")}
                  </p>
                </div>
              </div>
            </div>
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
