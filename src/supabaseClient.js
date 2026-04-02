import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ipgzyckubwakijerxcpc.supabase.co';
const supabaseAnonKey = 'sb_publishable_RcZCM-79LPtK2mAjIsdD9g_pOXj61yT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);