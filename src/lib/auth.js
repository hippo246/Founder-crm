// Local authentication system using Web Crypto API
// Note: This is frontend-only security, not backend-grade security

// Generate a random salt for password hashing
export async function generateSalt() {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash password with salt using SHA-256
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against stored hash
export async function verifyPassword(password, salt, storedHash) {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}

// Create a new local user
export async function createLocalUser(email, password, ownerName) {
  const salt = await generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const userId = 'user_' + Date.now();
  
  const user = {
    userId,
    email,
    ownerName,
    passwordHash,
    passwordSalt: salt,
    passkeyEnabled: false,
    passkeyCredentialId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null
  };
  
  localStorage.setItem('auth_user', JSON.stringify(user));
  return user;
}

// Login with password
export async function loginWithPassword(email, password) {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) {
    throw new Error('No user found. Please create an account.');
  }
  
  const user = JSON.parse(userStr);
  
  if (user.email !== email) {
    throw new Error('Invalid email or password');
  }
  
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }
  
  const isValid = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  
  if (!isValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    
    // Save failed attempt to history
    try {
      const historyStr = localStorage.getItem('login_history');
      const history = historyStr ? JSON.parse(historyStr) : [];
      history.unshift({ time: new Date().toLocaleString(), ip: "local", status: "❌ Failed", role: "—", method: "password" });
      localStorage.setItem('login_history', JSON.stringify(history.slice(0, 20)));
    } catch {}
    
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Lock for 15 minutes
      localStorage.setItem('auth_user', JSON.stringify(user));
      throw new Error('Too many failed attempts. Account locked for 15 minutes.');
    }
    
    localStorage.setItem('auth_user', JSON.stringify(user));
    throw new Error('Invalid email or password');
  }
  
  // Successful login
  user.lastLoginAt = new Date().toISOString();
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  localStorage.setItem('auth_user', JSON.stringify(user));
  
  // Save to login history
  try {
    const historyStr = localStorage.getItem('login_history');
    const history = historyStr ? JSON.parse(historyStr) : [];
    history.unshift({
      time: new Date().toLocaleString(),
      ip: "local",
      status: "✅ Success",
      role: "Owner",
      method: "password"
    });
    localStorage.setItem('login_history', JSON.stringify(history.slice(0, 20)));
  } catch {}
  
  // Create session
  const session = {
    isAuthenticated: true,
    currentUserId: user.userId,
    lastActiveAt: new Date().toISOString(),
    sessionStartedAt: new Date().toISOString()
  };
  localStorage.setItem('auth_session', JSON.stringify(session));
  
  return user;
}

// Change password
export async function changePassword(currentPassword, newPassword) {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) {
    throw new Error('No user found');
  }
  
  const user = JSON.parse(userStr);
  const isValid = await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }
  
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }
  
  const newSalt = await generateSalt();
  const newPasswordHash = await hashPassword(newPassword, newSalt);
  
  user.passwordHash = newPasswordHash;
  user.passwordSalt = newSalt;
  user.updatedAt = new Date().toISOString();
  
  localStorage.setItem('auth_user', JSON.stringify(user));
  return user;
}

// Logout
export function logout() {
  localStorage.removeItem('auth_session');
  localStorage.removeItem('auth_activeTab');
  localStorage.removeItem('auth_activeSubtab');
}

// Restore session
export function restoreSession() {
  const sessionStr = localStorage.getItem('auth_session');
  if (!sessionStr) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionStr);
    
    // Check if session is still valid (optional: add session timeout)
    const sessionAge = Date.now() - new Date(session.sessionStartedAt).getTime();
    const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (sessionAge > SESSION_TIMEOUT) {
      logout();
      return null;
    }
    
    // Update last active
    session.lastActiveAt = new Date().toISOString();
    localStorage.setItem('auth_session', JSON.stringify(session));
    
    return session;
  } catch {
    logout();
    return null;
  }
}

