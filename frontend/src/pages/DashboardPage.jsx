import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Card, PageHeader, PrimaryBtn, SectionTitle } from "../components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS } from "../lib/utils.js";

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

function AlertasCashflow({ saldoActual, saldoConfirmado, saldoProbable, proximos7, umbralVerde, umbralAmarillo }) {
  const alertas = [];
  const semActual = getSemaforo(saldoActual,    umbralVerde, umbralAmarillo);
  const semConf   = getSemaforo(saldoConfirmado, umbralVerde, umbralAmarillo);
  const semProb   = getSemaforo(saldoProbable,   umbralVerde, umbralAmarillo);

  if (semActual === "rojo")
    alertas.push({ nivel: "rojo",    msg: `🚨 Liquidez crítica — saldo por debajo de ${fmt(umbralAmarillo)}. Acción urgente requerida.` });
  else if (semActual === "amarillo")
    alertas.push({ nivel: "amarillo", msg: `⚠ Atención — saldo por debajo de ${fmt(umbralVerde)}. Monitoreá de cerca.` });
  else
    alertas.push({ nivel: "verde",    msg: "✓ Liquidez saludable — el saldo tiene buen margen operativo." });

  if (semConf === "rojo" && semActual !== "rojo")
    alertas.push({ nivel: "rojo",    msg: "🚨 El escenario confirmado proyecta caída a zona crítica." });
  else if (semConf === "amarillo" && semActual === "verde")
    alertas.push({ nivel: "amarillo", msg: "⚠ El escenario confirmado muestra caída del saldo. Revisá egresos seguros." });

  if (semProb === "rojo" && semConf !== "rojo")
    alertas.push({ nivel: "amarillo", msg: "⚠ Si se materializan los probables, el saldo caerá a zona de riesgo." });

  if (proximos7.length > 0) {
    const net = proximos7.reduce((a, p) => a + parseFloat(p.monto), 0);
    alertas.push({ nivel: net < 0 ? "amarillo" : "verde", msg: `${net < 0 ? "⚠" : "✓"} Próximos 7 días: neto ${fmt(net)} (${proximos7.length} mov.)` });
  }

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
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${c.text}` }} />
              <span style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{a.msg}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function DashboardPage({ data, onAdd, onGoEscenarios }) {
  const {
    transactions, proyecciones, obligacionesMetricas,
    dineroEstimado, fondosInversion, financialSettings
  } = data;

  const today = new Date().toISOString().slice(0, 10);

  // Umbrales dinámicos con fallback
  const umbralVerde    = parseFloat(financialSettings?.umbral_verde    ?? 1000000);
  const umbralAmarillo = parseFloat(financialSettings?.umbral_amarillo ?? 200000);

  const saldoActual   = useMemo(() => transactions.reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const totalIngresos = useMemo(() => transactions.filter(t => parseFloat(t.monto) > 0).reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const totalEgresos  = useMemo(() => transactions.filter(t => parseFloat(t.monto) < 0).reduce((a, t) => a + Math.abs(parseFloat(t.monto)), 0), [transactions]);
  const totalEstimado = useMemo(() => dineroEstimado.reduce((a, d) => a + parseFloat(d.monto || 0), 0), [dineroEstimado]);
  const totalFondos   = useMemo(() => fondosInversion.reduce((a, f) => a + parseFloat(f.monto || 0), 0), [fondosInversion]);
  const totalOblig    = useMemo(() => parseFloat(obligacionesMetricas?.total_pendiente) || 0, [obligacionesMetricas]);

  const semaforo      = getSemaforo(saldoActual, umbralVerde, umbralAmarillo);
  const saldoConOblig = saldoActual - totalOblig;
  const dineroAFavor  = saldoActual + totalEstimado + totalFondos - totalOblig;

  const futuras = useMemo(() => proyecciones.filter(p => p.fecha?.slice(0, 10) >= today), [proyecciones, today]);

  const saldoConfirmado = useMemo(() => {
    const sum = futuras.filter(p => p.escenario === "CONFIRMADO").reduce((a, p) => a + parseFloat(p.monto), 0);
    return saldoActual + sum;
  }, [saldoActual, futuras]);

  const saldoProbable = useMemo(() => {
    const sum = futuras.filter(p => !p.escenario || p.escenario === "PROBABLE").reduce((a, p) => a + parseFloat(p.monto), 0);
    return saldoConfirmado + sum;
  }, [saldoConfirmado, futuras]);

  const diferencia = saldoProbable - saldoConfirmado;
  const proximos7  = proyecciones.filter(p => { const d = (new Date(p.fecha) - new Date()) / 86400000; return d >= 0 && d <= 7; });

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
      ? [{ fecha: "hoy", concepto: "Hoy", saldo: r, futuro: false, isToday: true }] : [];
    return [...realPoints, ...todayPoint, ...futurePoints];
  }, [transactions, futuras]);

  const kpis1 = [
    { label: "Dinero a Favor",     value: fmt(dineroAFavor),    color: dineroAFavor >= 0    ? "#4ade80" : "#f87171", sub: "Neto real estimado" },
    { label: "Liquidez Actual",    value: fmt(saldoActual),     color: SEMAFORO_COLORS[semaforo],                    sub: "Saldo en cuentas" },
    { label: "Saldo c/ Oblig.",    value: fmt(saldoConOblig),   color: saldoConOblig >= 0   ? "#4ade80" : "#f87171", sub: "Descontando deudas pendientes" },
    { label: "Futuro Confirmado",  value: fmt(saldoConfirmado), color: saldoConfirmado >= 0 ? "#818cf8" : "#f87171", sub: "Solo mov. seguros" },
  ];

  const kpis2 = [
    { label: "Total Ingresos",     value: fmt(totalIngresos),   color: "#4ade80",  sub: `${transactions.filter(t => parseFloat(t.monto) > 0).length} movimientos` },
    { label: "Total Egresos",      value: fmt(totalEgresos),    color: "#f87171",  sub: `${transactions.filter(t => parseFloat(t.monto) < 0).length} movimientos` },
    {
      label: "Total Obligaciones",
      value: totalOblig > 0 ? fmt(totalOblig) : "—",
      color: "#facc15",
      sub: totalOblig > 0 ? `${obligacionesMetricas?.count_pendiente || 0} pendientes` : "Sin obligaciones pendientes"
    },
    {
      label: "Futuro c/ Probables",
      value: fmt(saldoProbable),
      color: saldoProbable >= 0 ? "#4ade80" : "#f87171",
      sub: (diferencia >= 0 ? "+" : "") + fmt(diferencia) + " vs confirmado"
    },
  ];

  return (
    <div>
      <PageHeader pre="Overview" title="Dashboard" action={<PrimaryBtn onClick={onAdd}>+ Nuevo Movimiento</PrimaryBtn>} />

      {/* KPIs fila 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        {kpis1.map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#334155" }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* KPIs fila 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        {kpis2.map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#334155" }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <AlertasCashflow
        saldoActual={saldoActual}
        saldoConfirmado={saldoConfirmado}
        saldoProbable={saldoProbable}
        proximos7={proximos7}
        umbralVerde={umbralVerde}
        umbralAmarillo={umbralAmarillo}
      />

      {/* Gráfico */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Evolución + Escenario Confirmado</SectionTitle>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 2, background: "#e2e8f0" }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Real</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 2, background: "#818cf8" }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Confirmado</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sgReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#e2e8f0" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sgFut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a2236" strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
            <Tooltip content={<TT />} />
            <ReferenceLine x="hoy" stroke="#475569" strokeDasharray="4 4" label={{ value: "hoy", fill: "#475569", fontSize: 10 }} />
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

      {/* Próximos escenarios */}
      {proyecciones.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle>Próximos Escenarios</SectionTitle>
            <button onClick={onGoEscenarios} style={{ background: "none", border: "1px solid #1e293b", color: "#64748b", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b";  e.currentTarget.style.color = "#64748b"; }}>
              Ver todos →
            </button>
          </div>
          {[...proyecciones]
            .filter(p => p.fecha?.slice(0, 10) >= today)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 5)
            .map((p, i, arr) => {
              const isConf = p.escenario === "CONFIRMADO";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: parseFloat(p.monto) > 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                      {parseFloat(p.monto) > 0 ? "↑" : "↓"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{p.concepto}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {p.categoria} · {p.fecha?.slice(0, 10)}
                        <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                          background: isConf ? "rgba(99,102,241,0.12)" : "rgba(250,204,21,0.1)",
                          color: isConf ? "#818cf8" : "#facc15" }}>
                          {isConf ? "Confirmado" : "Probable"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: parseFloat(p.monto) > 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace" }}>
                      {parseFloat(p.monto) > 0 ? "+" : ""}{fmt(p.monto)}
                    </div>
                    <div style={{ fontSize: 10, color: "#334155" }}>{isConf ? "confirmado" : "probable"}</div>
                  </div>
                </div>
              );
            })}
        </Card>
      )}

      {/* Últimos movimientos */}
      <Card>
        <SectionTitle>Últimos Movimientos</SectionTitle>
        {[...transactions].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5).map((t, i, arr) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: parseFloat(t.monto) > 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                {parseFloat(t.monto) > 0 ? "↑" : "↓"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{t.concepto}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{t.categoria} · {t.fecha?.slice(0, 10)}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: parseFloat(t.monto) > 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace" }}>
              {parseFloat(t.monto) > 0 ? "+" : ""}{fmt(t.monto)}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
