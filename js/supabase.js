import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://hnphcskbkwtoxnjvnrzm.supabase.co'      
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucGhjc2tia3d0b3huanZucnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjA3ODIsImV4cCI6MjA5NjQzNjc4Mn0.I4F8u-LKG2bh5JkFWL8CIJVzZt7GTg1M-xhah9sE1k8'                

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)