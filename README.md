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

Create these **Utility** templates in [Meta Business Manager → WhatsApp Manager → Message templates](https://business.facebook.com/wa/manage/message-templates/). Names must match the env vars (or use the defaults below).

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

### Development shortcut

For quick testing inside Meta’s 24-hour messaging window, set `WHATSAPP_USE_TEXT_MESSAGES=true` to send plain text instead of templates. Production should use approved templates.

## Deploy

Deploy to Vercel (or any Node host) with the same two env vars. Admin and customer areas share the same domain — no separate deployments.
# bookings
