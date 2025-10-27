// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jxngyfctlilataxuqvnw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bmd5ZmN0bGlsYXRheHVxdm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTcyMjEsImV4cCI6MjA3NzA3MzIyMX0.hZd1z-3ncAP--5MsMfsLOLTpQIM7IJ3gkwkdO9_l8j8'  // ← TU ANON KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)