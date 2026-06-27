-- Keep mentors.total_students in sync with the mentor_students table.
--
-- Background: mentors.total_students is a denormalized count (created with
-- DEFAULT 0 in 20250123000000_create_mentor_module_tables.sql). For most of the
-- app's life the only path that maintained it was bulkAssignStudents(), which
-- recomputes the count manually. The single-assign path assignStudentsToMentor()
-- never updated the column and relied on a trigger that existed only in the live
-- database, never in version control. As a result, ~107 mentors had a stale 0
-- count while mentor_students actually held assignments (e.g. the mentor list
-- showed "0 Students" for mentors who had 9). This migration makes the trigger
-- reproducible so a rebuild-from-migrations does not silently reintroduce the bug.

-- ── Sync function ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_mentor_total_students()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  affected_mentor_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_mentor_id := OLD.mentor_id;
  ELSE
    affected_mentor_id := NEW.mentor_id;
  END IF;

  UPDATE mentors
  SET total_students = (
    SELECT count(*)::int FROM mentor_students WHERE mentor_id = affected_mentor_id
  ), updated_at = now()
  WHERE id = affected_mentor_id;

  -- When an assignment is re-pointed to a different mentor, refresh the old one too.
  IF TG_OP = 'UPDATE' AND OLD.mentor_id IS DISTINCT FROM NEW.mentor_id THEN
    UPDATE mentors
    SET total_students = (
      SELECT count(*)::int FROM mentor_students WHERE mentor_id = OLD.mentor_id
    ), updated_at = now()
    WHERE id = OLD.mentor_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ── Trigger ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_mentor_total_students ON public.mentor_students;

CREATE TRIGGER trg_sync_mentor_total_students
  AFTER INSERT OR DELETE OR UPDATE ON public.mentor_students
  FOR EACH ROW
  EXECUTE FUNCTION sync_mentor_total_students();

-- ── One-time backfill ─────────────────────────────────────────────────────────
-- Correct any rows that drifted before the trigger was in place. Idempotent:
-- only touches mentors whose cached count disagrees with the live count.
UPDATE mentors m
SET total_students = (SELECT count(*) FROM mentor_students ms WHERE ms.mentor_id = m.id)
WHERE m.total_students IS DISTINCT FROM (
  SELECT count(*) FROM mentor_students ms WHERE ms.mentor_id = m.id
);
