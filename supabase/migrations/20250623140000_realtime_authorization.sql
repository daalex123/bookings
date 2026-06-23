-- Realtime Authorization: allow users to join their own notification/appointment channels.
-- Without these policies, channel subscribe fails with CHANNEL_ERROR (socket 1006).

CREATE POLICY "users_subscribe_own_notification_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (select realtime.topic()) = 'notifications:' || (select auth.uid()::text)
);

CREATE POLICY "users_subscribe_own_appointments_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (select realtime.topic()) = 'customer-appointments:' || (select auth.uid()::text)
);

-- Match private broadcast delivery (client channels use config.private = true).
CREATE OR REPLACE FUNCTION public.broadcast_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('id', NEW.id),
    'new_notification',
    'notifications:' || NEW.user_id::text,
    true
  );
  RETURN NEW;
END;
$$;
