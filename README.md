# BookNow — Appointment Booking App

Multi-tenant appointment booking with a **single Next.js app** on one domain:

- **Customers:** browse businesses, book appointments, manage bookings
- **Business admins:** dashboard for services, appointments, customers, settings

Built with Next.js, Supabase (Auth + Postgres + RLS), and Tailwind CSS. **No Docker required** — connects directly to hosted Supabase.

## Features

- **Duration-based slots** — time slots match each service's length (30 min, 60 min, etc.)
- **Double-booking prevention** — database overlap constraint + server validation
- **Vendor branding** — logo, cover image, tagline, and accent color on the customer booking page
- **Service images** — upload photos per service
- **Currency & timezone** — defaults to LKR and IST (`Asia/Kolkata`); configurable per business
- **Image storage** — Supabase Storage (any host) or Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
- **Booking notifications** — email + SMS confirmations for customers; email, SMS, Meta WhatsApp, and in-app alerts for business staff

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project
2. Enable **Email** auth under Authentication → Providers
3. For local dev, turn off **Confirm email** (same screen) so you can sign in immediately after register
4. Add redirect URLs under Authentication → URL Configuration:
   - `http://localhost:3000/**`
   - `http://192.168.x.x:3000/**` (your LAN IP when testing on phone)
   - `https://your-production-domain.com/**`

### 2. Apply database schema

In the Supabase **SQL Editor**, run migrations in order:

```
supabase/migrations/20250622000000_initial_schema.sql
supabase/migrations/20250622100000_secure_business_isolation.sql
supabase/migrations/20250622110000_create_business_rpc.sql
supabase/migrations/20250622120000_booking_by_slug.sql
supabase/migrations/20250622130000_create_public_appointment.sql
supabase/migrations/20250622140000_business_branding_and_storage.sql
```

Or link the CLI and push (no Docker needed):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

### 3. Configure environment

Copy credentials from **Project Settings → API** into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=BookNow <notifications@yourdomain.com>
```

Optional for SMS (Twilio): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `SMS_DEFAULT_COUNTRY_CODE=94`

Optional for business WhatsApp alerts (Meta Cloud API): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. Each business sets their receiving number under **Dashboard → Settings → Business WhatsApp**. See [Meta WhatsApp setup](#meta-whatsapp-setup) below.

Booking links, QR codes, and sign-up email redirects use the **current request URL** automatically (`localhost`, your LAN IP like `192.168.x.x`, or your production domain). Add your dev and production URLs to Supabase **Authentication → URL Configuration** redirect allowlist.

Optionally set `NEXT_PUBLIC_SITE_URL` in production if you need a fixed canonical URL (e.g. always `https://booknow.com` even when accessed via alternate domains).

### 4. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Browse businesses |
| `/b/[slug]` | Friendly booking page (e.g. `/b/my-salon`) |
| `/b/[slug]/book` | Booking wizard (slug URL) |
| `/book/[ref]` | Booking page by secure token **or** slug |
| `/book/[ref]/schedule` | Booking wizard (token/slug URL) |
| `/login`, `/register` | Auth |
| `/my-appointments` | Customer bookings |
| `/account` | Profile |
| `/dashboard` | Business list + create |
| `/dashboard/[id]/*` | Admin: overview, services, appointments, customers, settings |

### Super admins

Platform operators can access **every** business dashboard without being added as a member. Grant access in the Supabase SQL editor (service role):

```sql
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'you@example.com';
```

Regular users only see businesses they belong to. Super admins get full admin rights (RLS + storage) on all tenants.

## Meta WhatsApp setup

Business booking alerts use the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api). Proactive notifications require **approved message templates** in Meta Business Manager.

### 1. Meta app credentials

1. Create an app at [developers.facebook.com](https://developers.facebook.com) and add the **WhatsApp** product.
2. Under **WhatsApp → API Setup**, copy the **Phone number ID** and generate a **permanent access token** (system user).
3. Add to `.env.local`:

```env
WHATSAPP_ACCESS_TOKEN=your_permanent_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

### 2. Message templates

**Recommended first (one variable, full booking text):** create `booknow_alert` — easiest to approve and delivers reliably.

| Name | Language | Body |
|------|----------|------|
| `booknow_alert` | English (US) | You have a new notification from BookNow.\n\n{{1}}\n\nOpen your dashboard for more details. |

Sample for `{{1}}`: paste a multi-line booking summary (customer, service, time, price).

Until `booknow_alert` is approved, the app falls back to Meta’s built-in `hello_world` template (you get a ping, details only in dashboard).

**Optional structured templates** (`WHATSAPP_DELIVERY_MODE=structured`):

| Default name | Body text (paste into Meta — static text at start and end) |
|--------------|-------------------------------------------------------------|
| `booknow_new_booking` | You have received a new booking request for your business.\n\nLocation: {{1}}\nCustomer: {{2}}\nAppointment details: {{3}}\n\nPlease check your dashboard for full information. Sent via BookNow. |
| `booknow_booking_cancelled` | A customer has cancelled an appointment with your business.\n\nLocation: {{1}}\nCustomer: {{2}}\nCancelled appointment: {{3}}\n\nPlease check your dashboard for updates. Sent via BookNow. |
| `booknow_booking_confirmed` | An appointment with your business has been confirmed.\n\nLocation: {{1}}\nCustomer: {{2}}\nConfirmed appointment: {{3}}\n\nPlease check your dashboard for details. Sent via BookNow. |

Override names if needed:

```env
WHATSAPP_TEMPLATE_NEW_BOOKING=booknow_new_booking
WHATSAPP_TEMPLATE_BOOKING_CANCELLED=booknow_booking_cancelled
WHATSAPP_TEMPLATE_BOOKING_CONFIRMED=booknow_booking_confirmed
```

### 3. Business receiving number

Each business enters their WhatsApp mobile under **Dashboard → Settings → Business WhatsApp** (e.g. `0771234567` or `+94771234567`).

### Development / no templates

Default delivery is **plain text** (`WHATSAPP_DELIVERY_MODE=text`) with full booking details. Meta only delivers these if the business owner has **messaged your platform WhatsApp number within the last 24 hours**. Set `WHATSAPP_PLATFORM_NUMBER` (e.g. `+15556532084`) so owners see which number to message in **Dashboard → Settings**.

When Meta approves templates later, switch to `WHATSAPP_DELIVERY_MODE=alert` or `structured`.

## Deploy

Deploy to Vercel (or any Node host) with the same env vars as `.env.local`. **Vercel does not read `.env.local`** — add each variable under **Project → Settings → Environment Variables** for **Production** (and Preview if needed).

### Required on Vercel for WhatsApp booking alerts

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (without this, **no** notifications run) |
| `WHATSAPP_ACCESS_TOKEN` | Yes (permanent system user token) |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes |
| `WHATSAPP_DELIVERY_MODE` | `hello_world` |
| `RESEND_API_KEY` | For email alerts |
| `EMAIL_FROM` | For email alerts |

After deploy, open `https://your-app.vercel.app/api/health/notifications` — you want `"ready": true`.

Redeploy after changing env vars (or use **Redeploy** from the Vercel dashboard).

Admin and customer areas share the same domain — no separate deployments.
# bookings
