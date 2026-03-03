export const CATEGORIAS = [
  "Regulación de caja", "Préstamos", "Tela", "Sueldos",
  "Restock / Drop", "Oblig. Oficina", "Producciones", "Ventas",
  "Proveedores", "Talleres", "Oblig. Otras", "Otros"
];

export const SEMAFORO_COLORS = { verde: "#4ade80", amarillo: "#facc15", rojo: "#f87171" };
export const PIE_COLORS = ["#e2e8f0","#94a3b8","#64748b","#475569","#334155","#1e293b","#4ade80","#facc15"];

export const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "$0";
  const num = parseFloat(n);
  const abs = Math.abs(num);
  if (abs >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString("es-AR")}`;
};

export const fmtFull = (n) => {
  const num = parseFloat(n);
  return `$${Math.abs(num).toLocaleString("es-AR")}`;
};

export const getSemaforo = (s) => s > 1000000 ? "verde" : s > 200000 ? "amarillo" : "rojo";

export const iStyle = {
  width: "100%", background: "#111827", border: "1px solid #1e293b",
  borderRadius: 8, padding: "10px 14px", color: "#f8fafc", fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};

export const lStyle = {
  fontSize: 11, color: "#64748b", textTransform: "uppercase",
  letterSpacing: "0.1em", display: "block", marginBottom: 6
};

export const card = {
  background: "#0d1520", border: "1px solid #1a2236",
  borderRadius: 12, padding: "22px 24px"
};

export const sTitle = {
  fontSize: 12, color: "#475569", textTransform: "uppercase",
  letterSpacing: "0.12em", marginBottom: 16
};
