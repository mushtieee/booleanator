import { supabase, startUserSession, trackPageVisit } from './supabaseClient.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.init();
  }

  async init() {
    // Track page visit
    await trackPageVisit(window.location.pathname);

    // Check current auth state
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await this.handleAuthStateChange('SIGNED_IN', session);
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      await this.handleAuthStateChange(event, session);
    });
  }

  async handleAuthStateChange(event, session) {
    if (event === 'SIGNED_IN' && session) {
      this.currentUser = session.user;
      
      // Start user session tracking
      this.currentSession = await startUserSession();
      
      // Check if user is approved
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved, full_name')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        if (profile.is_approved) {
          // Redirect to main app
          window.location.href = '/index.html';
        } else {
          this.showPendingApprovalMessage();
        }
      }
    } else if (event === 'SIGNED_OUT') {
      this.currentUser = null;
      if (this.currentSession) {
        await this.endSession();
      }
    }
  }

  async signUp(email, password, fullName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login.html`
        }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await this.endSession();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      window.location.href = '/login.html';
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async endSession() {
    if (this.currentSession) {
      await supabase.from('user_sessions')
        .update({ session_end: new Date().toISOString() })
        .eq('id', this.currentSession.id);
      this.currentSession = null;
    }
  }

  showPendingApprovalMessage() {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl">
          <strong>Account Pending Approval</strong><br>
          Your account has been created successfully but is pending admin approval. 
          You will receive access once approved.
          <br><br>
          <button onclick="authManager.signOut()" class="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition">
            Sign Out
          </button>
        </div>
      `;
      statusDiv.classList.remove('hidden');
    }
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async isAdmin() {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    return profile?.email === 'mustafakesarya@gmail.com';
  }
}

// Global auth manager instance
window.authManager = new AuthManager();
export default window.authManager;