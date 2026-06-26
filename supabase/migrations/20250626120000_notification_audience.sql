-- Separate staff (admin) notifications from customer notifications

CREATE TYPE public.notification_audience AS ENUM ('staff', 'customer');

ALTER TABLE public.notifications
  ADD COLUMN audience public.notification_audience NOT NULL DEFAULT 'staff';

-- Rows delivered to the appointment customer are customer-facing
UPDATE public.notifications n
SET audience = 'customer'
FROM public.appointments a
WHERE n.appointment_id = a.id
  AND n.user_id = a.customer_id;

CREATE INDEX notifications_user_audience_created_idx
  ON public.notifications (user_id, audience, created_at DESC);
