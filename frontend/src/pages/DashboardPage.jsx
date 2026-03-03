import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Card, PageHeader, PrimaryBtn, SectionTitle } from "../components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS } from "../lib/utils.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

const TT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "10px 14px", borderRadius: 8 }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{payload[0]?.payload?.concepto}</p>
      <p style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600 }}>{fmt(payload[0]?.value)}</p>
      {payload[0]?.payload?.futuro && <p style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>escenario</p>}
    </div>
  );
};

// ── Alertas de cashflow ───────────────────────────────────────────────────────
function AlertasCashflow({ summary, umbralVerde, umbralAmarillo }) {
  const { liquidezActual, saldoConfirmadoConObligaciones, saldoProbableConObligaciones, periodo } = summary;
  const alertas = [];

  const semActual = getSemaforo(liquidezActual,                  umbralVerde, umbralAmarillo);
  const semConf   = getSemaforo(saldoConfirmadoConObligaciones, umbralVerde, umbralAmarillo);
  const semProb   = getSemaforo(saldoProbableConObligaciones,   umbralVerde, umbralAmarillo);

  if (semActual === "rojo")
    alertas.push({ nivel: "rojo",    msg: "Liquidez critica. Accion urgente requerida." });
  else if (semActual === "amarillo")
    alertas.push({ nivel: "amarillo", msg: "Atencion: liquidez por debajo del umbral verde." });
  else
    alertas.push({ nivel: "verde",    msg: "Liquidez saludable." });

  if (semConf === "rojo" && semActual !== "rojo")
    alertas.push({ nivel: "rojo", msg: "Descontando obligaciones confirmadas, el saldo cae a zona critica." });
  else if (semConf === "amarillo" && semActual === "verde")
    alertas.push({ nivel: "amarillo", msg: "Obligaciones confirmadas comprimen el saldo disponible." });

  if (semProb === "rojo" && semConf !== "rojo")
    alertas.push({ nivel: "amarillo", msg: "Si se materializan las obligaciones probables, cae a zona de riesgo." });

  const colors = {
    verde:    { bg: "rgba(74,222,128,0.06)",  border: "rgba(74,222,128,0.2)",  text: "#4ade80" },
    amarillo: { bg: "rgba(250,204,21,0.06)",  border: "rgba(250,204,21,0.2)",  text: "#facc15" },
    rojo:     { bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)", text: "#f87171" },
  };

  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionTitle>Estado del Cashflow</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alertas.map((a, i) => {
          const c = colors[a.nivel];
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{a.msg}</span>
            </div>
          );
        })}
        {periodo?.inicio && (
          <div style={{ fontSize: 11, color: "#334155", paddingTop: 8, borderTop: "1px solid #111827" }}>
            Periodo: {periodo.inicio} — {periodo.fin} ({periodo.label})
          </div>
        )}
      </div>
    </Card>
  );
}

