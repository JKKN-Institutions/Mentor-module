/**
 * One-off diagnostic: why can't hodoralpathology@jkkn.ac.in see counseling sessions?
 * Usage: npx tsx scripts/debug-hod-counseling.ts
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL = 'hodoralpathology@jkkn.ac.in';

async function main() {
  // 1. User record
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*')
    .ilike('email', EMAIL);
  console.log('=== users ===');
  console.log(JSON.stringify(users, null, 2), userErr ?? '');

  if (!users?.length) return;
  const user = users[0];

  // 2. Mentor record(s)
  const { data: mentors, error: mentorErr } = await supabase
    .from('mentors')
    .select('*')
    .eq('user_id', user.id);
  console.log('=== mentors (by user_id) ===');
  console.log(JSON.stringify(mentors, null, 2), mentorErr ?? '');

  // 2b. Any mentor rows matching by email (orphaned duplicates)
  const { data: mentorsByEmail } = await supabase
    .from('mentors')
    .select('id, user_id, name, email, institution_id, department_id, is_active')
    .ilike('email', EMAIL);
  console.log('=== mentors (by email) ===');
  console.log(JSON.stringify(mentorsByEmail, null, 2));

  // 3. Counseling sessions for each mentor id found
  const mentorIds = [
    ...new Set([...(mentors ?? []), ...(mentorsByEmail ?? [])].map((m) => m.id)),
  ];
  for (const mid of mentorIds) {
    const { data: sessions, error: sessErr, count } = await supabase
      .from('counseling_sessions')
      .select('id, session_name, date, status, mentor_id, created_at', { count: 'exact' })
      .eq('mentor_id', mid)
      .order('created_at', { ascending: false })
      .limit(5);
    console.log(`=== counseling_sessions for mentor ${mid} (total: ${count}) ===`);
    console.log(JSON.stringify(sessions, null, 2), sessErr ?? '');
  }

  // 4. Active session row (what validateToken's DB fallback sees)
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('id, user_id, expires_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);
  console.log('=== user_sessions (latest 3) ===');
  console.log(JSON.stringify(sessions, null, 2));

  // 5. Mentor in-charge assignment?
  const { data: incharge } = await supabase
    .from('mentor_incharge_assignments')
    .select('*')
    .eq('user_id', user.id);
  console.log('=== mentor_incharge_assignments ===');
  console.log(JSON.stringify(incharge, null, 2));
}

main().then(() => process.exit(0));
