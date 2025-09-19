// auth.js
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const statusMessage = document.getElementById('statusMessage');

    // Handle Sign In and Sign Up
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        
        // This is a simplified approach. You would likely use two separate buttons
        // for sign-in and sign-up in a real app.
        const buttonId = e.submitter.id;

        if (buttonId === 'signInButton') {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                statusMessage.textContent = 'Error: ' + error.message;
            } else {
                // On successful login, check if the user is approved.
                // You can add this logic here as per the previous step-by-step guidance.
                // For now, let's just show a success message.
                statusMessage.textContent = 'Signed in successfully! Checking approval...';
            }
        }
    });

    // Handle Google SSO Login
    const googleLoginButton = document.getElementById('googleLoginButton');
    googleLoginButton.addEventListener('click', async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) {
            statusMessage.textContent = 'Error with Google login: ' + error.message;
        }
    });

    // Check if a user is already logged in
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // User is logged in, you can now check their approval status
        // and redirect them if approved.
        console.log('User session:', session);
      }
    });
});