-- Broadcast notification inserts to user channels (reliable realtime delivery)

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
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_broadcast_insert ON public.notifications;

CREATE TRIGGER notifications_broadcast_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_notification_insert();
