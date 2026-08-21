import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PollStatus = 'draft' | 'open' | 'closed';
export type PollType = 'single' | 'multi' | 'text';

export interface Player {
  id: string;
  name: string;
  emoji: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  hint: string | null;
  sort_order: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  poll_type: PollType;
  category: string | null;
  created_at: string;
  poll_options: PollOption[];
  placeholder: string | null;
  min_value: number | null;
  max_value: number | null;
  allow_empty: boolean;
  empty_label: string | null;
  featured: boolean;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string | null;
  text_value: string | null;
  player_id: string;
}

export interface PalmaresEntry {
  id: string;
  season: string;
  position: number;
  name: string;
  image_url: string | null;
}
