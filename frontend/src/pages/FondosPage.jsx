import { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Card, PageHeader, SectionTitle } from "../components/UI.jsx";
import { fmt, iStyle } from "../lib/utils.js";

function ListEditor({ items, onAdd, onUpdate, onDelete, fieldKey, placeholder, color }) {
  const total = items.reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);

  const handleDebounced = (id, field, value) => {
    onUpdate(id, { ...items.find(x => x.id === id), [field]: value });
  };

  return (
    <div>
      {items.map(item => (
        <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <input value={item[fieldKey] || ""} onChange={e => handleDebounced(item.id, fieldKey, e.target.value)}
            placeholder={placeholder} style={{ ...iStyle, flex: 2 }} />
          <div style={{ display: "flex", alignItems: "center", background: "var(--cf-card-raised)", border: "1px solid #1e293b", borderRadius: 8, flex: 1 }}>
            <span style={{ padding: "0 10px", color: "var(--cf-text-dim)" }}>$</span>
            <input type="number" value={item.monto || ""} onChange={e => handleDebounced(item.id, "monto", e.target.value)}
              placeholder="0" style={{ ...iStyle, background: "transparent", border: "none", padding: "10px 10px 10px 0", flex: 1 }} />
          </div>
          <button onClick={() => onDelete(item.id)}
            style={{ background: "none", border: "none", color: "var(--cf-border-hi)", cursor: "pointer", fontSize: 16, padding: "4px 8px" }}
            onMouseEnter={e => e.target.style.color = "var(--cf-negative)"}
            onMouseLeave={e => e.target.style.color = "var(--cf-border-hi)"}>✕</button>
        </div>
      ))}
      {items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid #111827", fontSize: 13, fontWeight: 600, color, fontFamily: "'DM Mono',monospace" }}>
          Total: {fmt(total)}
        </div>
      )}
    </div>
  );
}

export default function FondosPage({ data }) {
  const { fondosInversion, dashConfig, addFondo, updateFondo, deleteFondo, saveConfig } = data;
  const [saldoRespaldo, setSaldoRespaldo] = useState(dashConfig?.saldo_respaldo || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalFondos = fondosInversion.reduce((a, f) => a + (parseFloat(f.monto) || 0), 0);

  const saveSaldoRespaldo = async () => {
    setSaving(true);
    try {
      await saveConfig({ ...dashConfig, saldo_respaldo: parseFloat(saldoRespaldo) || 0 });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader pre="Activos" title="Fondos" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Fondos de Inversión", value: fmt(totalFondos), color: "var(--cf-text-muted)" },
          { label: "Saldo de Respaldo", value: saldoRespaldo ? fmt(parseFloat(saldoRespaldo)) : "—", color: "var(--cf-text-faint)" },
        ].map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
          </Card>
        ))}
      </div>


      {/* Fondos Inversión */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Fondos de Inversión</SectionTitle>
          <button onClick={() => addFondo({ nombre: "", monto: 0 })}
            style={{ background: "var(--cf-border-mid)", border: "1px solid #334155", color: "var(--cf-text-muted)", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            + Agregar
          </button>
        </div>
        {fondosInversion.length === 0
          ? <p style={{ color: "var(--cf-border-hi)", fontSize: 13 }}>No hay fondos registrados.</p>
          : <ListEditor items={fondosInversion} onAdd={() => addFondo({ nombre: "", monto: 0 })} onUpdate={updateFondo} onDelete={deleteFondo} fieldKey="nombre" placeholder="Nombre del fondo / instrumento" color="var(--cf-text-muted)" />
        }
      </Card>

      {/* Saldo Respaldo */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <SectionTitle>Saldo de Respaldo</SectionTitle>
          <button onClick={saveSaldoRespaldo} disabled={saving}
            style={{ background: saved ? "var(--cf-positive-tint)" : "var(--cf-border-mid)", border: `1px solid ${saved ? "var(--cf-positive-glow)" : "var(--cf-border-hi)"}`, color: saved ? "var(--cf-positive)" : "var(--cf-text-muted)", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {saving ? "..." : saved ? "✓ Guardado" : "Guardar"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--cf-text-dim)", marginTop: 0, marginBottom: 14 }}>Fondo de emergencia. Se considera en el cálculo de Dinero a Favor.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--cf-text-dim)", fontSize: 18 }}>$</span>
          <input type="number" value={saldoRespaldo} onChange={e => setSaldoRespaldo(e.target.value)} placeholder="0"
            style={{ ...iStyle, fontSize: 26, fontWeight: 700, color: saldoRespaldo ? "var(--cf-text-faint)" : "var(--cf-border-hi)", fontFamily: "'DM Mono',monospace", background: "transparent", border: "none", padding: 0 }} />
        </div>
      </Card>
    </div>
  );
}
