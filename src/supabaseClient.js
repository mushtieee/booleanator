import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set up your Supabase connection.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Analytics helper functions
export const trackPageVisit = async (page, sessionId = null, referrer = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('site_analytics').insert({
      user_id: user?.id || null,
      page_visited: page,
      session_id: sessionId || generateSessionId(),
      referrer: referrer || document.referrer,
      ip_address: await getClientIP()
    });
  } catch (error) {
    console.error('Error tracking page visit:', error);
  }
};

export const startUserSession = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from('user_sessions').insert({
      user_id: user.id,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent
    }).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting user session:', error);
    return null;
  }
};

export const endUserSession = async (sessionId) => {
  try {
    await supabase.from('user_sessions')
      .update({ session_end: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error ending user session:', error);
  }
};

// Helper functions
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
};