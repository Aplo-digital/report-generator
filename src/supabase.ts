import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.DEV
  ? `${window.location.origin}/api/supabase`
  : import.meta.env.VITE_SUPABASE_URL as string

export const supabase = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)
