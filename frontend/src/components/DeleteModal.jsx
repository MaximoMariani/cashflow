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
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Esta acción no se puede deshacer.</p>
      <div style={{ background: "#111827", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{tx.concepto}</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{tx.fecha?.slice?.(0,10) || tx.fecha} · {tx.categoria}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: parseFloat(tx.monto) > 0 ? "#4ade80" : "#f87171", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
          {parseFloat(tx.monto) > 0 ? "+" : ""}{fmt(tx.monto)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: "#111827", border: "1px solid #1e293b", color: "#94a3b8", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Cancelar
        </button>
        <button onClick={handle} disabled={loading} style={{ flex: 1, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </Modal>
  );
}
