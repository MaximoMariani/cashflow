import { useState, useEffect } from "react";
import { useData } from "./hooks/useData.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useTheme } from "./hooks/useTheme.js";
import { Spinner, ErrorBanner } from "./components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS } from "./lib/utils.js";
import TxModal from "./components/TxModal.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { supabase } from "./lib/supabaseClient.js";

import DashboardPage    from "./pages/DashboardPage.jsx";
import MovimientosPage  from "./pages/MovimientosPage.jsx";
import EscenariosPage   from "./pages/ProyeccionesPage.jsx";
import ObligacionesPage from "./pages/ObligacionesPage.jsx";
import FondosPage       from "./pages/FondosPage.jsx";
import AnalisisPage     from "./pages/AnalisisPage.jsx";
import CuentasPage      from "./pages/CuentasPage.jsx";
import ConfigPage       from "./pages/ConfigPage.jsx";

const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: "⬡" },
  { id: "movimientos",  label: "Movimientos",  icon: "≡" },
  { id: "escenarios",   label: "Escenarios",   icon: "◌" },
  { id: "obligaciones", label: "Obligaciones", icon: "◈" },
  { id: "fondos",       label: "Fondos",       icon: "◉" },
  { id: "analisis",     label: "Análisis",     icon: "◫" },
  { id: "cuentas",      label: "Cuentas",      icon: "◎" },
];
const NAV_BOTTOM = [{ id: "config", label: "Configuración", icon: "⚙" }];

const LABELS = {
  dashboard: "Dashboard", movimientos: "Movimientos", escenarios: "Escenarios",
  obligaciones: "Obligaciones", fondos: "Fondos", analisis: "Análisis",
  cuentas: "Cuentas", config: "Configuración",
};

// ── Theme Toggle Button ───────────────────────────────────────────────────────
// Cycles: dark → light → system → dark
const THEME_ICONS  = { dark: "🌙", light: "☀️", system: "⚙" };
const THEME_LABELS = { dark: "Oscuro", light: "Claro", system: "Sistema" };
const THEME_CYCLE  = { dark: "light", light: "system", system: "dark" };

function ThemeToggle({ theme, setTheme, compact = false }) {
  const next = THEME_CYCLE[theme] || "dark";
  return (
    <button
      onClick={() => setTheme(next)}
      title={`Tema: ${THEME_LABELS[theme]} → cambiar a ${THEME_LABELS[next]}`}
      style={{
        display: "flex", alignItems: "center", gap: compact ? 0 : 6,
        background: "none",
        border: "1px solid var(--cf-border)",
        color: "var(--cf-text-muted)",
        cursor: "pointer", padding: compact ? "6px 8px" : "7px 12px",
        borderRadius: 7, fontSize: compact ? 14 : 12, fontWeight: 500,
        transition: "all 0.15s", WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ fontSize: 14 }}>{THEME_ICONS[theme]}</span>
      {!compact && <span style={{ fontSize: 11, color: "var(--cf-text-faint)" }}>{THEME_LABELS[theme]}</span>}
    </button>
  );
}

