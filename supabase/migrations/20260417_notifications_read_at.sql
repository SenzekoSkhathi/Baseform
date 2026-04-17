-- Server-side source of truth for notification read state. The notifications
-- feed is derived on the fly from applications/emails/credits, so we can't
-- mark individual rows as read. Instead, we record the last time the user
-- visited /notifications; anything timestamped before that is considered read.

alter table public.profiles
  add column if not exists notifications_last_read_at timestamptz;
