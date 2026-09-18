/* =========================================================
   BISBAM HAIRS — supabase.js
   Supabase client setup.
   ========================================================= */

const SUPABASE_URL = 'https://tqcwmgxxzzsdfuxskayl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY3dtcXF4enpzZGZ1eHNrYXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MzM0MDUsImV4cCI6MjEwNTMwOTQwNX0.K9dyvS3PAXrD6biR6ffT7yP3MoIH7MD6HEPmxvo84-M';

window.BisbamDB = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase library not loaded yet.');
    return null;
  }

  if (!window.BisbamDB) {
    window.BisbamDB = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    console.log('Supabase client initialized.');
  }

  return window.BisbamDB;
}

window.initSupabase = initSupabase;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}