import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Card, PageHeader, PrimaryBtn, SectionTitle } from "../components/UI.jsx";
import { fmt, getSemaforo, SEMAFORO_COLORS } from "../lib/utils.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

// ── Formateo de moneda ────────────────────────────────────────────────────────
// Intl.NumberFormat para consistencia; con abreviación para millones
const fmtARS = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "$0";
  const num = parseFloat(n);
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    const millon = (num / 1_000_000).toFixed(2);
    return `$${millon}M`;
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(num);
};

const fmtFull = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(parseFloat(n));

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, highlight = false }) {
  const isNeg = typeof value === "number" && value < 0;
  const displayColor = color || (isNeg ? "var(--cf-negative)" : "var(--cf-text)");

  return (
    <div style={{
      background: highlight ? "var(--cf-card-raised)" : "var(--cf-card)",
      border: `1px solid ${highlight ? "var(--cf-border-mid)" : "var(--cf-border)"}`,
      borderRadius: 12,
      padding: "18px 20px",
      minHeight: 110,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 8,
    }}>
      {/* Label */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: "var(--cf-text-dim)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        lineHeight: 1.3,
      }}>
        {label}
      </div>

      {/* Value */}
      <div
        title={typeof value === "number" ? fmtFull(value) : undefined}
        style={{
          fontSize: "clamp(17px, 3vw, 22px)",
          fontWeight: 700,
          color: displayColor,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "-0.02em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}
      >
        {typeof value === "number" ? fmtARS(value) : value}
      </div>

      {/* Sub */}
      {sub && (
        <div style={{
          fontSize: 10,
          color: "var(--cf-text-faint)",
          lineHeight: 1.5,
          borderTop: "1px solid var(--cf-border)",
          paddingTop: 8,
          marginTop: "auto",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Tooltip del gráfico ──────────────────────────────────────────────────────
const ChartTT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--cf-overlay)", border: "1px solid var(--cf-border-mid)",
      padding: "10px 14px", borderRadius: 8, minWidth: 140,
    }}>
      <p style={{ color: "var(--cf-text-faint)", fontSize: 11, marginBottom: 4 }}>
        {payload[0]?.payload?.concepto}
      </p>
      <p style={{ color: "var(--cf-text)", fontSize: 13, fontWeight: 600 }}>
        {fmtARS(payload[0]?.value)}
      </p>
      {payload[0]?.payload?.futuro && (
        <p style={{ color: "var(--cf-text-dim)", fontSize: 10, marginTop: 2 }}>escenario</p>
      )}
    </div>
  );
};

// ── Alerta semáforo ──────────────────────────────────────────────────────────
function SemaforoAlerta({ summary, umbralVerde, umbralAmarillo }) {
  const { liquidezActual, liquidezConObligaciones } = summary;
  const sem = getSemaforo(liquidezActual, umbralVerde, umbralAmarillo);
  const color = SEMAFORO_COLORS[sem];

  const msgs = {
    verde:    "Liquidez saludable. Todos los indicadores en zona verde.",
    amarillo: "Atención: liquidez por debajo del umbral recomendado.",
    rojo:     "Liquidez crítica. Revisá flujos confirmados con urgencia.",
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 16px",
      background: `color-mix(in srgb, ${color} 8%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      borderRadius: 10, marginBottom: 16,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: color, boxShadow: `0 0 6px ${color}`,
        flexShrink: 0, marginTop: 4,
      }} />
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 12, color: "var(--cf-text-sub)", lineHeight: 1.5 }}>
          {msgs[sem]}
          {liquidezConObligaciones < 0 && (
            <span style={{ color: "var(--cf-negative)", fontWeight: 600 }}>
              {" "}Descontando obligaciones: {fmtARS(liquidezConObligaciones)}.
            </span>
          )}
        </span>
        <div style={{ fontSize: 10, color: "var(--cf-text-dim)", marginTop: 4 }}>
          Umbral verde ≥ {fmtARS(umbralVerde)} · Umbral amarillo ≥ {fmtARS(umbralAmarillo)}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function DashboardPage({ data, onAdd, onGoEscenarios }) {
  const { transactions, proyecciones, dashboardSummary, financialSettings } = data;
  const isMobile = useIsMobile();
  const today = new Date().toISOString().slice(0, 10);

  // Semáforo umbrales
  const umbralVerde    = parseFloat(financialSettings?.umbral_verde    ?? 1_000_000);
  const umbralAmarillo = parseFloat(financialSettings?.umbral_amarillo ?? 200_000);

  // ── Métricas: todas del backend (dashboardSummary) ─────────────────────────
  // El frontend NO recalcula — solo renderiza lo que devuelve /api/dashboard/summary.
  const {
    ingresosConfirmados   = 0,
    egresosConfirmados    = 0,
    ingresosProbables     = 0,
    obligacionesTotales   = 0,
    liquidezActual        = 0,
    liquidezConObligaciones = 0,
    periodo               = { inicio: "", fin: "", label: "Mes actual" },
  } = dashboardSummary || {};

  const semaforo = getSemaforo(liquidezActual, umbralVerde, umbralAmarillo);

  // ── Gráfico: evolución acumulada real + escenarios confirmados ─────────────
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let acc = 0;
    const real = sorted.map(t => {
      acc += parseFloat(t.monto);
      return { fecha: t.fecha?.slice(5, 10), concepto: t.concepto, saldo: acc, futuro: false };
    });

    const futuras = [...proyecciones]
      .filter(p => p.escenario === "CONFIRMADO" && p.fecha?.slice(0, 10) >= today)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let facc = acc;
    const future = futuras.map(p => {
      facc += parseFloat(p.monto);
      return { fecha: p.fecha?.slice(5, 10), concepto: p.concepto, saldo: facc, futuro: true };
    });

    const bridge = real.length && future.length
      ? [{ fecha: "hoy", concepto: "Hoy", saldo: acc, futuro: false }] : [];

    return [...real, ...bridge, ...future];
  }, [transactions, proyecciones, today]);

  // ── Grid responsive via inline style ─────────────────────────────────────
  // Mobile (<640px): 1 col
  // Tablet (640–1023px): 2 cols
  // Desktop (≥1024px): 4 cols para fila 1, 4 cols para fila 2
  // Se implementa via JS + useIsMobile (la app usa inline styles, sin Tailwind)
  const isTablet = !isMobile && typeof window !== "undefined" && window.innerWidth < 1024;
  const colsFila1 = isMobile ? 1 : isTablet ? 2 : 4;
  const colsFila2 = isMobile ? 1 : isTablet ? 2 : 4;

  const gridStyle = (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: isMobile ? 10 : 14,
    marginBottom: 14,
  });

  const subPeriod = periodo?.label || "Mes actual";

  // ── Fila 1: liquidez (Liquidez actual · Liquidez c/oblig. · Obligaciones totales) ──
  const fila1 = [
    {
      label: "Liquidez Actual",
      value: liquidezActual,
      sub: "Ingresos conf. − Egresos conf.",
      color: SEMAFORO_COLORS[semaforo],
      highlight: true,
    },
    {
      label: "Liquidez con Obligaciones",
      value: liquidezConObligaciones,
      sub: "Ingresos conf. − Egresos conf. − Obligaciones",
      color: liquidezConObligaciones >= 0 ? "var(--cf-text-sub)" : "var(--cf-negative)",
    },
    {
      label: "Obligaciones Totales",
      value: obligacionesTotales,
      sub: "Pendientes de pago",
      color: obligacionesTotales > 0 ? "var(--cf-warning)" : "var(--cf-positive)",
    },
  ];

  // ── Fila 2: flujos del período (Ing. conf. · Egr. conf. · Ing. prob.) ─────
  const fila2 = [
    {
      label: "Ingresos Confirmados",
      value: ingresosConfirmados,
      sub: subPeriod,
      color: "var(--cf-positive)",
    },
    {
      label: "Egresos Confirmados",
      value: egresosConfirmados,
      sub: subPeriod,
      color: "var(--cf-negative)",
    },
    {
      label: "Ingresos Probables",
      value: ingresosProbables,
      sub: "Movimientos + Escenarios probables",
      color: "var(--cf-warning)",
    },
  ];

  return (
    <div style={{ minWidth: 0 }}>

      <PageHeader
        pre="Overview"
        title="Dashboard"
        action={<PrimaryBtn onClick={onAdd}>+ Nuevo Movimiento</PrimaryBtn>}
      />

      {/* Mobile: botón add full-width */}
      {isMobile && (
        <button onClick={onAdd} style={{
          width: "100%", background: "var(--cf-text)", color: "var(--cf-text-dark)",
          border: "none", padding: "13px", borderRadius: 10,
          cursor: "pointer", fontSize: 14, fontWeight: 700,
          marginBottom: 16, WebkitTapHighlightColor: "transparent",
        }}>
          + Nuevo Movimiento
        </button>
      )}

      {/* ── Semáforo alerta ── */}
      <SemaforoAlerta
        summary={dashboardSummary || {}}
        umbralVerde={umbralVerde}
        umbralAmarillo={umbralAmarillo}
      />

      {/* ── Período label ── */}
      {periodo?.inicio && (
        <div style={{
          fontSize: 11, color: "var(--cf-text-dim)",
          marginBottom: 12, letterSpacing: "0.05em",
        }}>
          Período: {periodo.inicio} → {periodo.fin}
        </div>
      )}

      {/* ── Fila 1: liquidez — 3 cols desktop, 2 tablet, 1 mobile ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr",
        gap: isMobile ? 10 : 14,
        marginBottom: 14,
      }}>
        {fila1.map((k, i) => (
          <KpiCard key={i} {...k} />
        ))}
      </div>

      {/* ── Fila 2: flujos del período — mismo grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr",
        gap: isMobile ? 10 : 14,
        marginBottom: 14,
      }}>
        {fila2.map((k, i) => (
          <KpiCard key={i} {...k} />
        ))}
      </div>

      {/* ── Gráfico: evolución ── */}
      <Card style={{ marginBottom: 14, minWidth: 0 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: isMobile ? 12 : 16, flexWrap: "wrap", gap: 8,
        }}>
          <SectionTitle>Evolución + Escenario Confirmado</SectionTitle>
          {!isMobile && (
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--cf-text-faint)" }}>
              <span>● Real</span>
              <span style={{ color: "var(--cf-accent)" }}>● Confirmado</span>
            </div>
          )}
        </div>

        {/* overflow-x-auto para mobile */}
        <div style={{ overflowX: "auto", minWidth: 0 }}>
          <div style={{ minWidth: isMobile ? 300 : "100%" }}>
            <ResponsiveContainer width="100%" height={isMobile ? 140 : 200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--cf-text-sub)"   stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--cf-text-sub)"   stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--cf-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fill: "var(--cf-text-dim)", fontSize: 9 }}
                  axisLine={false} tickLine={false}
                  interval={isMobile ? "preserveStartEnd" : 0}
                />
                <YAxis
                  tick={{ fill: "var(--cf-text-dim)", fontSize: 9 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`}
                  width={48}
                />
                <Tooltip content={<ChartTT />} />
                <ReferenceLine x="hoy" stroke="var(--cf-text-dim)" strokeDasharray="4 4" />
                <Area
                  type="monotone" dataKey="saldo"
                  stroke="var(--cf-text-sub)" strokeWidth={2}
                  fill="url(#gradReal)"
                  dot={(props) => {
                    const c = props.payload?.futuro ? "var(--cf-accent)" : "var(--cf-text-sub)";
                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={c} stroke="none" />;
                  }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* ── Próximos Escenarios ── */}
      {proyecciones.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <SectionTitle>Próximos Escenarios</SectionTitle>
            <button onClick={onGoEscenarios} style={{
              background: "none", border: "1px solid var(--cf-border)",
              color: "var(--cf-text-faint)", padding: "5px 12px",
              borderRadius: 6, cursor: "pointer", fontSize: 11,
            }}>
              Ver todos
            </button>
          </div>

          {[...proyecciones]
            .filter(p => p.fecha?.slice(0, 10) >= today)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, isMobile ? 3 : 5)
            .map((p, i, arr) => {
              const isConf = p.escenario === "CONFIRMADO";
              const pos    = parseFloat(p.monto) > 0;
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--cf-border)" : "none",
                  gap: 8, minWidth: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: pos ? "var(--cf-positive-tint)" : "var(--cf-negative-tint)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                    }}>
                      {pos ? "+" : "−"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: "var(--cf-text-sub)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: isMobile ? 140 : 260,
                      }}>
                        {p.concepto}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--cf-text-dim)" }}>
                        {p.fecha?.slice(0, 10)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: pos ? "var(--cf-positive)" : "var(--cf-negative)",
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {pos ? "+" : ""}{fmtARS(p.monto)}
                    </div>
                    <div style={{
                      fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600,
                      background: isConf ? "var(--cf-accent-tint)" : "var(--cf-warning-tint)",
                      color:      isConf ? "var(--cf-accent)"      : "var(--cf-warning)",
                    }}>
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
        <SectionTitle>Últimos Movimientos</SectionTitle>
        {[...transactions]
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, isMobile ? 4 : 5)
          .map((t, i, arr) => {
            const pos = parseFloat(t.monto) > 0;
            return (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--cf-border)" : "none",
                gap: 8, minWidth: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: pos ? "var(--cf-positive-tint)" : "var(--cf-negative-tint)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                  }}>
                    {pos ? "+" : "−"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: "var(--cf-text-sub)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      maxWidth: isMobile ? 140 : 260,
                    }}>
                      {t.concepto}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cf-text-dim)" }}>
                      {t.categoria}
                      {t.certeza === "PROBABLE" && (
                        <span style={{ marginLeft: 6, color: "var(--cf-warning)", fontWeight: 600 }}>
                          · Probable
                        </span>
                      )}
                      {" · "}{t.fecha?.slice(0, 10)}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: pos ? "var(--cf-positive)" : "var(--cf-negative)",
                  fontFamily: "'DM Mono', monospace",
                  flexShrink: 0,
                }}>
                  {pos ? "+" : ""}{fmtARS(t.monto)}
                </div>
              </div>
            );
          })}
      </Card>
    </div>
  );
}
