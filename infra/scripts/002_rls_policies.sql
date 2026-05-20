-- Run this in Supabase SQL Editor after 001_init_schema.sql
-- Purpose: strict tenant isolation by hospital_id using JWT claim `hospital_id`.

-- Recommended: extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional helper: keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at where useful
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE hospital_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_hospitals_updated_at'
  ) THEN
    CREATE TRIGGER trg_hospitals_updated_at
      BEFORE UPDATE ON hospitals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_hospital_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_hospital_users_updated_at
      BEFORE UPDATE ON hospital_users
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chat_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_chat_sessions_updated_at
      BEFORE UPDATE ON chat_sessions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_escalations_updated_at'
  ) THEN
    CREATE TRIGGER trg_escalations_updated_at
      BEFORE UPDATE ON escalations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Ensure RLS enabled
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Utility expression:
-- current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id'
-- must be set by your auth token middleware.

-- hospitals policies
DROP POLICY IF EXISTS hospitals_select_own ON hospitals;
CREATE POLICY hospitals_select_own
ON hospitals
FOR SELECT
USING (
  id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

DROP POLICY IF EXISTS hospitals_update_own ON hospitals;
CREATE POLICY hospitals_update_own
ON hospitals
FOR UPDATE
USING (
  id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
)
WITH CHECK (
  id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

-- hospital_users policies
DROP POLICY IF EXISTS hospital_users_select_own_hospital ON hospital_users;
CREATE POLICY hospital_users_select_own_hospital
ON hospital_users
FOR SELECT
USING (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

DROP POLICY IF EXISTS hospital_users_manage_own_hospital ON hospital_users;
CREATE POLICY hospital_users_manage_own_hospital
ON hospital_users
FOR ALL
USING (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
)
WITH CHECK (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

-- chat_sessions policies
DROP POLICY IF EXISTS chat_sessions_select_own_hospital ON chat_sessions;
CREATE POLICY chat_sessions_select_own_hospital
ON chat_sessions
FOR SELECT
USING (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

DROP POLICY IF EXISTS chat_sessions_manage_own_hospital ON chat_sessions;
CREATE POLICY chat_sessions_manage_own_hospital
ON chat_sessions
FOR ALL
USING (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
)
WITH CHECK (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

-- messages policies (inherits tenancy from session)
DROP POLICY IF EXISTS messages_select_own_hospital ON messages;
CREATE POLICY messages_select_own_hospital
ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM chat_sessions cs
    WHERE cs.id = messages.session_id
      AND cs.hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
  )
);

DROP POLICY IF EXISTS messages_manage_own_hospital ON messages;
CREATE POLICY messages_manage_own_hospital
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM chat_sessions cs
    WHERE cs.id = messages.session_id
      AND cs.hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chat_sessions cs
    WHERE cs.id = messages.session_id
      AND cs.hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
  )
);

-- hospital_kb policies
DROP POLICY IF EXISTS hospital_kb_select_own_hospital ON hospital_kb;
CREATE POLICY hospital_kb_select_own_hospital
ON hospital_kb
FOR SELECT
USING (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

DROP POLICY IF EXISTS hospital_kb_manage_own_hospital ON hospital_kb;
CREATE POLICY hospital_kb_manage_own_hospital
ON hospital_kb
FOR ALL
USING (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
)
WITH CHECK (
  hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
);

-- escalations policies (inherits tenancy from session)
DROP POLICY IF EXISTS escalations_select_own_hospital ON escalations;
CREATE POLICY escalations_select_own_hospital
ON escalations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM chat_sessions cs
    WHERE cs.id = escalations.session_id
      AND cs.hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
  )
);

DROP POLICY IF EXISTS escalations_manage_own_hospital ON escalations;
CREATE POLICY escalations_manage_own_hospital
ON escalations
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM chat_sessions cs
    WHERE cs.id = escalations.session_id
      AND cs.hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chat_sessions cs
    WHERE cs.id = escalations.session_id
      AND cs.hospital_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'hospital_id')
  )
);
