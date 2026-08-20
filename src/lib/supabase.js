import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
  throw new Error(
    '[Atherium] .env.local이 없거나 비어있습니다. .env.example을 복사해서 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 채워주세요.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
