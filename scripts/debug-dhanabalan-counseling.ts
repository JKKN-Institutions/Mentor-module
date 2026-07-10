/**
 * One-off diagnostic: reproduce EXACTLY what GET /api/mentor/[id]/counseling
 * returns for Dr. Dhanabalan S (JKKN Dental College), bypassing only the HTTP
 * auth wrapper. This calls the same service the route calls.
 *
 * Usage: npx tsx scripts/debug-dhanabalan-counseling.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const JKKN_ID = '45ba74de-4f22-4450-be1d-601c093d5900'; // Dhanabalan's jkkn_user_id
const USER_ID = 'ba07fcef-d89e-4acb-b52e-107cb76c5397';
const MENTOR_ID = '6920a83f-f513-4f59-993d-4b72e9997911';

async function main() {
  // Import after env is loaded so createAdminClient() sees the keys.
  const { resolveMentorByJkknId } = await import('../lib/services/mentor/resolve');
  const { getSessionsForMentor } = await import('../lib/services/mentor/counseling');
  const { createAdminClient } = await import('../lib/supabase/server');

  const supabase = createAdminClient();

  console.log('\n=== 1. resolveMentorByJkknId (with jkkn_user_id) ===');
  const byJkkn = await resolveMentorByJkknId(JKKN_ID, supabase);
  console.log(JSON.stringify(byJkkn, null, 2));

  console.log('\n=== 2. resolveMentorByJkknId (with Supabase user_id) ===');
  const byUser = await resolveMentorByJkknId(USER_ID, supabase);
  console.log(JSON.stringify(byUser, null, 2));

  console.log('\n=== 3. resolveMentorByJkknId (with mentor_id) ===');
  const byMentor = await resolveMentorByJkknId(MENTOR_ID, supabase);
  console.log(JSON.stringify(byMentor, null, 2));

  for (const id of [JKKN_ID, USER_ID, MENTOR_ID]) {
    console.log(`\n=== getSessionsForMentor("${id}") ===`);
    try {
      const t0 = Date.now();
      const sessions = await getSessionsForMentor(id);
      console.log(`  returned ${sessions.length} sessions in ${Date.now() - t0}ms`);
      if (sessions.length > 0) {
        const s = sessions[0];
        console.log('  first session (transformed):', JSON.stringify({
          id: s.id, sessionName: s.sessionName, date: s.date, time: s.time,
          status: s.status, studentName: s.studentName,
          studentEmail: s.student?.email, studentDept: s.student?.department,
          hasFeedback: !!s.feedback,
        }, null, 2));
      }
    } catch (e) {
      console.error('  THREW:', e instanceof Error ? e.stack : e);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
