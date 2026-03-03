import { useState, useEffect } from "react";
import { Modal, Input, Select, PrimaryBtn } from "./UI.jsx";
import { CATEGORIAS, iStyle, lStyle } from "../lib/utils.js";

const blank = (cuentas) => ({
  fecha: new Date().toISOString().slice(0, 10),
  concepto: "", tipo: "Ingreso",
  categoria: CATEGORIAS[0], monto: "", cuenta: cuentas[0]?.nombre || ""
});

export default function TxModal({ tx, cuentas, onSave, onClose }) {
  const [form, setForm] = useState(blank(cuentas));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (tx) {
      setForm({ ...tx, monto: Math.abs(parseFloat(tx.monto)).toString() });
    } else {
      setForm(blank(cuentas));
    }
  }, [tx, cuentas]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.fecha || !form.concepto || !form.monto) {
      setErr("Completá todos los campos obligatorios");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const monto = form.tipo === "Egreso"
        ? -Math.abs(parseFloat(form.monto))
        : Math.abs(parseFloat(form.monto));
      await onSave({ ...form, monto });
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={tx ? "Editar Movimiento" : "Nuevo Movimiento"} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Fecha</label>
        <input type="date" value={form.fecha} onChange={set("fecha")} style={iStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Concepto</label>
        <input type="text" value={form.concepto} onChange={set("concepto")} placeholder="Ej: Pago proveedor, Venta..." style={iStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Monto ($)</label>
        <input type="number" value={form.monto} onChange={set("monto")} placeholder="0" style={iStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Tipo</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["Ingreso", "Egreso"].map(t => (
            <button key={t} onClick={() => setForm(p => ({ ...p, tipo: t }))} style={{
              flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: "1px solid",
              background: form.tipo === t ? (t === "Ingreso" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)") : "transparent",
              borderColor: form.tipo === t ? (t === "Ingreso" ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)") : "#1e293b",
              color: form.tipo === t ? (t === "Ingreso" ? "#4ade80" : "#f87171") : "#64748b",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Categoría</label>
        <select value={form.categoria} onChange={set("categoria")} style={iStyle}>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Cuenta</label>
        <select value={form.cuenta} onChange={set("cuenta")} style={iStyle}>
          {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
      </div>

      {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{err}</div>}

      <PrimaryBtn onClick={handleSave} style={{ width: "100%", padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Guardando..." : tx ? "Guardar Cambios" : "Agregar Movimiento"}
      </PrimaryBtn>
    </Modal>
  );
}
