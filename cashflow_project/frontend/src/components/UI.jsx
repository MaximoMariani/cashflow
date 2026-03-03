import { card, iStyle, lStyle } from "../lib/utils.js";

export function Card({ children, style }) {
  return <div style={{ ...card, ...style }}>{children}</div>;
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
      {children}
    </div>
  );
}

export function PageHeader({ pre, title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
      <div>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{pre}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f8fafc", margin: 0, letterSpacing: "-0.03em" }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function PrimaryBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      background: "#f8fafc", color: "#060a10", border: "none",
      padding: "10px 20px", borderRadius: 8, cursor: "pointer",
      fontSize: 13, fontWeight: 700, ...style
    }}>{children}</button>
  );
}

export function GhostBtn({ onClick, children, style, danger }) {
  return (
    <button onClick={onClick} style={{
      background: danger ? "rgba(248,113,113,0.08)" : "#1e293b",
      border: `1px solid ${danger ? "rgba(248,113,113,0.25)" : "#334155"}`,
      color: danger ? "#f87171" : "#94a3b8",
      padding: "6px 14px", borderRadius: 6, cursor: "pointer",
      fontSize: 12, fontWeight: 600, transition: "all 0.15s", ...style
    }}>{children}</button>
  );
}

export function Input({ label, type = "text", value, onChange, placeholder, style: s }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={lStyle}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...iStyle, ...s }} />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={lStyle}>{label}</label>}
      <select value={value} onChange={onChange} style={iStyle}>
        {options.map(o => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Badge({ children, type }) {
  const colors = {
    Ingreso: { bg: "rgba(74,222,128,0.1)", color: "#4ade80", border: "rgba(74,222,128,0.2)" },
    Egreso: { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
    default: { bg: "#111827", color: "#94a3b8", border: "#1e293b" },
  };
  const c = colors[type] || colors.default;
  return (
    <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {children}
    </span>
  );
}

export function Modal({ title, onClose, children, width = 440, danger }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#0d1520", border: `1px solid ${danger ? "rgba(248,113,113,0.3)" : "#1e293b"}`, borderRadius: 16, padding: "32px", width, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #1e293b", borderTop: "3px solid #94a3b8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "16px 20px", margin: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ color: "#f87171", fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Error de conexión</div>
        <div style={{ color: "#94a3b8", fontSize: 12 }}>{message}</div>
      </div>
      {onRetry && <GhostBtn onClick={onRetry}>Reintentar</GhostBtn>}
    </div>
  );
}
