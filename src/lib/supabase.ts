import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { 
    url: !!supabaseUrl, 
    key: !!supabaseAnonKey 
  });
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be provided in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
