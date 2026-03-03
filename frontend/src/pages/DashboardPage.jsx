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
      {payload[0]?.payload?.futuro && <p style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>proyectado</p>}
    </div>
  );
};

function AlertasCashflow({ saldoActual, saldoProyectado, proximos7, proximos30 }) {
  const alertas = [];
  const semActual = getSemaforo(saldoActual);
  const semProy = getSemaforo(saldoProyectado);

  if (semActual === "rojo") alertas.push({ nivel: "rojo", msg: "Liquidez crítica — el saldo actual está por debajo de $200.000. Acción urgente requerida." });
  else if (semActual === "amarillo") alertas.push({ nivel: "amarillo", msg: "Atención — el saldo actual está por debajo de $1.000.000. Monitoreá de cerca." });
  else alertas.push({ nivel: "verde", msg: "Liquidez saludable — el saldo actual tiene buen margen operativo." });

  if (semProy === "rojo" && semActual !== "rojo") alertas.push({ nivel: "rojo", msg: "Las proyecciones muestran que el saldo caerá a zona crítica. Revisá los egresos futuros." });
  else if (semProy === "amarillo" && semActual === "verde") alertas.push({ nivel: "amarillo", msg: "Las proyecciones muestran una caída del saldo. Considerá postergar algunos egresos." });

  if (proximos7.length > 0) {
    const netP7 = proximos7.reduce((a, p) => a + parseFloat(p.monto), 0);
    if (netP7 < 0) alertas.push({ nivel: "amarillo", msg: `En los próximos 7 días hay un neto proyectado negativo de ${fmt(netP7)}.` });
    else alertas.push({ nivel: "verde", msg: `Los próximos 7 días tienen un neto proyectado positivo de ${fmt(netP7)}.` });
  }

  if (proximos30.length > 0) {
    const netP30 = proximos30.reduce((a, p) => a + parseFloat(p.monto), 0);
    alertas.push({ nivel: netP30 >= 0 ? "verde" : "amarillo", msg: `Próximos 30 días: neto proyectado ${fmt(netP30)} (${proximos30.length} movimiento${proximos30.length !== 1 ? "s" : ""}).` });
  }

  const colors = { verde: { bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.2)", text: "#4ade80" }, amarillo: { bg: "rgba(250,204,21,0.06)", border: "rgba(250,204,21,0.2)", text: "#facc15" }, rojo: { bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)", text: "#f87171" } };

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

export default function DashboardPage({ data, onAdd, onGoProyecciones }) {
  // CAMBIO: ahora usamos obligacionesMetricas en lugar de dashConfig para las métricas de obligaciones
  const { transactions, proyecciones, obligacionesMetricas, dashConfig, dineroEstimado, fondosInversion } = data;

  const today = new Date().toISOString().slice(0, 10);

  const saldoActual = useMemo(() => transactions.reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const totalIngresos = useMemo(() => transactions.filter(t => parseFloat(t.monto) > 0).reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const totalEgresos = useMemo(() => transactions.filter(t => parseFloat(t.monto) < 0).reduce((a, t) => a + Math.abs(parseFloat(t.monto)), 0), [transactions]);
  const totalEstimado = useMemo(() => dineroEstimado.reduce((a, d) => a + parseFloat(d.monto || 0), 0), [dineroEstimado]);
  const totalFondos = useMemo(() => fondosInversion.reduce((a, f) => a + parseFloat(f.monto || 0), 0), [fondosInversion]);

  // CAMBIO: totalOblig ahora viene de obligacionesMetricas (suma real de PENDIENTES en DB)
  const totalOblig = useMemo(() => parseFloat(obligacionesMetricas?.total_pendiente) || 0, [obligacionesMetricas]);

  const saldoConOblig = saldoActual - totalOblig;
  const dineroAFavor = saldoActual + totalEstimado + totalFondos - totalOblig;
  const semaforo = getSemaforo(saldoActual);

  const saldoProyectado = saldoActual + proyecciones.reduce((a, p) => a + parseFloat(p.monto), 0);

  const proximos7 = proyecciones.filter(p => {
    const diff = (new Date(p.fecha) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });
  const proximos30 = proyecciones.filter(p => {
    const diff = (new Date(p.fecha) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  const chartData = useMemo(() => {
    const realSorted = [...transactions].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let r = 0;
    const realPoints = realSorted.map(t => {
      r += parseFloat(t.monto);
      return { fecha: t.fecha?.slice(5, 10), concepto: t.concepto, saldo: r, futuro: false };
    });
    const futureSorted = [...proyecciones]
      .filter(p => p.fecha?.slice(0, 10) >= today)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let f = r;
    const futurePoints = futureSorted.map(p => {
      f += parseFloat(p.monto);
      return { fecha: p.fecha?.slice(5, 10), concepto: p.concepto, saldo: f, futuro: true };
    });
    const todayPoint = realPoints.length > 0 && futureSorted.length > 0
      ? [{ fecha: "hoy", concepto: "Hoy", saldo: r, futuro: false, isToday: true }] : [];
    return [...realPoints, ...todayPoint, ...futurePoints];
  }, [transactions, proyecciones, today]);

  const kpis1 = [
    { label: "Dinero a Favor", value: fmt(dineroAFavor), color: dineroAFavor >= 0 ? "#4ade80" : "#f87171", sub: "Neto real estimado" },
    { label: "Liquidez Actual", value: fmt(saldoActual), color: SEMAFORO_COLORS[semaforo], sub: "Saldo en cuentas" },
    { label: "Saldo c/ Obligaciones", value: fmt(saldoConOblig), color: saldoConOblig >= 0 ? "#4ade80" : "#f87171", sub: "Descontando deudas pendientes" },
    { label: "Saldo Proyectado", value: fmt(saldoProyectado), color: saldoProyectado >= 0 ? "#4ade80" : "#f87171", sub: `Con ${proyecciones.length} mov. futuros` },
  ];

  const kpis2 = [
    { label: "Total Ingresos", value: fmt(totalIngresos), color: "#4ade80", sub: `${transactions.filter(t => parseFloat(t.monto) > 0).length} movimientos` },
    { label: "Total Egresos", value: fmt(totalEgresos), color: "#f87171", sub: `${transactions.filter(t => parseFloat(t.monto) < 0).length} movimientos` },
    {
      label: "Total Obligaciones",
      value: totalOblig > 0 ? fmt(totalOblig) : "—",
      color: "#facc15",
      sub: totalOblig > 0
        ? `${obligacionesMetricas?.count_pendiente || 0} pendientes`
        : "Sin obligaciones pendientes"
    },
  ];

  return (
    <div>
      <PageHeader pre="Overview" title="Dashboard" action={<PrimaryBtn onClick={onAdd}>+ Nuevo Movimiento</PrimaryBtn>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        {kpis1.map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#334155" }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
        {kpis2.map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#334155" }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <AlertasCashflow saldoActual={saldoActual} saldoProyectado={saldoProyectado} proximos7={proximos7} proximos30={proximos30} />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Evolución + Proyección del Saldo</SectionTitle>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 2, background: "#e2e8f0" }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Real</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 2, background: "#4ade80", borderTop: "2px dashed #4ade80" }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Proyectado</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sgReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sgFut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a2236" strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
            <Tooltip content={<TT />} />
            <ReferenceLine x="hoy" stroke="#475569" strokeDasharray="4 4" label={{ value: "hoy", fill: "#475569", fontSize: 10 }} />
            <Area type="monotone" dataKey="saldo" stroke="#e2e8f0" strokeWidth={2} fill="url(#sgReal)"
              dot={(props) => {
                if (props.payload?.futuro) return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#4ade80" stroke="none" />;
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#e2e8f0" stroke="none" />;
              }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {proyecciones.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle>Próximos Movimientos Proyectados</SectionTitle>
            <button onClick={onGoProyecciones} style={{ background: "none", border: "1px solid #1e293b", color: "#64748b", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
              Ver todos →
            </button>
          </div>
          {[...proyecciones]
            .filter(p => p.fecha?.slice(0, 10) >= today)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 5)
            .map((p, i, arr) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: parseFloat(p.monto) > 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                    {parseFloat(p.monto) > 0 ? "↑" : "↓"}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{p.concepto}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{p.categoria} · {p.fecha?.slice(0, 10)}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: parseFloat(p.monto) > 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace" }}>
                    {parseFloat(p.monto) > 0 ? "+" : ""}{fmt(p.monto)}
                  </div>
                  <div style={{ fontSize: 10, color: "#334155" }}>proyectado</div>
                </div>
              </div>
            ))}
        </Card>
      )}

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
