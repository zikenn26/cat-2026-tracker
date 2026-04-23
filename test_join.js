import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Parse .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing friendships query...");
  // Try previous syntax
  let res1 = await supabase
    .from('friendships')
    .select('*, sender:user_id(id, name), receiver:friend_id(id, name)');
  console.log("Result 1 Error:", res1.error ? res1.error.message : "Success");
  
  let res2 = await supabase
    .from('friendships')
    .select('*, sender:profiles!friendships_user_id_fkey(id, name), receiver:profiles!friendships_friend_id_fkey(id, name)');
  console.log("Result 2 Error:", res2.error ? res2.error.message : "Success");
}

test();
