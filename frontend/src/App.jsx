import { useState } from "react";
import { useData } from "./hooks/useData.js";
import { Spinner, ErrorBanner } from "./components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS } from "./lib/utils.js";
import TxModal from "./components/TxModal.jsx";
import LoginPage from "./components/LoginPage.jsx";

import DashboardPage    from "./pages/DashboardPage.jsx";
import MovimientosPage  from "./pages/MovimientosPage.jsx";
import EscenariosPage   from "./pages/ProyeccionesPage.jsx";
import ObligacionesPage from "./pages/ObligacionesPage.jsx";
import FondosPage       from "./pages/FondosPage.jsx";
import AnalisisPage     from "./pages/AnalisisPage.jsx";
import CuentasPage      from "./pages/CuentasPage.jsx";

const NAV = [
  { id: "dashboard",    label: "Dashboard",      icon: "⬡" },
  { id: "movimientos",  label: "Movimientos",     icon: "≡" },
  { id: "escenarios",   label: "Escenarios",      icon: "◌" },
  { id: "obligaciones", label: "Obligaciones",    icon: "◈" },
  { id: "fondos",       label: "Fondos & Cobros", icon: "◉" },
  { id: "analisis",     label: "Análisis",        icon: "◫" },
  { id: "cuentas",      label: "Cuentas",         icon: "◎" },
];

export default function App() {
  const savedUser = sessionStorage.getItem("cf_user");
  const [user, setUser] = useState(savedUser || null);

  const data = useData();
  const [view, setView] = useState("dashboard");
  const [showGlobalAdd, setShowGlobalAdd] = useState(false);

  const { transactions, loading, error, reload, cuentas, addTransaction } = data;

  const saldo = transactions.reduce((a, t) => a + parseFloat(t.monto || 0), 0);
  const semaforo = getSemaforo(saldo);

  const handleLogout = () => {
    sessionStorage.removeItem("cf_user");
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div style={{ minHeight: "100vh", background: "#060a10", color: "#f8fafc", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: "flex" }}>

      {/* SIDEBAR */}
      <div style={{ width: 230, background: "#080d14", borderRight: "1px solid #1a2236", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Gestión</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em" }}>CashFlow</div>
        </div>

        {NAV.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? "#111827" : "transparent",
            border: view === v.id ? "1px solid #1e293b" : "1px solid transparent",
            color: view === v.id ? "#f8fafc" : "#64748b",
            padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left",
            fontSize: 13, fontWeight: view === v.id ? 600 : 400, transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 10, width: "100%"
          }}
            onMouseEnter={e => { if (view !== v.id) e.currentTarget.style.color = "#94a3b8"; }}
            onMouseLeave={e => { if (view !== v.id) e.currentTarget.style.color = "#64748b"; }}
          >
            <span style={{ fontSize: 14, opacity: 0.6 }}>{v.icon}</span>
            {v.label}
          </button>
        ))}

        {/* Semáforo */}
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #1a2236" }}>
          <div style={{ fontSize: 11, color: "#334155", marginBottom: 6 }}>Semáforo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: SEMAFORO_COLORS[semaforo], boxShadow: `0 0 8px ${SEMAFORO_COLORS[semaforo]}` }} />
            <span style={{ fontSize: 12, color: SEMAFORO_COLORS[semaforo], fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{semaforo}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>
            {loading ? "—" : fmt(saldo)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #111827" }}>
            <div>
              <div style={{ fontSize: 11, color: "#334155", marginBottom: 2 }}>Usuario</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{user}</div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" style={{ background: "none", border: "1px solid #1a2236", color: "#334155", cursor: "pointer", padding: "5px 8px", borderRadius: 6, fontSize: 11, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#64748b"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a2236"; e.currentTarget.style.color = "#334155"; }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto", minHeight: "100vh" }}>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading ? <Spinner /> : (
          <>
            {view === "dashboard"    && <DashboardPage    data={data} onAdd={() => setShowGlobalAdd(true)} onGoEscenarios={() => setView("escenarios")} />}
            {view === "movimientos"  && <MovimientosPage  data={data} />}
            {view === "escenarios"   && <EscenariosPage   data={data} />}
            {view === "obligaciones" && <ObligacionesPage data={data} />}
            {view === "fondos"       && <FondosPage       data={data} />}
            {view === "analisis"     && <AnalisisPage     data={data} />}
            {view === "cuentas"      && <CuentasPage      data={data} />}
          </>
        )}
      </div>

      {showGlobalAdd && (
        <TxModal tx={null} cuentas={cuentas} onSave={addTransaction} onClose={() => setShowGlobalAdd(false)} />
      )}
    </div>
  );
}
