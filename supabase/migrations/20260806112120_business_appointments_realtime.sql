-- Allow business members to subscribe to private realtime channels for their business appointments.
CREATE POLICY "members_subscribe_business_appointments_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (select realtime.topic()) ~ '^business-appointments:[0-9a-fA-F-]{36}$'
  AND private.is_business_member(
    split_part((select realtime.topic()), ':', 2)::uuid
  )
);
