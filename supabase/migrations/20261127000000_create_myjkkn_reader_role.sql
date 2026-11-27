-- =====================================================
-- Read-only role for MyJKKN's nightly mentor-list copy
-- Requested by the Director (mail, 27 Nov 2026).
-- Lets MyJKKN READ five tables. It cannot write anything.
-- =====================================================

-- 1. A role that cannot log in by itself. PostgREST switches into it
--    when a request carries a JWT with "role": "myjkkn_reader".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'myjkkn_reader') THEN
    CREATE ROLE myjkkn_reader NOLOGIN NOINHERIT;
  END IF;
END $$;

GRANT myjkkn_reader TO authenticator;
GRANT USAGE ON SCHEMA public TO myjkkn_reader;

-- 2. SELECT only, and only on these five tables.
GRANT SELECT ON public.mentors,
                public.users,
                public.students,
                public.mentor_students,
                public.counseling_sessions
  TO myjkkn_reader;

-- 3. RLS is on for all five tables, so the role also needs a SELECT
--    policy. No INSERT/UPDATE/DELETE policy exists, and no write grant
--    either, so writes fail twice over.
CREATE POLICY "myjkkn_reader reads mentors"             ON public.mentors             FOR SELECT TO myjkkn_reader USING (true);
CREATE POLICY "myjkkn_reader reads users"               ON public.users               FOR SELECT TO myjkkn_reader USING (true);
CREATE POLICY "myjkkn_reader reads students"            ON public.students            FOR SELECT TO myjkkn_reader USING (true);
CREATE POLICY "myjkkn_reader reads mentor_students"     ON public.mentor_students     FOR SELECT TO myjkkn_reader USING (true);
CREATE POLICY "myjkkn_reader reads counseling_sessions" ON public.counseling_sessions FOR SELECT TO myjkkn_reader USING (true);

-- 4. Stops future tables from being exposed to this role by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM myjkkn_reader;

-- Rollback:
--   DROP POLICY ... (the five above); REVOKE ALL ON ALL TABLES IN SCHEMA public FROM myjkkn_reader;
--   REVOKE myjkkn_reader FROM authenticator; DROP ROLE myjkkn_reader;
