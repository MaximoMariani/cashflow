import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, PageHeader, SectionTitle } from "../components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS, PIE_COLORS } from "../lib/utils.js";

const TT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--cf-overlay)", border: "1px solid #1e293b", padding: "10px 14px", borderRadius: 8 }}>
      <p style={{ color: "var(--cf-text-muted)", fontSize: 11, marginBottom: 4 }}>{payload[0]?.name}</p>
      <p style={{ color: "var(--cf-text)", fontSize: 13, fontWeight: 600 }}>{fmt(payload[0]?.value)}</p>
    </div>
  );
};

export default function AnalisisPage({ data }) {
  const { transactions, cuentas } = data;

  const saldoFinal = useMemo(() => transactions.reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const semaforo = getSemaforo(saldoFinal);

  const catData = useMemo(() => {
    const m = {};
    transactions.forEach(t => {
      if (!m[t.categoria]) m[t.categoria] = { ingreso: 0, egreso: 0 };
      if (parseFloat(t.monto) > 0) m[t.categoria].ingreso += parseFloat(t.monto);
      else m[t.categoria].egreso += Math.abs(parseFloat(t.monto));
    });
    return Object.entries(m).map(([name, v]) => ({ name, ...v, total: v.ingreso + v.egreso })).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const pieData = catData.map(c => ({ name: c.name, value: c.total }));

  return (
    <div>
      <PageHeader pre="Insights" title="Análisis" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card>
          <SectionTitle>Monto por Categoría</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: "var(--cf-text-dim)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
              <YAxis dataKey="name" type="category" tick={{ fill: "var(--cf-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<TT />} />
              <Bar dataKey="ingreso" fill="var(--cf-positive)" radius={[0, 4, 4, 0]} fillOpacity={0.7} />
              <Bar dataKey="egreso" fill="var(--cf-negative)" radius={[0, 4, 4, 0]} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {[{ color: "var(--cf-positive)", label: "Ingresos" }, { color: "var(--cf-negative)", label: "Egresos" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: "var(--cf-text-faint)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Distribución por Categoría</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={72} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<TT />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10 }}>
            {pieData.slice(0, 6).map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--cf-text-faint)", flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 11, color: "var(--cf-text-muted)", fontFamily: "'DM Mono',monospace" }}>{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <SectionTitle>Balance por Cuenta</SectionTitle>
          {cuentas.length === 0 && <p style={{ color: "var(--cf-border-hi)", fontSize: 13 }}>Sin cuentas registradas.</p>}
          {cuentas.map(c => {
            const total = transactions.filter(t => t.cuenta === c.nombre).reduce((a, t) => a + parseFloat(t.monto), 0);
            const ing = transactions.filter(t => t.cuenta === c.nombre && parseFloat(t.monto) > 0).reduce((a, t) => a + parseFloat(t.monto), 0);
            const egr = transactions.filter(t => t.cuenta === c.nombre && parseFloat(t.monto) < 0).reduce((a, t) => a + Math.abs(parseFloat(t.monto)), 0);
            return (
              <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid #111827" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--cf-text-muted)", fontWeight: 500 }}>{c.nombre}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: total >= 0 ? "var(--cf-positive)" : "var(--cf-negative)" }}>{fmt(total)}</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 11, color: "var(--cf-positive)", fontFamily: "'DM Mono',monospace" }}>+{fmt(ing)}</span>
                  <span style={{ fontSize: 11, color: "var(--cf-negative)", fontFamily: "'DM Mono',monospace" }}>-{fmt(egr)}</span>
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <SectionTitle>Semáforo de Caja</SectionTitle>
          {[
            { label: "Verde — Buen margen", color: "var(--cf-positive)", desc: "Saldo > $1.000.000" },
            { label: "Amarillo — Atención", color: "var(--cf-warning)", desc: "Saldo $200K – $1M" },
            { label: "Rojo — Acción urgente", color: "var(--cf-negative)", desc: "Saldo < $200.000" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #111827" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}` }} />
              <div>
                <div style={{ fontSize: 12, color: "var(--cf-text-sub)", fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--cf-text-dim)" }}>{s.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "16px", background: "var(--cf-card-raised)", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Estado actual</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: SEMAFORO_COLORS[semaforo], letterSpacing: "-0.02em", fontFamily: "'DM Mono',monospace" }}>{fmt(saldoFinal)}</div>
            <div style={{ fontSize: 11, color: SEMAFORO_COLORS[semaforo], marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em" }}>{semaforo}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
