import { useState } from "react";
import { iStyle, lStyle } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";

// "mode" alterna entre "login" y "signup"
export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [err, setErr]           = useState("");
  const [info, setInfo]         = useState("");
  const [loading, setLoading]   = useState(false);

  const reset = () => { setErr(""); setInfo(""); };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim())    { setErr("Ingresá tu email");      return; }
    if (!password)        { setErr("Ingresá tu contraseña"); return; }
    setLoading(true); reset();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErr(traducirError(error.message));
      setLoading(false);
      return;
    }

    const userEmail = data.user?.email || email;
    sessionStorage.setItem("cf_user", userEmail);
    onLogin(userEmail);
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!email.trim())         { setErr("Ingresá tu email");              return; }
    if (password.length < 6)   { setErr("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm)  { setErr("Las contraseñas no coinciden");  return; }
    setLoading(true); reset();

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setErr(traducirError(error.message));
      setLoading(false);
      return;
    }

    // Si Supabase tiene confirmación de email activada, session es null
    if (data.session) {
      const userEmail = data.user?.email || email;
      sessionStorage.setItem("cf_user", userEmail);
      onLogin(userEmail);
    } else {
      setLoading(false);
      setInfo("¡Cuenta creada! Revisá tu email para confirmar y luego iniciá sesión.");
      setMode("login");
      setPassword(""); setConfirm("");
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") mode === "login" ? handleLogin() : handleSignUp();
  };

  const switchMode = (m) => { setMode(m); reset(); setPassword(""); setConfirm(""); };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--cf-bg)", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif"
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: "radial-gradient(circle, var(--cf-neutral-tint) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: 380, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "var(--cf-sidebar)", border: "1px solid var(--cf-border-mid)", borderRadius: 16, marginBottom: 20 }}>
            <span style={{ fontSize: 24 }}>◉</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--cf-text-dim)", textTransform: "uppercase", marginBottom: 6 }}>Gestión</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--cf-text)", letterSpacing: "-0.03em" }}>CashFlow</div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "var(--cf-card)", border: "1px solid #1a2236", borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 }}>
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                background: mode === m ? "var(--cf-sidebar)" : "transparent",
                color: mode === m ? "var(--cf-text)" : "var(--cf-text-dim)",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {m === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "var(--cf-card)", border: "1px solid #1a2236", borderRadius: 16, padding: "32px" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--cf-text-sub)", marginBottom: 6 }}>
            {mode === "login" ? "Iniciá sesión" : "Crear cuenta"}
          </div>
          <div style={{ fontSize: 12, color: "var(--cf-text-dim)", marginBottom: 28 }}>
            {mode === "login" ? "Acceso interno — Oficina" : "Registrate con tu email"}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); reset(); }}
              onKeyDown={handleKey}
              placeholder="tu@email.com"
              autoFocus
              style={{ ...iStyle, fontSize: 14 }}
            />
          </div>

          <div style={{ marginBottom: mode === "signup" ? 16 : 24 }}>
            <label style={lStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); reset(); }}
              onKeyDown={handleKey}
              placeholder="••••••••"
              style={{ ...iStyle, fontSize: 14 }}
            />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 24 }}>
              <label style={lStyle}>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); reset(); }}
                onKeyDown={handleKey}
                placeholder="••••••••"
                style={{ ...iStyle, fontSize: 14 }}
              />
            </div>
          )}

          {err && (
            <div style={{ background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--cf-negative)" }}>
              {err}
            </div>
          )}

          {info && (
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#4ade80" }}>
              {info}
            </div>
          )}

          <button
            onClick={mode === "login" ? handleLogin : handleSignUp}
            disabled={loading}
            style={{
              width: "100%", background: loading ? "var(--cf-border-mid)" : "var(--cf-text)",
              color: loading ? "var(--cf-text-dim)" : "var(--cf-bg)",
              border: "none", padding: "13px", borderRadius: 8,
              cursor: loading ? "default" : "pointer",
              fontSize: 14, fontWeight: 700, transition: "all 0.2s",
              letterSpacing: "0.01em"
            }}>
            {loading
              ? (mode === "login" ? "Ingresando..." : "Creando cuenta...")
              : (mode === "login" ? "Ingresar" : "Registrarse")
            }
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--cf-border-mid)" }}>
          Acceso restringido — Solo personal autorizado
        </div>
      </div>
    </div>
  );
}

function traducirError(msg) {
  if (!msg) return "Error desconocido";
  if (msg.includes("Invalid login credentials"))   return "Email o contraseña incorrectos";
  if (msg.includes("Email not confirmed"))          return "Confirmá tu email antes de ingresar";
  if (msg.includes("User already registered"))      return "Este email ya tiene una cuenta. Iniciá sesión.";
  if (msg.includes("Password should be"))           return "La contraseña debe tener al menos 6 caracteres";
  if (msg.includes("Unable to validate"))           return "Email o contraseña incorrectos";
  if (msg.includes("rate limit"))                   return "Demasiados intentos. Esperá unos minutos.";
  return msg;
}
