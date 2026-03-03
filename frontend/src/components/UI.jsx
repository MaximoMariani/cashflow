import { card, iStyle, lStyle } from "../lib/utils.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

export function Card({ children, style }) {
  return <div style={{ ...card, ...style }}>{children}</div>;
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 12, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
      {children}
    </div>
  );
}

export function PageHeader({ pre, title, action }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "center" : "flex-end", marginBottom: isMobile ? 20 : 32, flexWrap: "wrap", gap: 12 }}>
      <div>
        {!isMobile && <div style={{ fontSize: 11, color: "var(--cf-text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{pre}</div>}
        <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: "var(--cf-text)", margin: 0, letterSpacing: "-0.03em" }}>{title}</h1>
      </div>
      {action && !isMobile && action}
    </div>
  );
}

export function PrimaryBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      background: "var(--cf-text)", color: "var(--cf-text-dark)", border: "none",
      padding: "10px 20px", borderRadius: 8, cursor: "pointer",
      fontSize: 13, fontWeight: 700, WebkitTapHighlightColor: "transparent",
      transition: "opacity 0.15s",
      ...style
    }}>{children}</button>
  );
}

export function GhostBtn({ onClick, children, style, danger }) {
  return (
    <button onClick={onClick} style={{
      background: danger ? "var(--cf-negative-tint)" : "var(--cf-card-raised)",
      border: `1px solid ${danger ? "var(--cf-negative-glow)" : "var(--cf-border-hi)"}`,
      color: danger ? "var(--cf-negative)" : "var(--cf-text-muted)",
      padding: "6px 14px", borderRadius: 6, cursor: "pointer",
      fontSize: 12, fontWeight: 600, transition: "all 0.15s",
      WebkitTapHighlightColor: "transparent", ...style
    }}>{children}</button>
  );
}

export function Input({ label, type = "text", value, onChange, placeholder, style: s }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={lStyle}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...iStyle, fontSize: 16, ...s }} />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={lStyle}>{label}</label>}
      <select value={value} onChange={onChange} style={{ ...iStyle, fontSize: 16 }}>
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
    Ingreso: { bg: "var(--cf-positive-tint)",  color: "var(--cf-positive)", border: "var(--cf-positive-glow)" },
    Egreso:  { bg: "var(--cf-negative-tint)", color: "var(--cf-negative)", border: "var(--cf-negative-glow)" },
    default: { bg: "var(--cf-card-raised)", color: "var(--cf-text-muted)", border: "var(--cf-border-mid)" },
  };
  const c = colors[type] || colors.default;
  return (
    <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function Modal({ title, onClose, children, width = 440, danger }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div style={isMobile ? {
        width: "100%", maxHeight: "92vh", overflowY: "auto",
        background: "var(--cf-card)", border: "1px solid var(--cf-border-mid)",
        borderRadius: "16px 16px 0 0", padding: "20px 16px 32px",
      } : {
        background: "var(--cf-card)",
        border: `1px solid ${danger ? "var(--cf-negative-glow)" : "var(--cf-border-mid)"}`,
        borderRadius: 16, padding: "32px", width, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto",
      }}>
        {isMobile && (
          <div style={{ width: 36, height: 4, background: "var(--cf-border-hi)", borderRadius: 2, margin: "0 auto 16px" }} />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: isMobile ? 17 : 18, fontWeight: 700, color: "var(--cf-text)", margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--cf-border-mid)", color: "var(--cf-text-dim)", cursor: "pointer", fontSize: 16, padding: "5px 9px", borderRadius: 6 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 36, height: 36, border: "3px solid var(--cf-border-mid)", borderTop: "3px solid var(--cf-text-muted)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", borderRadius: 10, padding: "16px 20px", margin: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ color: "var(--cf-negative)", fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Error de conexión</div>
        <div style={{ color: "var(--cf-text-muted)", fontSize: 12 }}>{message}</div>
      </div>
      {onRetry && <GhostBtn onClick={onRetry}>Reintentar</GhostBtn>}
    </div>
  );
}
