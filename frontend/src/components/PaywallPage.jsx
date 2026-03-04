import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function PaywallPage({ onLogout }) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Verificar si acaba de volver de un checkout exitoso
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      // Recargar para que App.jsx vuelva a verificar el estado
      setTimeout(() => window.location.reload(), 1000);
    }
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/billing/status", {
        headers: { "x-user-id": session.user.id }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) { console.error(err); }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-email": session.user.email,
        },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "x-user-id": session.user.id },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setPortalLoading(false);
  };

  const isCancelled = status?.status === "cancelled" || status?.status === "past_due";

  return (
    <div style={{
      minHeight: "100vh", background: "var(--cf-bg)", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: 420, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "var(--cf-sidebar)", border: "1px solid var(--cf-border-mid)", borderRadius: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>◉</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--cf-text-dim)", textTransform: "uppercase", marginBottom: 4 }}>Gestión</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--cf-text)", letterSpacing: "-0.03em" }}>CashFlow</div>
        </div>

        {/* Card principal */}
        <div style={{ background: "var(--cf-card)", border: "1px solid #1a2236", borderRadius: 20, padding: "36px 32px", textAlign: "center" }}>

          {isCancelled ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cf-text)", marginBottom: 8 }}>
                Suscripción pausada
              </div>
              <div style={{ fontSize: 13, color: "var(--cf-text-dim)", marginBottom: 28, lineHeight: 1.6 }}>
                {status?.status === "past_due"
                  ? "Hubo un problema con tu último pago. Actualizá tu método de pago para continuar."
                  : "Tu suscripción fue cancelada. Podés reactivarla cuando quieras."
                }
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cf-text)", marginBottom: 8 }}>
                Tu período de prueba venció
              </div>
              <div style={{ fontSize: 13, color: "var(--cf-text-dim)", marginBottom: 28, lineHeight: 1.6 }}>
                Para seguir usando CashFlow y acceder a todas las funciones, activá tu suscripción.
              </div>
            </>
          )}

          {/* Precio */}
          <div style={{ background: "var(--cf-sidebar)", border: "1px solid var(--cf-border-mid)", borderRadius: 14, padding: "20px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--cf-text-dim)", textTransform: "uppercase", marginBottom: 8 }}>Plan Pro</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--cf-text-faint)", fontWeight: 500 }}>ARS</span>
              <span style={{ fontSize: 38, fontWeight: 800, color: "var(--cf-text)", letterSpacing: "-0.03em" }}>33.999</span>
              <span style={{ fontSize: 13, color: "var(--cf-text-dim)" }}>/mes</span>
            </div>
            {/* Features */}
            {["Movimientos y transacciones ilimitados", "Proyecciones y escenarios", "Análisis y reportes", "Obligaciones y vencimientos", "Fondos de inversión", "Soporte prioritario"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, textAlign: "left" }}>
                <span style={{ color: "#4ade80", fontSize: 13 }}>✓</span>
                <span style={{ fontSize: 12, color: "var(--cf-text-faint)" }}>{f}</span>
              </div>
            ))}
          </div>

          <button
            onClick={isCancelled ? handlePortal : handleSubscribe}
            disabled={loading || portalLoading}
            style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: loading || portalLoading ? "var(--cf-border-mid)" : "var(--cf-text)",
              color: loading || portalLoading ? "var(--cf-text-dim)" : "var(--cf-bg)",
              fontSize: 15, fontWeight: 700, cursor: loading || portalLoading ? "default" : "pointer",
              transition: "all 0.2s", marginBottom: 12,
            }}>
            {loading ? "Redirigiendo a Stripe..." :
             portalLoading ? "Abriendo portal..." :
             isCancelled ? "Gestionar suscripción" : "Suscribirme ahora →"}
          </button>

          {!isCancelled && status?.stripeSubscriptionId && (
            <button onClick={handlePortal} disabled={portalLoading}
              style={{ background: "none", border: "none", color: "var(--cf-text-dim)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
              Gestionar suscripción existente
            </button>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={onLogout}
            style={{ background: "none", border: "none", color: "var(--cf-border-mid)", fontSize: 11, cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
