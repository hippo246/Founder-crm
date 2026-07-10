import { useState, useEffect } from "react";
import { loginWithPassword, loginWithPasskey, isPasskeySupported } from "../../lib/auth.js";

const GRADIENT = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

const field = {
  width: "100%",
  padding: "11px 14px",
  fontSize: 14,
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  outline: "none",
  background: "#f8fafc",
  color: "#1e293b",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export default function LoginScreen({ onLogin, workspaces = [], selectedWorkspaceId = null, onWorkspaceSelect }) {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [usePasskey, setUsePasskey] = useState(false);
  const [error, setError]           = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);

  useEffect(() => {
    setPasskeySupported(isPasskeySupported());
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setPasskeyEnabled(user.passkeyEnabled || false);
      } catch {
        setPasskeyEnabled(false);
      }
    }
  }, []);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      if (!email || !password) {
        setError("Email and password are required");
        setIsLoading(false);
        return;
      }
      const user = await loginWithPassword(email, password);
      onLogin({ email: user.email, method: "password", user });
    } catch (err) {
      setError(err.message || "Login failed");
    }
    setIsLoading(false);
  };

  const handlePasskeyLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      if (!passkeySupported) {
        setError("Passkeys are not supported in this browser.");
        setIsLoading(false);
        return;
      }
      const user = await loginWithPasskey();
      onLogin({ email: user.email, method: "passkey", user });
    } catch (err) {
      setError(err.message || "Passkey authentication failed. Please try password login.");
    }
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: GRADIENT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(12px, 3vw, 24px)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background blobs */}
      <div aria-hidden className="blob blob-1" />
      <div aria-hidden className="blob blob-2" />

      <div style={{
        background: "#ffffff",
        borderRadius: "clamp(12px, 3vw, 24px)",
        padding: "clamp(20px, 5vw, 40px)",
        width: "100%",
        maxWidth: "clamp(320px, 90vw, 420px)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        position: "relative",
        zIndex: 1,
        boxSizing: "border-box",
      }}>
        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: "clamp(16px, 4vw, 32px)" }}>
          <div style={{
            width: "clamp(48px, 12vw, 56px)", 
            height: "clamp(48px, 12vw, 56px)",
            background: GRADIENT,
            borderRadius: "clamp(12px, 3vw, 14px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "clamp(22px, 6vw, 26px)",
            margin: "0 auto clamp(10px, 3vw, 14px)",
            boxShadow: "0 8px 24px rgba(102,126,234,0.35)",
          }}>🔐</div>
          <h1 style={{ margin: "0 0 clamp(4px, 1vw, 6px)", fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Welcome Back
          </h1>
          <p style={{ margin: 0, fontSize: "clamp(12px, 3vw, 13px)", color: "#64748b" }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Workspace switcher */}
        {workspaces.length > 1 && (
          <div style={{ marginBottom: "clamp(14px, 3vw, 18px)" }}>
            <label style={{ display: "block", fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 600, color: "#334155", marginBottom: "clamp(4px, 1vw, 6px)" }}>
              Workspace
            </label>
            <select
              value={selectedWorkspaceId || ""}
              onChange={e => onWorkspaceSelect && onWorkspaceSelect(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px",
                fontSize: 14,
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                outline: "none",
                background: "#f8fafc",
                color: "#1e293b",
                boxSizing: "border-box",
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: 36,
              }}
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.icon ? `${w.icon} ${w.name}` : w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div role="alert" style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "clamp(8px, 2vw, 12px)", marginBottom: "clamp(14px, 3vw, 18px)", fontSize: "clamp(12px, 3vw, 13px)", color: "#dc2626", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span aria-hidden>⚠️</span> {error}
          </div>
        )}

        {!usePasskey ? (
          <form onSubmit={handlePasswordLogin} noValidate>
            {/* Email */}
            <div style={{ marginBottom: "clamp(12px, 3vw, 16px)" }}>
              <label htmlFor="login-email" style={{ display: "block", fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 600, color: "#334155", marginBottom: "clamp(4px, 1vw, 6px)" }}>Email</label>
              <input
                id="login-email"
                style={{ ...field, borderColor: focusedField === "email" ? "#667eea" : "#e2e8f0", boxShadow: focusedField === "email" ? "0 0 0 3px rgba(102,126,234,0.15)" : "none" }}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "clamp(14px, 3vw, 18px)" }}>
              <label htmlFor="login-password" style={{ display: "block", fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 600, color: "#334155", marginBottom: "clamp(4px, 1vw, 6px)" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  style={{ ...field, borderColor: focusedField === "pw" ? "#667eea" : "#e2e8f0", boxShadow: focusedField === "pw" ? "0 0 0 3px rgba(102,126,234,0.15)" : "none", paddingRight: 44 }}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("pw")}
                  onBlur={() => setFocusedField(null)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw(p => !p)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "clamp(16px, 4vw, 17px)", color: "#94a3b8", padding: 4, lineHeight: 1 }}
                >{showPw ? "🙈" : "👁️"}</button>
              </div>
          </div>

            {/* Remember + forgot */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(18px, 4vw, 22px)", fontSize: "clamp(12px, 3vw, 13px)", flexWrap: "wrap", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#64748b" }}>
                <input type="checkbox" style={{ cursor: "pointer", accentColor: "#667eea" }} />
                Remember me
              </label>
              <a href="#" style={{ color: "#667eea", textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%", 
                padding: "clamp(11px, 3vw, 13px)", 
                fontSize: "clamp(14px, 3.5vw, 15px)", 
                fontWeight: 600,
                borderRadius: 10, 
                border: "none", 
                cursor: isLoading ? "not-allowed" : "pointer",
                background: isLoading ? "#94a3b8" : GRADIENT,
                color: "#fff", 
                transition: "opacity 0.15s",
                opacity: isLoading ? 0.8 : 1,
              }}
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "clamp(20px, 5vw, 28px) 0" }}>
            <button
              onClick={handlePasskeyLogin}
              disabled={isLoading}
              aria-label="Authenticate with passkey"
              style={{
                width: "clamp(60px, 15vw, 72px)", 
                height: "clamp(60px, 15vw, 72px)", 
                background: GRADIENT, 
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "clamp(28px, 7vw, 32px)", 
                margin: "0 auto clamp(12px, 3vw, 16px)", 
                border: "none",
                boxShadow: "0 10px 30px rgba(102,126,234,0.3)",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = "scale(1.07)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >🔑</button>
            <h3 style={{ margin: "0 0 clamp(4px, 1vw, 6px)", fontSize: "clamp(15px, 4vw, 17px)", fontWeight: 700, color: "#334155" }}>Use Passkey</h3>
            <p style={{ margin: "0 0 clamp(18px, 4vw, 22px)", fontSize: "clamp(12px, 3vw, 13px)", color: "#64748b" }}>Sign in with your fingerprint, face, or device PIN</p>
            <button
              onClick={handlePasskeyLogin}
              disabled={isLoading}
              style={{
                padding: "clamp(11px, 3vw, 13px) clamp(20px, 5vw, 28px)", 
                fontSize: "clamp(14px, 3.5vw, 15px)", 
                fontWeight: 600, 
                borderRadius: 10,
                border: "none", 
                cursor: isLoading ? "not-allowed" : "pointer",
                background: isLoading ? "#94a3b8" : GRADIENT, 
                color: "#fff",
              }}
            >
              {isLoading ? "Authenticating…" : "Authenticate with Passkey"}
            </button>
          </div>
        )}

        {/* Divider */}
        {passkeySupported && (
          <div style={{ display: "flex", alignItems: "center", margin: "clamp(16px, 4vw, 20px) 0", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            <span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>
        )}

        {passkeySupported && (
          <button
            onClick={() => { setUsePasskey(p => !p); setError(""); }}
            disabled={isLoading || !passkeyEnabled}
            style={{
              width: "100%", 
              padding: "clamp(10px, 2.5vw, 11px)", 
              fontSize: "clamp(12px, 3vw, 13px)", 
              fontWeight: 500,
              borderRadius: 10, 
              border: "1.5px solid #e2e8f0", 
              background: "#f8fafc",
              color: passkeyEnabled ? "#334155" : "#94a3b8", 
              cursor: isLoading || !passkeyEnabled ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!isLoading && passkeyEnabled) e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; }}
          >
            {usePasskey ? "🔐 Use Password Instead" : "🔑 Use Passkey Instead"}
          </button>
        )}

        <p style={{ marginTop: "clamp(16px, 4vw, 20px)", textAlign: "center", fontSize: "clamp(10px, 2.5vw, 11px)", color: "#94a3b8" }}>
          Local encryption enabled • Data stored on your device
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        .blob {
          position: absolute;
          pointer-events: none;
          animation: float 6s ease-in-out infinite;
        }
        
        .blob-1 {
          width: clamp(150px, 40vw, 350px);
          height: clamp(150px, 40vw, 350px);
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          top: -10%;
          left: -10%;
        }
        
        .blob-2 {
          width: clamp(120px, 30vw, 280px);
          height: clamp(120px, 30vw, 280px);
          background: rgba(255,255,255,0.08);
          border-radius: 50%;
          bottom: -5%;
          right: -5%;
          animation: float 8s ease-in-out infinite reverse;
        }
        
        /* Hide blobs on very small screens */
        @media (max-width: 380px) {
          .blob {
            display: none;
          }
        }
        
        /* Prevent iOS auto-zoom on input focus */
        @media (max-width: 480px) {
          input[type="email"], 
          input[type="password"], 
          input[type="text"] {
            font-size: 16px !important;
          }
        }
        
        /* Extra small screens */
        @media (max-width: 360px) {
          input[type="email"], 
          input[type="password"], 
          input[type="text"] {
            padding: 10px 12px !important;
          }
        }
        
        /* Landscape orientation on mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .blob {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
