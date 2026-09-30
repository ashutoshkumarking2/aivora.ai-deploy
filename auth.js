import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import { auth } from "./firebase-config.js";
import { initGitHubModule } from "./github.js";

// DOM Elements
const authCard = document.getElementById('authCard');
const dashboardCard = document.getElementById('dashboardCard');
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const toggleModeText = document.getElementById('toggleModeText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const statusBanner = document.getElementById('statusBanner');
const btnGoogle = document.getElementById('btnGoogle');
const btnSignOut = document.getElementById('btnSignOut');
const btnGetStarted = document.getElementById('btnGetStarted');

// User Profile Elements
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');

let isSignUp = false;

// Netlify-Style Get Started Action Button
if (btnGetStarted) {
  btnGetStarted.addEventListener('click', () => {
    if (emailInput) emailInput.focus();
    isSignUp = true;
    formTitle.textContent = "Create Account";
    formSubtitle.textContent = "Get started with your Aivora workspace.";
    submitAuthBtn.textContent = "Create Account";
    toggleModeText.textContent = "Already have an account?";
    toggleModeBtn.textContent = "Sign In";
  });
}

// Status Display Helpers
function showStatus(message, isError = false) {
  if (!statusBanner) return;
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${isError ? 'error' : 'success'}`;
}

function clearStatus() {
  if (!statusBanner) return;
  statusBanner.textContent = '';
  statusBanner.className = 'status-banner';
}

// Password Visibility Toggle
if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
  });
}

// Mode Switcher (Sign In vs Sign Up)
if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    clearStatus();

    if (isSignUp) {
      formTitle.textContent = "Create Account";
      formSubtitle.textContent = "Get started with your Aivora workspace.";
      submitAuthBtn.textContent = "Create Account";
      toggleModeText.textContent = "Already have an account?";
      toggleModeBtn.textContent = "Sign In";
    } else {
      formTitle.textContent = "Welcome to Aivora.";
      formSubtitle.textContent = "Sign in to continue to your workspace.";
      submitAuthBtn.textContent = "Sign In";
      toggleModeText.textContent = "Don't have an account?";
      toggleModeBtn.textContent = "Create Account";
    }
  });
}

// Email Auth Submit
if (emailForm) {
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatus();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showStatus("Please complete all required fields.", true);
      return;
    }

    submitAuthBtn.disabled = true;
    submitAuthBtn.textContent = isSignUp ? "Creating..." : "Authenticating...";

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        showStatus("Account created successfully.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showStatus("Signed in successfully.");
      }
    } catch (err) {
      showStatus(formatFirebaseError(err.code), true);
    } finally {
      submitAuthBtn.disabled = false;
      submitAuthBtn.textContent = isSignUp ? "Create Account" : "Sign In";
    }
  });
}

// Google Login
if (btnGoogle) {
  btnGoogle.addEventListener('click', async () => {
    clearStatus();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      showStatus(formatFirebaseError(err.code), true);
    }
  });
}

// Password Reset Link
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    clearStatus();
    const email = emailInput.value.trim();

    if (!email) {
      showStatus("Enter your email address to receive reset instructions.", true);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showStatus("Password reset link sent to your email.");
    } catch (err) {
      showStatus(formatFirebaseError(err.code), true);
    }
  });
}

// Sign Out Action
if (btnSignOut) {
  btnSignOut.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showStatus("You have been signed out.");
    } catch (err) {
      showStatus("Error signing out.", true);
    }
  });
}

// Authentication State Listener & Dashboard Routing
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (authCard) authCard.style.display = 'none';
    if (dashboardCard) dashboardCard.classList.add('active');

    const displayName = user.displayName || user.email.split('@')[0];
    if (userName) userName.textContent = displayName;
    if (userEmail) userEmail.textContent = user.email;
    if (userAvatar) {
      userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=595F39&color=fff`;
    }

    // Initialize GitHub repository integration module
    initGitHubModule(user);
  } else {
    if (authCard) authCard.style.display = 'block';
    if (dashboardCard) dashboardCard.classList.remove('active');
  }
});

function formatFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return "Invalid email or password.";
    case 'auth/email-already-in-use':
      return "An account with this email address already exists.";
    case 'auth/account-exists-with-different-credential':
      return "This email is already associated with another login method. Please sign in using your original method.";
    case 'auth/weak-password':
      return "Password should be at least 6 characters long.";
    case 'auth/popup-closed-by-user':
      return "Sign-in popup was closed before completing.";
    default:
      return "Authentication error: " + (code || "Unknown state");
  }
}
