import { useState } from "react";
import { Modal } from "./UI.jsx";
import { fmt } from "../lib/utils.js";

export default function DeleteModal({ tx, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    catch (e) { setLoading(false); }
  };

  return (
    <Modal title="¿Eliminar movimiento?" onClose={onClose} width={380} danger>
      <p style={{ fontSize: 13, color: "var(--cf-text-faint)", marginBottom: 16 }}>Esta acción no se puede deshacer.</p>
      <div style={{ background: "var(--cf-card-raised)", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cf-text-sub)", marginBottom: 4 }}>{tx.concepto}</div>
        <div style={{ fontSize: 12, color: "var(--cf-text-dim)" }}>{tx.fecha?.slice?.(0,10) || tx.fecha} · {tx.categoria}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: parseFloat(tx.monto) > 0 ? "var(--cf-positive)" : "var(--cf-negative)", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
          {parseFloat(tx.monto) > 0 ? "+" : ""}{fmt(tx.monto)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: "var(--cf-card-raised)", border: "1px solid #1e293b", color: "var(--cf-text-muted)", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Cancelar
        </button>
        <button onClick={handle} disabled={loading} style={{ flex: 1, background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", color: "var(--cf-negative)", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </Modal>
  );
}
