import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Shared browser client for client components */
export const supabase = createClient();
