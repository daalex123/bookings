import { regenerateBookingToken, updateBusiness, updateBusinessHours } from "@/lib/actions";
import { adminDashboardUrl } from "@/lib/admin-url";
import { DAY_NAMES } from "@/lib/availability";
import {
  bookingPagePathByToken,
  bookingPublicUrl,
} from "@/lib/booking";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
} from "@/lib/constants";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { ActionForm } from "@/components/action-form";
import { ShareBookingCard } from "@/components/booking/share-booking-card";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { PageHeader } from "@/components/dashboard/page-header";
import { RegenerateLinkButton } from "@/components/dashboard/regenerate-link-button";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const [{ data: business }, { data: hours }, siteUrl] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single(),
    supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", businessId)
      .order("day_of_week"),
    getSiteUrl(),
  ]);

  const platformWhatsApp = process.env.WHATSAPP_PLATFORM_NUMBER;
  const hoursByDay = new Map(hours?.map((h) => [h.day_of_week, h]) ?? []);

  async function saveBusiness(formData: FormData) {
    "use server";
    return updateBusiness(businessId, formData);
  }

  async function saveHours(formData: FormData) {
    "use server";
    return updateBusinessHours(businessId, formData);
  }

  async function rotateBookingLink() {
    "use server";
    return regenerateBookingToken(businessId);
  }

  const slugUrl = business?.slug ? bookingPublicUrl(business.slug, siteUrl) : "";
  const secureUrl = business?.booking_token
    ? absoluteUrl(siteUrl, bookingPagePathByToken(business.booking_token))
    : "";
  const adminAppUrl = adminDashboardUrl(businessId, siteUrl);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Settings"
        description="Business profile, branding, and working hours"
      />

      <ShareBookingCard
        url={adminAppUrl}
        title="Admin mobile app QR code"
        description="Print or share this QR so team members can open the admin dashboard on mobile. All features — appointments, services, customers, and settings — are available."
        downloadFileName="admin-app-qr.png"
        variant="dark"
      />

      {slugUrl && (
        <ShareBookingCard
          url={slugUrl}
          title="Customer booking QR code"
          description="Print this QR code or share it so customers can open your booking page instantly."
          variant="dark"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Customer booking links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label>Friendly link (slug)</Label>
            <p className="text-sm text-zinc-600">
              Easy to share: <code>/b/your-slug</code>
            </p>
            <Input readOnly value={slugUrl} className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Private secure link</Label>
            <p className="text-sm text-zinc-600">
              Unguessable token — use when you need a private link. Regenerating
              invalidates the old secure link only (slug link stays the same).
            </p>
            <Input readOnly value={secureUrl} className="font-mono text-xs" />
          </div>
          <RegenerateLinkButton action={rotateBookingLink} />
          <p className="text-xs text-zinc-500">
            Regenerating invalidates the old link immediately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact &amp; notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={saveBusiness}
            messages={{
              loading: "Saving notification settings…",
              success: "Notification settings saved",
              error: "Could not save notification settings",
            }}
            className="space-y-4 max-w-lg"
          >
            <div className="space-y-2">
              <Label htmlFor="contact_email">Business email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={business?.contact_email ?? ""}
                placeholder="bookings@yourbusiness.com"
                required
              />
              <p className="text-xs text-zinc-500">
                Main inbox for new booking alerts and customer communication.
                In-app notifications still go to your team dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_whatsapp">Business WhatsApp</Label>
              <Input
                id="contact_whatsapp"
                name="contact_whatsapp"
                type="tel"
                defaultValue={business?.contact_whatsapp ?? ""}
                placeholder="0771234567 or +94771234567"
              />
              <p className="text-xs text-zinc-500">
                WhatsApp sends Meta&apos;s pre-approved <code>hello_world</code>{" "}
                template on each booking event — no 24-hour window required.
                {process.env.WHATSAPP_HELLO_WORLD_SEND_DETAILS !== "false" ? (
                  <>
                    {" "}
                    A second plain-text message with full booking details is also
                    sent; that one follows Meta&apos;s 24-hour rule
                    {platformWhatsApp ? (
                      <>
                        {" "}
                        (message <strong>{platformWhatsApp}</strong> first)
                      </>
                    ) : null}
                    .
                  </>
                ) : (
                  " Open your dashboard for booking details."
                )}
              </p>
            </div>
            <input type="hidden" name="name" value={business?.name ?? ""} />
            <input type="hidden" name="slug" value={business?.slug ?? ""} />
            <input
              type="hidden"
              name="description"
              value={business?.description ?? ""}
            />
            <input
              type="hidden"
              name="tagline"
              value={business?.tagline ?? ""}
            />
            <input
              type="hidden"
              name="timezone"
              value={business?.timezone ?? DEFAULT_TIMEZONE}
            />
            <input
              type="hidden"
              name="currency"
              value={business?.currency ?? DEFAULT_CURRENCY}
            />
            <input
              type="hidden"
              name="logo_url"
              value={business?.logo_url ?? ""}
            />
            <input
              type="hidden"
              name="cover_image_url"
              value={business?.cover_image_url ?? ""}
            />
            <input
              type="hidden"
              name="brand_color"
              value={business?.brand_color ?? "#f5c518"}
            />
            <SubmitButton pendingLabel="Saving…">
              Save notification settings
            </SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding &amp; page</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={saveBusiness}
            messages={{
              loading: "Saving branding…",
              success: "Branding saved",
              error: "Could not save branding",
            }}
            className="space-y-4 max-w-lg"
          >
            <input type="hidden" name="name" value={business?.name ?? ""} />
            <input type="hidden" name="slug" value={business?.slug ?? ""} />
            <input
              type="hidden"
              name="description"
              value={business?.description ?? ""}
            />
            <input
              type="hidden"
              name="timezone"
              value={business?.timezone ?? DEFAULT_TIMEZONE}
            />
            <input
              type="hidden"
              name="currency"
              value={business?.currency ?? DEFAULT_CURRENCY}
            />
            <input
              type="hidden"
              name="contact_email"
              value={business?.contact_email ?? ""}
            />
            <input
              type="hidden"
              name="contact_whatsapp"
              value={business?.contact_whatsapp ?? ""}
            />

            <ImageUploadField
              businessId={businessId}
              kind="logo"
              name="logo_url"
              label="Logo"
              defaultUrl={business?.logo_url ?? ""}
            />
            <ImageUploadField
              businessId={businessId}
              kind="cover"
              name="cover_image_url"
              label="Cover image (hero background)"
              defaultUrl={business?.cover_image_url ?? ""}
            />
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                defaultValue={business?.tagline ?? ""}
                placeholder="e.g. Premium cuts & styling"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_color">Brand accent color</Label>
              <div className="flex gap-3">
                <Input
                  id="brand_color"
                  name="brand_color"
                  type="color"
                  defaultValue={business?.brand_color ?? "#f5c518"}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  defaultValue={business?.brand_color ?? "#f5c518"}
                  readOnly
                  className="font-mono text-sm"
                  aria-hidden
                />
              </div>
            </div>
            <SubmitButton pendingLabel="Saving…">Save branding</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={saveBusiness}
            messages={{
              loading: "Saving profile…",
              success: "Business profile saved",
              error: "Could not save profile",
            }}
            className="space-y-4 max-w-lg"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={business?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Internal slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={business?.slug}
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-zinc-500">
                For your reference only — customers use the booking link above.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={business?.description ?? ""}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                defaultValue={business?.tagline ?? ""}
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <AdminSelect
                  id="currency"
                  name="currency"
                  defaultValue={business?.currency ?? DEFAULT_CURRENCY}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <AdminSelect
                  id="timezone"
                  name="timezone"
                  defaultValue={business?.timezone ?? DEFAULT_TIMEZONE}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
            </div>
            <input
              type="hidden"
              name="logo_url"
              value={business?.logo_url ?? ""}
            />
            <input
              type="hidden"
              name="cover_image_url"
              value={business?.cover_image_url ?? ""}
            />
            <input
              type="hidden"
              name="brand_color"
              value={business?.brand_color ?? "#f5c518"}
            />
            <input
              type="hidden"
              name="contact_email"
              value={business?.contact_email ?? ""}
            />
            <input
              type="hidden"
              name="contact_whatsapp"
              value={business?.contact_whatsapp ?? ""}
            />
            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working hours</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={saveHours}
            messages={{
              loading: "Saving hours…",
              success: "Working hours saved",
              error: "Could not save hours",
            }}
            className="space-y-4"
          >
            {DAY_NAMES.map((dayName, day) => {
              const h = hoursByDay.get(day);
              return (
                <div
                  key={day}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 sm:grid sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <span className="mb-3 block text-sm font-semibold text-zinc-800 sm:mb-0">
                    {dayName}
                  </span>
                  <div className="mb-3 space-y-1 sm:mb-0">
                    <Label className="text-xs text-zinc-500 sm:sr-only">Open</Label>
                    <Input
                      name={`open_${day}`}
                      type="time"
                      defaultValue={h?.open_time?.slice(0, 5) ?? "09:00"}
                    />
                  </div>
                  <div className="mb-3 space-y-1 sm:mb-0">
                    <Label className="text-xs text-zinc-500 sm:sr-only">Close</Label>
                    <Input
                      name={`close_${day}`}
                      type="time"
                      defaultValue={h?.close_time?.slice(0, 5) ?? "17:00"}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      name={`closed_${day}`}
                      defaultChecked={h?.is_closed ?? (day === 0 || day === 6)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    Closed
                  </label>
                </div>
              );
            })}
            <SubmitButton className="rounded-lg" pendingLabel="Saving…">
              Save hours
            </SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
