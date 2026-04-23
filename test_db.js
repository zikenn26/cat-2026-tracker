import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: groups } = await supabase.from('study_groups').select('*');
  console.log("Groups:", groups);
  
  if (groups.length > 0) {
    const { data: msgs } = await supabase.from('group_messages').select('*, user:user_id(name)').eq('group_id', groups[0].id).order('created_at', { ascending: true });
    console.log(`Messages in ${groups[0].name}:`);
    msgs.forEach(m => {
      console.log(`[${m.created_at}] ${m.user?.name}: ${m.content}`);
    });
  }
}

check();
