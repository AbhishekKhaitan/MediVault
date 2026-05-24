-- Migration 008: push_token column for targeted push notifications
-- Stores each device's Expo push token so edge functions can reach them.
alter table family_members
  add column if not exists push_token text;

-- No RLS change needed — existing update policy for admins covers this column.
-- Members update their own push token on app load (user_id = auth.uid() check
-- is handled at the application layer via getMyMemberProfile()).