export default function App() {
  // Supabase session — undefined = cargando, null = sin sesión, string = logueado
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    // Recuperar sesión activa al cargar (persiste entre tabs/recargas)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const email = session.user.email;
        sessionStorage.setItem("cf_user", email);
        setUser(email);
      } else {
        // Fallback: si hay algo en sessionStorage (registro reciente sin confirmar)
        const saved = sessionStorage.getItem("cf_user");
        setUser(saved || null);
      }
    });

    // Escuchar cambios: login, logout, refresh de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const email = session.user.email;
        sessionStorage.setItem("cf_user", email);
        setUser(email);
      } else {
        sessionStorage.removeItem("cf_user");
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const data = useData();
  const [view, setView]             = useState("dashboard");
  const [showGlobalAdd, setShowGlobalAdd] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile                    = useIsMobile();
  const { theme, setTheme }         = useTheme();

  const { transactions, financialSettings, loading, error, reload, cuentas, addTransaction } = data;

  const saldo          = transactions.reduce((a, t) => a + parseFloat(t.monto || 0), 0);
  const umbralVerde    = parseFloat(financialSettings?.umbral_verde    ?? 1000000);
  const umbralAmarillo = parseFloat(financialSettings?.umbral_amarillo ?? 200000);
  const semaforo       = getSemaforo(saldo, umbralVerde, umbralAmarillo);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("cf_user");
    setUser(null);
  };

  // Mientras se verifica la sesión, mostrar spinner
  if (user === undefined) return (
    <div style={{ minHeight: "100vh", background: "var(--cf-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  const navigate = (id) => { setView(id); setDrawerOpen(false); };

  const navBtn = (id, label, icon) => (
    <button key={id} onClick={() => navigate(id)} style={{
      background: view === id ? "var(--cf-card-raised)" : "transparent",
      border: view === id ? "1px solid var(--cf-border-mid)" : "1px solid transparent",
      color: view === id ? "var(--cf-text)" : "var(--cf-text-faint)",
      padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left",
      fontSize: 13, fontWeight: view === id ? 600 : 400, transition: "all 0.15s",
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{ fontSize: 15, opacity: 0.65 }}>{icon}</span>
      {label}
    </button>
  );

  const semaforoSection = (
    <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--cf-border)" }}>
      <div style={{ fontSize: 11, color: "var(--cf-text-ghost)", marginBottom: 6 }}>Semáforo</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: SEMAFORO_COLORS[semaforo], boxShadow: `0 0 8px ${SEMAFORO_COLORS[semaforo]}` }} />
        <span style={{ fontSize: 12, color: SEMAFORO_COLORS[semaforo], fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{semaforo}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--cf-text-sub)", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>
        {loading ? "—" : fmt(saldo)}
      </div>
      <div style={{ fontSize: 10, color: "var(--cf-text-ghost)", marginBottom: 14, lineHeight: 1.5 }}>
        Verde ≥ {fmt(umbralVerde)}<br />
        Amarillo ≥ {fmt(umbralAmarillo)}
      </div>

      {/* Theme toggle in sidebar */}
      <div style={{ marginBottom: 12 }}>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--cf-border)" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--cf-text-ghost)", marginBottom: 2 }}>Usuario</div>
          <div style={{ fontSize: 12, color: "var(--cf-text-faint)", fontWeight: 500 }}>{user}</div>
        </div>
        <button onClick={handleLogout}
          style={{ background: "none", border: "1px solid var(--cf-border)", color: "var(--cf-text-ghost)", cursor: "pointer", padding: "6px 10px", borderRadius: 6, fontSize: 11 }}>
          Salir
        </button>
      </div>
    </div>
  );

  const sidebarInner = (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--cf-text-dim)", textTransform: "uppercase", marginBottom: 4 }}>Gestión</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cf-text)", letterSpacing: "-0.02em" }}>CashFlow</div>
      </div>
      {NAV.map(v => navBtn(v.id, v.label, v.icon))}
      <div style={{ height: 1, background: "var(--cf-border)", margin: "8px 0" }} />
      {NAV_BOTTOM.map(v => navBtn(v.id, v.label, v.icon))}
      {semaforoSection}
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--cf-bg)", color: "var(--cf-text)", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: "flex" }}>

      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
        <div style={{ width: 230, background: "var(--cf-sidebar)", borderRight: "1px solid var(--cf-border)", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          {sidebarInner}
        </div>
      )}

      {/* ── Mobile Drawer Overlay ── */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, backdropFilter: "blur(2px)" }}
        />
      )}

      {/* ── Mobile Drawer Panel ── */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, height: "100vh", width: 260,
          background: "var(--cf-sidebar)", borderRight: "1px solid var(--cf-border)",
          padding: "24px 18px", display: "flex", flexDirection: "column", gap: 4,
          zIndex: 300, overflowY: "auto",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--cf-text-dim)", textTransform: "uppercase", marginBottom: 3 }}>Gestión</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--cf-text)" }}>CashFlow</div>
            </div>
            <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "1px solid var(--cf-border-mid)", color: "var(--cf-text-faint)", cursor: "pointer", padding: "6px 9px", borderRadius: 6, fontSize: 14 }}>✕</button>
          </div>
          {NAV.map(v => navBtn(v.id, v.label, v.icon))}
          <div style={{ height: 1, background: "var(--cf-border)", margin: "8px 0" }} />
          {NAV_BOTTOM.map(v => navBtn(v.id, v.label, v.icon))}
          {semaforoSection}
        </div>
      )}

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--cf-sidebar)", borderBottom: "1px solid var(--cf-border)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setDrawerOpen(true)}
                style={{ background: "none", border: "1px solid var(--cf-border-mid)", color: "var(--cf-text-muted)", cursor: "pointer", padding: "7px 9px", borderRadius: 7, fontSize: 14, lineHeight: 1, WebkitTapHighlightColor: "transparent" }}>
                ☰
              </button>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--cf-text)", letterSpacing: "-0.02em" }}>
                {LABELS[view] || "CashFlow"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Semáforo mini */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", background: "var(--cf-card)", border: "1px solid var(--cf-border)", borderRadius: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: SEMAFORO_COLORS[semaforo] }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cf-text-sub)", fontFamily: "'DM Mono',monospace" }}>{fmt(saldo)}</span>
              </div>
              <ThemeToggle theme={theme} setTheme={setTheme} compact />
              <button onClick={() => setShowGlobalAdd(true)}
                style={{ background: "var(--cf-text)", color: "var(--cf-text-dark)", border: "none", padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, WebkitTapHighlightColor: "transparent" }}>
                +
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, padding: isMobile ? "20px 16px 80px" : "36px 40px", overflowY: "auto" }}>
          {error && <ErrorBanner message={error} onRetry={reload} />}
          {loading ? <Spinner /> : (
            <>
              {view === "dashboard"    && <DashboardPage    data={data} onAdd={() => setShowGlobalAdd(true)} onGoEscenarios={() => navigate("escenarios")} />}
              {view === "movimientos"  && <MovimientosPage  data={data} />}
              {view === "escenarios"   && <EscenariosPage   data={data} />}
              {view === "obligaciones" && <ObligacionesPage data={data} />}
              {view === "fondos"       && <FondosPage       data={data} />}
              {view === "analisis"     && <AnalisisPage     data={data} />}
              {view === "cuentas"      && <CuentasPage      data={data} />}
              {view === "config"       && <ConfigPage       data={data} />}
            </>
          )}
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "var(--cf-sidebar)", borderTop: "1px solid var(--cf-border)", display: "flex", justifyContent: "space-around", padding: "8px 4px 10px" }}>
            {NAV.slice(0, 5).map(v => (
              <button key={v.id} onClick={() => navigate(v.id)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 6px", borderRadius: 8, WebkitTapHighlightColor: "transparent", minWidth: 44 }}>
                <span style={{ fontSize: 17, color: view === v.id ? "var(--cf-text)" : "var(--cf-border-hi)" }}>{v.icon}</span>
                <span style={{ fontSize: 9, fontWeight: view === v.id ? 700 : 400, color: view === v.id ? "var(--cf-text-muted)" : "var(--cf-border-mid)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{v.label.slice(0, 6)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showGlobalAdd && (
        <TxModal tx={null} cuentas={cuentas} onSave={addTransaction} onClose={() => setShowGlobalAdd(false)} />
      )}
    </div>
  );
}
