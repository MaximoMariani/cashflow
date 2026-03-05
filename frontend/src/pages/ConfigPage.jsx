import { useState, useEffect } from "react";
import { Card, PageHeader } from "../components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS, iStyle, lStyle } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";

// ── Tarjeta de suscripción ────────────────────────────────────────────────────
function SubscriptionCard() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [btnLoad, setBtnLoad] = useState(false);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res  = await fetch("/api/billing/status", { headers: { "x-user-id": session.user.id } });
      const data = await res.json();
      setStatus(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCheckout = async () => {
    setBtnLoad(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": session.user.id, "x-user-email": session.user.email },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); }
    setBtnLoad(false);
  };

  const handlePortal = async () => {
    setBtnLoad(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch("/api/billing/portal", { method: "POST", headers: { "x-user-id": session.user.id } });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); }
    setBtnLoad(false);
  };

  const getTiempoRestante = () => {
    if (!status?.trialEndsAt) return { horas: 0, dias: 0, label: "0 horas" };
    const diff = Math.max(0, new Date(status.trialEndsAt) - new Date());
    const horas = Math.ceil(diff / (1000 * 60 * 60));
    const dias  = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (horas <= 24) return { horas, dias, label: `${horas} hora${horas !== 1 ? "s" : ""}` };
    return { horas, dias, label: `${dias} día${dias !== 1 ? "s" : ""}` };
  };
  const tiempoRestante = getTiempoRestante();

  const planColors = {
    active:    { bg: "rgba(74,222,128,0.06)", border: "#4ade8033", badge: "#4ade80", label: "PRO ACTIVO" },
    trial:     { bg: "rgba(250,204,21,0.06)",  border: "#facc1533", badge: "#facc15", label: "TRIAL" },
    cancelled: { bg: "rgba(248,113,113,0.06)", border: "#f8717133", badge: "#f87171", label: "CANCELADO" },
    past_due:  { bg: "rgba(248,113,113,0.06)", border: "#f8717133", badge: "#f87171", label: "PAGO FALLIDO" },
  };
  const colors = planColors[status?.status] || planColors.trial;

  return (
    <Card>
      <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
        Mi suscripción
      </div>

      {loading ? (
        <div style={{ color: "var(--cf-text-dim)", fontSize: 13 }}>Cargando...</div>
      ) : (
        <>
          {/* Badge de plan */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "14px 16px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.badge, boxShadow: `0 0 8px ${colors.badge}`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.badge, letterSpacing: "0.08em" }}>{colors.label}</div>
              <div style={{ fontSize: 11, color: "var(--cf-text-dim)", marginTop: 2 }}>
                {status?.status === "active"    && "Suscripción mensual activa — ARS 33.999/mes"}
                {status?.status === "trial"     && `Trial — quedan ${tiempoRestante.label}`}
                {status?.status === "cancelled" && "Suscripción cancelada"}
                {status?.status === "past_due"  && "Problema con el último pago"}
              </div>
            </div>
          </div>

          {/* Info extra */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {status?.status === "trial" && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--cf-card-raised)", borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "var(--cf-text-faint)" }}>Tiempo de trial restante</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cf-text)", fontFamily: "'DM Mono',monospace" }}>{tiempoRestante.label}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--cf-card-raised)", borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: "var(--cf-text-faint)" }}>Plan</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cf-text)" }}>{status?.plan === "pro" ? "Pro" : "Free / Trial"}</span>
            </div>
            {status?.status === "active" && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--cf-card-raised)", borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "var(--cf-text-faint)" }}>Precio</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cf-text)", fontFamily: "'DM Mono',monospace" }}>ARS 33.999/mes</span>
              </div>
            )}
          </div>

          {/* Botón acción */}
          {status?.status === "active" ? (
            <button onClick={handlePortal} disabled={btnLoad} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "1px solid var(--cf-border-mid)", background: "transparent", color: "var(--cf-text-faint)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {btnLoad ? "Abriendo portal..." : "Gestionar / Cancelar suscripción"}
            </button>
          ) : (
            <button onClick={handleCheckout} disabled={btnLoad} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "var(--cf-text)", color: "var(--cf-bg)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {btnLoad ? "Redirigiendo..." : status?.status === "trial" ? "Activar Plan Pro — ARS 33.999/mes" : "Reactivar suscripción"}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

// ── Preview del semáforo ──────────────────────────────────────────────────────
function SemaforoPreview({ verde, amarillo }) {
  const casos = [
    { label: "Verde",    saldo: parseFloat(verde) },
    { label: "Amarillo", saldo: (parseFloat(verde) + parseFloat(amarillo)) / 2 },
    { label: "Rojo",     saldo: parseFloat(amarillo) - 1 },
  ];
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      {casos.map(({ label, saldo }) => {
        const sem = getSemaforo(saldo, parseFloat(verde), parseFloat(amarillo));
        const col = SEMAFORO_COLORS[sem];
        return (
          <div key={label} style={{
            flex: 1, padding: "12px 14px", borderRadius: 8,
            background: `rgba(${sem === "verde" ? "74,222,128" : sem === "amarillo" ? "250,204,21" : "248,113,113"},0.06)`,
            border: `1px solid ${col}33`,
            display: "flex", flexDirection: "column", gap: 6, alignItems: "center"
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, boxShadow: `0 0 8px ${col}` }} />
            <div style={{ fontSize: 11, color: col, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textAlign: "center" }}>
              {label === "Verde"    && `≥ ${fmt(verde)}`}
              {label === "Amarillo" && `≥ ${fmt(amarillo)} y < ${fmt(verde)}`}
              {label === "Rojo"     && `< ${fmt(amarillo)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ConfigPage({ data }) {
  const { financialSettings, saveFinancialSettings } = data;

  const [verde,    setVerde]    = useState("");
  const [amarillo, setAmarillo] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [err,      setErr]      = useState("");

  // Inicializa los campos cuando llegan los settings
  useEffect(() => {
    if (financialSettings) {
      setVerde(String(financialSettings.umbral_verde ?? 1000000));
      setAmarillo(String(financialSettings.umbral_amarillo ?? 200000));
    }
  }, [financialSettings]);

  const handleSave = async () => {
    setErr("");
    setSuccess(false);
    const v = parseFloat(verde);
    const a = parseFloat(amarillo);
    if (isNaN(v) || isNaN(a))       { setErr("Los valores deben ser números."); return; }
    if (v <= 0 || a <= 0)           { setErr("Los umbrales deben ser mayores a 0."); return; }
    if (v <= a)                     { setErr("El umbral Verde debe ser mayor que el umbral Amarillo."); return; }
    setSaving(true);
    try {
      await saveFinancialSettings({ umbral_verde: v, umbral_amarillo: a });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const verdeParsed    = parseFloat(verde)    || 0;
  const amarilloParsed = parseFloat(amarillo) || 0;
  const valid = verdeParsed > 0 && amarilloParsed > 0 && verdeParsed > amarilloParsed;

  return (
    <div>
      <PageHeader pre="Sistema" title="Configuración" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 860 }}>

        {/* ── Panel principal ────────────────────────────────────────────── */}
        <Card>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
              Parámetros financieros
            </div>
            <div style={{ fontSize: 14, color: "var(--cf-text-sub)", fontWeight: 600 }}>Semáforo de Caja</div>
            <div style={{ fontSize: 12, color: "var(--cf-text-faint)", marginTop: 4, lineHeight: 1.5 }}>
              Definí los umbrales que determinan cuándo el saldo es saludable, en riesgo o crítico.
            </div>
          </div>

          {/* Umbral Verde */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...lStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cf-positive)", display: "inline-block", boxShadow: "0 0 6px #4ade80" }} />
              Umbral Verde — saldo saludable ($)
            </label>
            <input
              type="number"
              value={verde}
              onChange={e => { setVerde(e.target.value); setErr(""); setSuccess(false); }}
              placeholder="1000000"
              style={{
                ...iStyle,
                borderColor: verde && parseFloat(verde) <= (parseFloat(amarillo) || 0) ? "var(--cf-negative-glow)" : "var(--cf-border-mid)"
              }}
            />
            <div style={{ fontSize: 11, color: "var(--cf-border-hi)", marginTop: 5 }}>
              Saldo ≥ {verdeParsed > 0 ? fmt(verdeParsed) : "…"} → verde
            </div>
          </div>

          {/* Umbral Amarillo */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ ...lStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cf-warning)", display: "inline-block", boxShadow: "0 0 6px #facc15" }} />
              Umbral Amarillo — saldo en riesgo ($)
            </label>
            <input
              type="number"
              value={amarillo}
              onChange={e => { setAmarillo(e.target.value); setErr(""); setSuccess(false); }}
              placeholder="200000"
              style={{
                ...iStyle,
                borderColor: amarillo && parseFloat(amarillo) >= (parseFloat(verde) || 0) ? "var(--cf-negative-glow)" : "var(--cf-border-mid)"
              }}
            />
            <div style={{ fontSize: 11, color: "var(--cf-border-hi)", marginTop: 5 }}>
              Saldo ≥ {amarilloParsed > 0 ? fmt(amarilloParsed) : "…"} y &lt; {verdeParsed > 0 ? fmt(verdeParsed) : "…"} → amarillo
            </div>
          </div>

          {/* Zona roja informativa */}
          <div style={{ background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-tint)", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cf-negative)", flexShrink: 0, boxShadow: "0 0 6px #f87171" }} />
              <div>
                <div style={{ fontSize: 12, color: "var(--cf-negative)", fontWeight: 600 }}>Zona Roja — liquidez crítica</div>
                <div style={{ fontSize: 11, color: "var(--cf-text-dim)", marginTop: 2 }}>
                  Saldo &lt; {amarilloParsed > 0 ? fmt(amarilloParsed) : "umbral amarillo"} → rojo (calculado automáticamente)
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div style={{ background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--cf-negative)" }}>⚠ {err}</div>
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div style={{ background: "var(--cf-positive-tint)", border: "1px solid var(--cf-positive-glow)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--cf-positive)" }}>✓ Configuración guardada correctamente.</div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !valid}
            style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none",
              background: valid ? "var(--cf-accent-tint)" : "var(--cf-card-raised)",
              border: `1px solid ${valid ? "var(--cf-accent-glow)" : "var(--cf-border-mid)"}`,
              color: valid ? "var(--cf-accent)" : "var(--cf-border-hi)",
              fontSize: 14, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed",
              transition: "all 0.15s", opacity: saving ? 0.6 : 1
            }}
            onMouseEnter={e => { if (valid && !saving) { e.currentTarget.style.background = "var(--cf-accent-glow)"; }}}
            onMouseLeave={e => { if (valid) { e.currentTarget.style.background = "var(--cf-accent-tint)"; }}}
          >
            {saving ? "Guardando…" : "Guardar parámetros"}
          </button>
        </Card>

        {/* ── Panel lateral: preview + info ─────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Preview visual */}
          <Card>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
              Vista previa del semáforo
            </div>
            {valid
              ? <SemaforoPreview verde={verde} amarillo={amarillo} />
              : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--cf-border-hi)", fontSize: 12 }}>
                  Ingresá valores válidos para ver la vista previa.
                </div>
              )
            }
          </Card>

          {/* Valores actuales guardados */}
          <Card>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
              Configuración actual guardada
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Umbral Verde",    value: financialSettings?.umbral_verde,    color: "var(--cf-positive)" },
                { label: "Umbral Amarillo", value: financialSettings?.umbral_amarillo, color: "var(--cf-warning)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--cf-card-raised)", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}` }} />
                    <span style={{ fontSize: 12, color: "var(--cf-text-faint)" }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>
                    {value != null ? fmt(parseFloat(value)) : "—"}
                  </span>
                </div>
              ))}
              {financialSettings?.updated_at && (
                <div style={{ fontSize: 10, color: "var(--cf-border-hi)", marginTop: 4, textAlign: "right" }}>
                  Última actualización: {new Date(financialSettings.updated_at).toLocaleString("es-AR")}
                </div>
              )}
            </div>
          </Card>

          {/* Nota informativa */}
          <div style={{ background: "var(--cf-sidebar)", border: "1px solid #1a2236", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--cf-text-dim)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--cf-text-faint)" }}>¿Cómo impacta?</strong><br />
              Los umbrales se aplican en tiempo real al semáforo del sidebar, a los KPIs del Dashboard y a las alertas de cashflow.
              Si no configuraste valores, el sistema usa los defaults: Verde ≥ $1M, Amarillo ≥ $200K.
            </div>
          </div>

          {/* Suscripción */}
          <SubscriptionCard />
        </div>
      </div>
    </div>
  );
}
