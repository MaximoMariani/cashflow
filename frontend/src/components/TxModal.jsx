import { useState, useEffect } from "react";
import { Modal, PrimaryBtn } from "./UI.jsx";
import { CATEGORIAS, iStyle, lStyle } from "../lib/utils.js";

const blank = (cuentas) => ({
  fecha: new Date().toISOString().slice(0, 10),
  concepto: "", tipo: "Ingreso", certeza: "CONFIRMADO",
  categoria: CATEGORIAS[0], monto: "", cuenta: cuentas[0]?.nombre || "",
});

export default function TxModal({ tx, cuentas, onSave, onClose }) {
  const [form,   setForm]   = useState(blank(cuentas));
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    if (tx) {
      setForm({
        ...tx,
        monto:   Math.abs(parseFloat(tx.monto)).toString(),
        certeza: tx.certeza || "CONFIRMADO",
      });
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
    setSaving(true); setErr("");
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

  // Tipo toggle colors
  const tipoColors = {
    Ingreso: { bg: "var(--cf-positive-tint)", border: "var(--cf-positive-glow)", text: "var(--cf-positive)" },
    Egreso:  { bg: "var(--cf-negative-tint)", border: "var(--cf-negative-glow)", text: "var(--cf-negative)" },
  };

  // Certeza toggle colors
  const certezaColors = {
    CONFIRMADO: { bg: "var(--cf-accent-tint)",   border: "var(--cf-accent-glow)",   text: "var(--cf-accent)" },
    PROBABLE:   { bg: "var(--cf-warning-tint)",   border: "var(--cf-warning-glow)",  text: "var(--cf-warning)" },
  };

  const toggleBtn = (label, key, value, colors) => {
    const active = form[key] === value;
    const c = colors[value];
    return (
      <button key={value} onClick={() => setForm(p => ({ ...p, [key]: value }))} style={{
        flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer",
        fontSize: 13, fontWeight: 600, border: "1px solid",
        background: active ? c.bg   : "transparent",
        borderColor: active ? c.border : "var(--cf-border-mid)",
        color: active ? c.text : "var(--cf-text-faint)",
        WebkitTapHighlightColor: "transparent",
      }}>{label}</button>
    );
  };

  return (
    <Modal title={tx ? "Editar Movimiento" : "Nuevo Movimiento"} onClose={onClose}>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Fecha</label>
        <input type="date" value={form.fecha} onChange={set("fecha")} style={{ ...iStyle, fontSize: 16 }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Concepto</label>
        <input type="text" value={form.concepto} onChange={set("concepto")}
          placeholder="Ej: Pago proveedor, Venta..." style={{ ...iStyle, fontSize: 16 }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Monto ($)</label>
        <input type="number" value={form.monto} onChange={set("monto")}
          placeholder="0" style={{ ...iStyle, fontSize: 16 }} />
      </div>

      {/* Tipo: Ingreso / Egreso */}
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Tipo</label>
        <div style={{ display: "flex", gap: 8 }}>
          {toggleBtn("Ingreso", "tipo", "Ingreso", tipoColors)}
          {toggleBtn("Egreso",  "tipo", "Egreso",  tipoColors)}
        </div>
      </div>

      {/* Certeza: Confirmado / Probable */}
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Certeza</label>
        <div style={{ display: "flex", gap: 8 }}>
          {toggleBtn("Confirmado", "certeza", "CONFIRMADO", certezaColors)}
          {toggleBtn("Probable",   "certeza", "PROBABLE",   certezaColors)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Categoría</label>
        <select value={form.categoria} onChange={set("categoria")} style={{ ...iStyle, fontSize: 16 }}>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={lStyle}>Cuenta</label>
        <select value={form.cuenta} onChange={set("cuenta")} style={{ ...iStyle, fontSize: 16 }}>
          {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
      </div>

      {err && (
        <div style={{ color: "var(--cf-negative)", fontSize: 12, marginBottom: 12,
          padding: "8px 12px", background: "var(--cf-negative-tint)", borderRadius: 6 }}>
          {err}
        </div>
      )}

      <PrimaryBtn onClick={handleSave}
        style={{ width: "100%", padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Guardando..." : tx ? "Guardar Cambios" : "Agregar Movimiento"}
      </PrimaryBtn>
    </Modal>
  );
}
