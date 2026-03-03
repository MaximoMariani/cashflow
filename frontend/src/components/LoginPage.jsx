import { useState } from "react";
import { iStyle, lStyle } from "../lib/utils.js";

const CORRECT_PASSWORD = "changeme";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!username.trim()) { setErr("Ingresá un nombre de usuario"); return; }
    if (password !== CORRECT_PASSWORD) { setErr("Contraseña incorrecta"); return; }
    setLoading(true);
    setTimeout(() => {
      sessionStorage.setItem("cf_user", username.trim());
      onLogin(username.trim());
    }, 400);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

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

        {/* Card */}
        <div style={{ background: "var(--cf-card)", border: "1px solid #1a2236", borderRadius: 16, padding: "32px" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--cf-text-sub)", marginBottom: 6 }}>Iniciá sesión</div>
          <div style={{ fontSize: 12, color: "var(--cf-text-dim)", marginBottom: 28 }}>Acceso interno — Oficina</div>

          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setErr(""); }}
              onKeyDown={handleKey}
              placeholder="Tu nombre"
              autoFocus
              style={{ ...iStyle, fontSize: 14 }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErr(""); }}
              onKeyDown={handleKey}
              placeholder="••••••••"
              style={{ ...iStyle, fontSize: 14 }}
            />
          </div>

          {err && (
            <div style={{ background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--cf-negative)" }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", background: loading ? "var(--cf-border-mid)" : "var(--cf-text)",
              color: loading ? "var(--cf-text-dim)" : "var(--cf-bg)",
              border: "none", padding: "13px", borderRadius: 8,
              cursor: loading ? "default" : "pointer",
              fontSize: 14, fontWeight: 700, transition: "all 0.2s",
              letterSpacing: "0.01em"
            }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--cf-border-mid)" }}>
          Acceso restringido — Solo personal autorizado
        </div>
      </div>
    </div>
  );
}
