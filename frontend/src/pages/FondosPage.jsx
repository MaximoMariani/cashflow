import { useState } from "react";
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
          <div style={{ display: "flex", alignItems: "center", background: "#111827", border: "1px solid #1e293b", borderRadius: 8, flex: 1 }}>
            <span style={{ padding: "0 10px", color: "#475569" }}>$</span>
            <input type="number" value={item.monto || ""} onChange={e => handleDebounced(item.id, "monto", e.target.value)}
              placeholder="0" style={{ ...iStyle, background: "transparent", border: "none", padding: "10px 10px 10px 0", flex: 1 }} />
          </div>
          <button onClick={() => onDelete(item.id)}
            style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 16, padding: "4px 8px" }}
            onMouseEnter={e => e.target.style.color = "#f87171"}
            onMouseLeave={e => e.target.style.color = "#334155"}>✕</button>
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
  const { dineroEstimado, fondosInversion, dashConfig, addEstimado, updateEstimado, deleteEstimado, addFondo, updateFondo, deleteFondo, saveConfig } = data;
  const [saldoRespaldo, setSaldoRespaldo] = useState(dashConfig?.saldo_respaldo || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalEstimado = dineroEstimado.reduce((a, d) => a + (parseFloat(d.monto) || 0), 0);
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
      <PageHeader pre="Activos" title="Fondos & Cobros" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Estimado por Cobrar", value: fmt(totalEstimado), color: "#4ade80" },
          { label: "Fondos de Inversión", value: fmt(totalFondos), color: "#94a3b8" },
          { label: "Saldo de Respaldo", value: saldoRespaldo ? fmt(parseFloat(saldoRespaldo)) : "—", color: "#64748b" },
        ].map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Dinero Estimado */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Dinero Estimado por Cobrar</SectionTitle>
          <button onClick={() => addEstimado({ concepto: "", monto: 0 })}
            style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            + Agregar
          </button>
        </div>
        {dineroEstimado.length === 0
          ? <p style={{ color: "#334155", fontSize: 13 }}>No hay cobros pendientes registrados.</p>
          : <ListEditor items={dineroEstimado} onAdd={() => addEstimado({ concepto: "", monto: 0 })} onUpdate={updateEstimado} onDelete={deleteEstimado} fieldKey="concepto" placeholder="Concepto (ej: Cobro cliente X)" color="#4ade80" />
        }
      </Card>

      {/* Fondos Inversión */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Fondos de Inversión</SectionTitle>
          <button onClick={() => addFondo({ nombre: "", monto: 0 })}
            style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            + Agregar
          </button>
        </div>
        {fondosInversion.length === 0
          ? <p style={{ color: "#334155", fontSize: 13 }}>No hay fondos registrados.</p>
          : <ListEditor items={fondosInversion} onAdd={() => addFondo({ nombre: "", monto: 0 })} onUpdate={updateFondo} onDelete={deleteFondo} fieldKey="nombre" placeholder="Nombre del fondo / instrumento" color="#94a3b8" />
        }
      </Card>

      {/* Saldo Respaldo */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <SectionTitle>Saldo de Respaldo</SectionTitle>
          <button onClick={saveSaldoRespaldo} disabled={saving}
            style={{ background: saved ? "rgba(74,222,128,0.15)" : "#1e293b", border: `1px solid ${saved ? "rgba(74,222,128,0.3)" : "#334155"}`, color: saved ? "#4ade80" : "#94a3b8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {saving ? "..." : saved ? "✓ Guardado" : "Guardar"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#475569", marginTop: 0, marginBottom: 14 }}>Fondo de emergencia. Se considera en el cálculo de Dinero a Favor.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#475569", fontSize: 18 }}>$</span>
          <input type="number" value={saldoRespaldo} onChange={e => setSaldoRespaldo(e.target.value)} placeholder="0"
            style={{ ...iStyle, fontSize: 26, fontWeight: 700, color: saldoRespaldo ? "#64748b" : "#334155", fontFamily: "'DM Mono',monospace", background: "transparent", border: "none", padding: 0 }} />
        </div>
      </Card>
    </div>
  );
}
