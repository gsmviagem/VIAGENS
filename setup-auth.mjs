import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// You need the SERVICE_ROLE_KEY to delete users, but we will create them normally.
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newUsers = [
  { email: 'Gabrielsalem661@gmail.com', password: '140621Ga#' },
  { email: 'Gabrielricardo26@gmail.com', password: '12345678Ab$' }
];

async function setupUsers() {
  console.log("Setting up users...");
  for (const user of newUsers) {
    console.log(`Creating user: ${user.email}`);
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });
    if (error) {
      console.error(`Error creating ${user.email}:`, error.message);
    } else {
      console.log(`Success creating ${user.email}`);
    }
  }
}

setupUsers();