export default function DashboardPage({ data, onAdd, onGoEscenarios }) {
  const { transactions, proyecciones, dashboardSummary, financialSettings } = data;
  const isMobile = useIsMobile();
  const today = new Date().toISOString().slice(0, 10);

  // Umbrales del semáforo (configurables)
  const umbralVerde    = parseFloat(financialSettings?.umbral_verde    ?? 1000000);
  const umbralAmarillo = parseFloat(financialSettings?.umbral_amarillo ?? 200000);

  // ── Métricas: todas vienen del backend (dashboardSummary) ────────────────
  // El frontend NO recalcula nada; solo renderiza lo que devuelve /api/dashboard/summary.
  const {
    liquidezActual             = 0,
    fondosTotales              = 0,
    obligacionesConfirmadas    = 0,
    obligacionesProbables      = 0,
    obligacionesTotales        = 0,
    saldoConfirmadoConObligaciones = 0,
    saldoProbableConObligaciones   = 0,
    dineroAFavor               = 0,
    ingresosTotalesPeriodo     = 0,
    egresosTotalesPeriodo      = 0,
    periodo                    = { inicio: "", fin: "", label: "Mes actual" },
  } = dashboardSummary || {};

  const semaforo = getSemaforo(liquidezActual, umbralVerde, umbralAmarillo);

  // ── Escenarios (solo para gráfico y lista) ───────────────────────────────
  const futuras = useMemo(() =>
    proyecciones.filter(p => p.fecha?.slice(0, 10) >= today), [proyecciones, today]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const realSorted = [...transactions].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let r = 0;
    const realPoints = realSorted.map(t => {
      r += parseFloat(t.monto);
      return { fecha: t.fecha?.slice(5, 10), concepto: t.concepto, saldo: r, futuro: false };
    });
    const futureSorted = [...futuras]
      .filter(p => p.escenario === "CONFIRMADO")
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let f = r;
    const futurePoints = futureSorted.map(p => {
      f += parseFloat(p.monto);
      return { fecha: p.fecha?.slice(5, 10), concepto: p.concepto, saldo: f, futuro: true };
    });
    const todayPoint = realPoints.length > 0 && futureSorted.length > 0
      ? [{ fecha: "hoy", concepto: "Hoy", saldo: r, futuro: false }] : [];
    return [...realPoints, ...todayPoint, ...futurePoints];
  }, [transactions, futuras]);

  // ── KPI rows ──────────────────────────────────────────────────────────────
  // Orden exacto según spec:
  // Fila 1 (HOY): Liquidez · Saldo confirmado · Saldo probable · Dinero a favor
  // Fila 2 (PERÍODO): Ingresos · Egresos · Obligaciones (breakdown)
  const kpis1 = [
    {
      label: "Liquidez Actual",
      value: fmt(liquidezActual),
      color: SEMAFORO_COLORS[semaforo],
      sub: "Σ movimientos ejecutados",
    },
    {
      label: "Saldo Confirmado",
      value: fmt(saldoConfirmadoConObligaciones),
      color: saldoConfirmadoConObligaciones >= 0 ? "#818cf8" : "#f87171",
      sub: "Liquidez − oblig. confirmadas",
    },
    {
      label: "Saldo Probable",
      value: fmt(saldoProbableConObligaciones),
      color: saldoProbableConObligaciones >= 0 ? "#94a3b8" : "#f87171",
      sub: "Liquidez − todas las oblig.",
    },
    {
      label: "Dinero a Favor",
      value: fmt(dineroAFavor),
      color: dineroAFavor >= 0 ? "#4ade80" : "#f87171",
      sub: "Liquidez + Fondos − Oblig.",
    },
  ];

  const kpis2 = [
    {
      label: "Ingresos del Período",
      value: fmt(ingresosTotalesPeriodo),
      color: "#4ade80",
      sub: periodo?.label || "Mes actual",
    },
    {
      label: "Egresos del Período",
      value: fmt(egresosTotalesPeriodo),
      color: "#f87171",
      sub: periodo?.label || "Mes actual",
    },
    {
      label: "Obligaciones",
      value: fmt(obligacionesTotales),
      color: obligacionesTotales > 0 ? "#facc15" : "#4ade80",
      // Spec: mostrar breakdown textual "$X confirmadas · $Y probables"
      sub: `${fmt(obligacionesConfirmadas)} conf. · ${fmt(obligacionesProbables)} prob.`,
      wide: true, // ocupa 2 col en mobile
    },
  ];

  const kpiCard = (k, i) => (
    <Card key={i} style={{ padding: isMobile ? "14px" : undefined }}>
      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: isMobile ? 6 : 10 }}>{k.label}</div>
      <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.value}</div>
      <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.4 }}>{k.sub}</div>
    </Card>
  );

  return (
    <div>
      <PageHeader pre="Overview" title="Dashboard" action={<PrimaryBtn onClick={onAdd}>+ Nuevo Movimiento</PrimaryBtn>} />

      {isMobile && (
        <button onClick={onAdd} style={{ width: "100%", background: "#f8fafc", color: "#060a10", border: "none", padding: "13px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 16, WebkitTapHighlightColor: "transparent" }}>
          + Nuevo Movimiento
        </button>
      )}

      {/* ── Fila 1: métricas HOY ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 10 : 14, marginBottom: 14 }}>
        {kpis1.map(kpiCard)}
      </div>

      {/* ── Fila 2: métricas PERÍODO ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: isMobile ? 10 : 14, marginBottom: 14 }}>
        {kpis2.slice(0, 2).map(kpiCard)}
        {/* Obligaciones: card ancho en mobile (span 2 cols) */}
        <div style={{ gridColumn: isMobile ? "1 / -1" : undefined }}>
          {kpiCard(kpis2[2], 2)}
        </div>
      </div>

      <AlertasCashflow summary={dashboardSummary || {}} umbralVerde={umbralVerde} umbralAmarillo={umbralAmarillo} />

      {/* ── Gráfico ── */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 16, flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>Evolucion + Escenario Confirmado</SectionTitle>
          {!isMobile && (
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 20, height: 2, background: "#e2e8f0" }} /><span style={{ fontSize: 11, color: "#64748b" }}>Real</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 20, height: 2, background: "#818cf8" }} /><span style={{ fontSize: 11, color: "#64748b" }}>Confirmado</span></div>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 140 : 200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sgReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#e2e8f0" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a2236" strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval={isMobile ? "preserveStartEnd" : 0} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} width={48} />
            <Tooltip content={<TT />} />
            <ReferenceLine x="hoy" stroke="#475569" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="saldo" stroke="#e2e8f0" strokeWidth={2} fill="url(#sgReal)"
              dot={(props) => {
                if (props.payload?.futuro) return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#818cf8" stroke="none" />;
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#e2e8f0" stroke="none" />;
              }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Próximos Escenarios ── */}
      {proyecciones.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle>Proximos Escenarios</SectionTitle>
            <button onClick={onGoEscenarios} style={{ background: "none", border: "1px solid #1e293b", color: "#64748b", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
              Ver todos
            </button>
          </div>
          {[...proyecciones]
            .filter(p => p.fecha?.slice(0, 10) >= today)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, isMobile ? 3 : 5)
            .map((p, i, arr) => {
              const isConf = p.escenario === "CONFIRMADO";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: parseFloat(p.monto) > 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                      {parseFloat(p.monto) > 0 ? "+" : "-"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 140 : 260 }}>{p.concepto}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{p.fecha?.slice(0, 10)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: parseFloat(p.monto) > 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace" }}>
                      {parseFloat(p.monto) > 0 ? "+" : ""}{fmt(p.monto)}
                    </div>
                    <div style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: isConf ? "rgba(99,102,241,0.12)" : "rgba(250,204,21,0.1)", color: isConf ? "#818cf8" : "#facc15", fontWeight: 600 }}>
                      {isConf ? "Conf." : "Prob."}
                    </div>
                  </div>
                </div>
              );
            })}
        </Card>
      )}

      {/* ── Últimos Movimientos ── */}
      <Card>
        <SectionTitle>Ultimos Movimientos</SectionTitle>
        {[...transactions].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, isMobile ? 4 : 5).map((t, i, arr) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: parseFloat(t.monto) > 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                {parseFloat(t.monto) > 0 ? "+" : "-"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 140 : 260 }}>{t.concepto}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{t.categoria} · {t.fecha?.slice(0, 10)}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: parseFloat(t.monto) > 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
              {parseFloat(t.monto) > 0 ? "+" : ""}{fmt(t.monto)}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
