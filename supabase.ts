import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://yvxrtojnvxgzhpqqkzec.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eHJ0b2pudnhnemhwcXFremVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzIxOTQsImV4cCI6MjA3NDkwODE5NH0.vd5i80mkbwNdbtwfbwPHA6xPLWzg6Xvsp9gNqBfWqoQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);