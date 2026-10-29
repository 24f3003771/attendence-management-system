import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://twuyucswcehvbhxtpgog.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MFLOOzsTnz-dynxb5ZIoXw_lJdY_rLD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

