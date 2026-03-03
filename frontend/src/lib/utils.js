export const CATEGORIAS = [
  "Regulación de caja", "Préstamos", "Tela", "Sueldos",
  "Restock / Drop", "Oblig. Oficina", "Producciones", "Ventas",
  "Proveedores", "Talleres", "Oblig. Otras", "Otros"
];

// ── Semáforo ────────────────────────────────────────────────────────────────
// Usamos CSS variables para que respeten el tema activo.
// Los valores hexadecimales solo son fallback para contextos sin CSS (tests, etc.)
export const SEMAFORO_COLORS = {
  verde:    "var(--cf-positive)",
  amarillo: "var(--cf-warning)",
  rojo:     "var(--cf-negative)",
};

export const PIE_COLORS = [
  "var(--cf-text-sub)",   // #e2e8f0 / #1e293b
  "var(--cf-text-muted)", // #94a3b8 / #475569
  "var(--cf-text-faint)", // #64748b / #64748b
  "var(--cf-text-dim)",   // #475569 / #94a3b8
  "var(--cf-border-hi)",  // #334155 / #94a3b8
  "var(--cf-border-mid)", // #1e293b / #cbd5e1
  "var(--cf-positive)",   // green
  "var(--cf-warning)",    // yellow
];

// ── Formatters ───────────────────────────────────────────────────────────────
export const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "$0";
  const num = parseFloat(n);
  const abs = Math.abs(num);
  if (abs >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (abs >= 1000)    return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString("es-AR")}`;
};

export const fmtFull = (n) => {
  const num = parseFloat(n);
  return `$${Math.abs(num).toLocaleString("es-AR")}`;
};

export const getSemaforo = (saldo, umbralVerde = 1000000, umbralAmarillo = 200000) => {
  if (saldo >= umbralVerde)    return "verde";
  if (saldo >= umbralAmarillo) return "amarillo";
  return "rojo";
};

// ── Shared inline-style tokens (use CSS vars — theme-aware) ─────────────────
// All components import these; changing here propagates everywhere.

export const iStyle = {
  width: "100%",
  background: "var(--cf-input)",
  border: "1px solid var(--cf-border-mid)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--cf-text)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export const lStyle = {
  fontSize: 11,
  color: "var(--cf-text-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  display: "block",
  marginBottom: 6,
};

export const card = {
  background: "var(--cf-card)",
  border: "1px solid var(--cf-border)",
  borderRadius: 12,
  padding: "22px 24px",
};

export const sTitle = {
  fontSize: 12,
  color: "var(--cf-text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  marginBottom: 16,
};
