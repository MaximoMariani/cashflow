import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kdsawblzyifzgkmomqqo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_p-d2NupbdztynmVSmXZDeA_DvM_YNMk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
