import { regenerateBookingToken, updateBusiness, updateBusinessHours } from "@/lib/actions";
import { adminDashboardUrl } from "@/lib/admin-url";
import { DAY_NAMES } from "@/lib/availability";
import {
  bookingPagePathByToken,
  bookingPublicUrl,
} from "@/lib/booking";
import {
  CATEGORY_CUSTOM_FIELDS,
  CURRENCY_OPTIONS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BRAND_COLOR,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  INDUSTRY_CATEGORIES,
  TIMEZONE_OPTIONS,
} from "@/lib/constants";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { ActionForm } from "@/components/action-form";
import { ShareBookingCard } from "@/components/booking/share-booking-card";
import { BrandColorField } from "@/components/dashboard/brand-color-field";
import { BookingCustomFieldsBuilder } from "@/components/dashboard/booking-custom-fields-builder";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { BusinessHiddenFields } from "@/components/dashboard/business-hidden-fields";
import { DocumentTemplateDesigner } from "@/components/dashboard/document-template-designer";
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
  const activeCategory = (business?.industry_category ?? "general") as keyof typeof CATEGORY_CUSTOM_FIELDS;
  const categoryDefaults = CATEGORY_CUSTOM_FIELDS[activeCategory] ?? [];
  const customFieldsHiddenValue = JSON.stringify(
    (business?.booking_custom_fields as unknown) ?? categoryDefaults
  );
  const documentTemplateHiddenValue = JSON.stringify(
    business?.document_template ?? {}
  );
  const hiddenValues = {
    name: business?.name ?? "",
    slug: business?.slug ?? "",
    description: business?.description ?? "",
    tagline: business?.tagline ?? "",
    timezone: business?.timezone ?? DEFAULT_TIMEZONE,
    currency: business?.currency ?? DEFAULT_CURRENCY,
    industry_category: business?.industry_category ?? "general",
    booking_custom_fields_json: customFieldsHiddenValue,
    customer_unique_key_field: business?.customer_unique_key_field ?? "",
    logo_url: business?.logo_url ?? "",
    cover_image_url: business?.cover_image_url ?? "",
    brand_color: business?.brand_color ?? DEFAULT_BRAND_COLOR,
    background_color: business?.background_color ?? DEFAULT_BACKGROUND_COLOR,
    contact_email: business?.contact_email ?? "",
    contact_whatsapp: business?.contact_whatsapp ?? "",
    address: business?.address ?? "",
    contact_phone: business?.contact_phone ?? "",
    document_template_json: documentTemplateHiddenValue,
  };

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
              <Label htmlFor="contact_phone">Contact number</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                defaultValue={business?.contact_phone ?? ""}
                placeholder="0112345678 or +94112345678"
              />
              <p className="text-xs text-zinc-500">
                Shown on invoices, checklists, and other printed documents.
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
            <div className="space-y-2">
              <Label htmlFor="address">Business address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={business?.address ?? ""}
                rows={3}
                placeholder="Street, city, postal code"
              />
              <p className="text-xs text-zinc-500">
                Printed in the document header when the template includes address.
              </p>
            </div>
            <BusinessHiddenFields
              values={hiddenValues}
              omit={[
                "contact_email",
                "contact_whatsapp",
                "contact_phone",
                "address",
              ]}
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
            <BusinessHiddenFields
              values={hiddenValues}
              omit={["logo_url", "cover_image_url", "brand_color", "background_color", "tagline"]}
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
            <BrandColorField
              key={`brand_color-${business?.updated_at ?? ""}`}
              id="brand_color"
              name="brand_color"
              label="Brand accent color"
              description="Buttons, links, and highlights on your booking page."
              defaultValue={business?.brand_color ?? DEFAULT_BRAND_COLOR}
            />
            <BrandColorField
              key={`background_color-${business?.updated_at ?? ""}`}
              id="background_color"
              name="background_color"
              label="Booking page background"
              description="Main background for your customer booking app and admin mobile view."
              defaultValue={
                business?.background_color ?? DEFAULT_BACKGROUND_COLOR
              }
            />
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
            <div className="space-y-2">
              <Label htmlFor="industry_category">Industry Category</Label>
              <AdminSelect
                id="industry_category"
                name="industry_category"
                defaultValue={business?.industry_category ?? "general"}
              >
                {INDUSTRY_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </AdminSelect>
              <p className="text-xs text-zinc-500">
                Controls which extra fields customers see in the booking form.
              </p>
            </div>
            <BookingCustomFieldsBuilder
              initialCategory={business?.industry_category ?? "general"}
              initialFields={business?.booking_custom_fields as unknown}
              initialUniqueKey={business?.customer_unique_key_field}
            />
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
              value={business?.brand_color ?? DEFAULT_BRAND_COLOR}
            />
            <input
              type="hidden"
              name="background_color"
              value={business?.background_color ?? DEFAULT_BACKGROUND_COLOR}
            />
            <BusinessHiddenFields
              values={hiddenValues}
              omit={[
                "name",
                "slug",
                "description",
                "tagline",
                "industry_category",
                "booking_custom_fields_json",
                "customer_unique_key_field",
                "currency",
                "timezone",
                "logo_url",
                "cover_image_url",
                "brand_color",
                "background_color",
              ]}
            />
            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document header &amp; footer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 max-w-2xl text-sm text-zinc-600">
            Design the header and footer applied when you print or generate
            invoices and checklists. Address and contact numbers come from the
            details above.
          </p>
          <ActionForm
            action={saveBusiness}
            messages={{
              loading: "Saving document template…",
              success: "Document template saved",
              error: "Could not save document template",
            }}
            className="space-y-4"
          >
            <BusinessHiddenFields
              values={hiddenValues}
              omit={["document_template_json"]}
            />
            <DocumentTemplateDesigner
              business={{
                name: business?.name ?? "Business",
                logo_url: business?.logo_url,
                brand_color: business?.brand_color,
                address: business?.address,
                contact_email: business?.contact_email,
                contact_phone: business?.contact_phone,
                contact_whatsapp: business?.contact_whatsapp,
              }}
              initialTemplate={business?.document_template}
            />
            <SubmitButton pendingLabel="Saving…">
              Save document template
            </SubmitButton>
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