// Update last active timestamp
export function updateLastActive() {
  const sessionStr = localStorage.getItem('auth_session');
  if (!sessionStr) return;
  
  try {
    const session = JSON.parse(sessionStr);
    session.lastActiveAt = new Date().toISOString();
    localStorage.setItem('auth_session', JSON.stringify(session));
  } catch {
    // Ignore errors
  }
}

// Get current user
export function getCurrentUser() {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Save active tab
export function saveActiveTab(tab, subtab = null) {
  localStorage.setItem('auth_activeTab', tab);
  if (subtab) {
    localStorage.setItem('auth_activeSubtab', subtab);
  } else {
    localStorage.removeItem('auth_activeSubtab');
  }
}

// Get active tab
export function getActiveTab() {
  return {
    tab: localStorage.getItem('auth_activeTab') || 'dashboard',
    subtab: localStorage.getItem('auth_activeSubtab') || null
  };
}

// Check if user exists
export function userExists() {
  return localStorage.getItem('auth_user') !== null;
}

// Password strength checker
export function checkPasswordStrength(password) {
  if (password.length < 8) {
    return { strength: 'weak', message: 'Password must be at least 8 characters' };
  }
  
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { strength: 'weak', message: 'Weak password - add numbers or symbols' };
  if (score <= 2) return { strength: 'medium', message: 'Medium password - consider adding more variety' };
  if (score <= 3) return { strength: 'strong', message: 'Strong password' };
  return { strength: 'very strong', message: 'Very strong password' };
}

// Check if passkeys are supported
export function isPasskeySupported() {
  return !!(window.PublicKeyCredential && 
           window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
           navigator.credentials);
}

// Register a passkey for the current user
export async function registerPasskey() {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) {
    throw new Error('No user found');
  }
  
  const user = JSON.parse(userStr);
  
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }
  
  try {
    // Convert user ID to Uint8Array
    const userId = new TextEncoder().encode(user.userId);
    
    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: {
          name: 'Founder CRM',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: user.email,
          displayName: user.ownerName || user.email
        },
        pubKeyCredParams: [
              { type: "public-key", alg: -7 }, // ES256 (recommended)
              { type: "public-key", alg: -257 } // RS256 (fallback)
            ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred'
        },
        timeout: 60000
      }
    });
    
    if (credential) {
      user.passkeyEnabled = true;
      user.passkeyCredentialId = credential.id;
      user.updatedAt = new Date().toISOString();
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      return { success: true, credentialId: credential.id };
    }
    
    throw new Error('Passkey registration failed');
  } catch (err) {
    throw new Error(`Passkey registration failed: ${err.message}`);
  }
}

// Login with passkey
export async function loginWithPasskey() {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) {
    throw new Error('No user found');
  }
  
  const user = JSON.parse(userStr);
  
  if (!user.passkeyEnabled || !user.passkeyCredentialId) {
    throw new Error('Passkey is not enabled for this account');
  }
  
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }
  
  try {
    const userId = new TextEncoder().encode(user.userId);
    
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        rpId: window.location.hostname,
        allowCredentials: [{
          id: base64ToArrayBuffer(user.passkeyCredentialId),
          type: 'public-key'
        }],
        userVerification: 'preferred',
        timeout: 60000
      }
    });
    
    if (credential) {
      user.lastLoginAt = new Date().toISOString();
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      // Create session
      const session = {
        isAuthenticated: true,
        currentUserId: user.userId,
        lastActiveAt: new Date().toISOString(),
        sessionStartedAt: new Date().toISOString()
      };
      localStorage.setItem('auth_session', JSON.stringify(session));
      
      return user;
    }
    
    throw new Error('Passkey authentication failed');
  } catch (err) {
    throw new Error(`Passkey authentication failed: ${err.message}`);
  }
}

// Remove/disable passkey
export async function removePasskey() {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) {
    throw new Error('No user found');
  }
  
  const user = JSON.parse(userStr);
  
  user.passkeyEnabled = false;
  user.passkeyCredentialId = null;
  user.updatedAt = new Date().toISOString();
  
  localStorage.setItem('auth_user', JSON.stringify(user));
  
  return { success: true };
}

// Helper: Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
