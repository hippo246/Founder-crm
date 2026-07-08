// ─── Session Lock ───────────────────────────────────────────────────────────────────

let sessionLocked = false;
let sessionTimer = null;
let lastActivity = Date.now();

export const initSessionLock = (timeoutMinutes, onLock) => {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  const resetTimer = () => {
    lastActivity = Date.now();
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
      sessionLocked = true;
      if (onLock) onLock();
    }, timeoutMs);
  };
  
  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetTimer);
  });
  
  resetTimer();
  
  return () => {
    if (sessionTimer) clearTimeout(sessionTimer);
    events.forEach(event => {
      document.removeEventListener(event, resetTimer);
    });
  };
};

export const isSessionLocked = () => sessionLocked;

export const unlockSession = () => {
  sessionLocked = false;
  lastActivity = Date.now();
};

export const requireConfirmation = (settings, actionType) => {
  if (!settings.requireConfirm) return false;
  
  const sensitiveActions = ['delete', 'reset', 'clear', 'remove'];
  return sensitiveActions.some(action => actionType.toLowerCase().includes(action));
};

export const requireRoleVerification = (settings, actionType) => {
  if (!settings.lockSensitiveActions) return false;
  
  const criticalActions = ['delete', 'reset', 'clear', 'export', 'import'];
  return criticalActions.some(action => actionType.toLowerCase().includes(action));
};
