import { useState, useMemo } from "react";
import { Card, PageHeader, SectionTitle } from "../components/UI.jsx";
import { fmt, iStyle } from "../lib/utils.js";

function ObligCard({ label, value, onChange, color = "#f87171" }) {
  return (
    <Card>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "#475569", fontSize: 18 }}>$</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0"
          style={{ ...iStyle, fontSize: 24, fontWeight: 700, color: value ? color : "#334155", fontFamily: "'DM Mono',monospace", background: "transparent", border: "none", padding: 0 }} />
      </div>
      {value > 0 && <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>{fmt(-Math.abs(parseFloat(value)))}</div>}
    </Card>
  );
}

export default function ObligacionesPage({ data }) {
  const { transactions, dashConfig, saveConfig } = data;
  const [localConfig, setLocalConfig] = useState({
    proveedores: dashConfig?.proveedores || 0,
    talleres: dashConfig?.talleres || 0,
    sueldos_pendientes: dashConfig?.sueldos_pendientes || 0,
    oblig_oficinas: dashConfig?.oblig_oficinas || 0,
    dinero_liquidar: dashConfig?.dinero_liquidar || 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saldoFinal = useMemo(() => transactions.reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const totalOblig = (parseFloat(localConfig.proveedores) || 0) + (parseFloat(localConfig.talleres) || 0) + (parseFloat(localConfig.sueldos_pendientes) || 0) + (parseFloat(localConfig.oblig_oficinas) || 0);
  const saldoConOblig = saldoFinal - totalOblig;

  const set = (k) => (v) => setLocalConfig(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig({ ...dashConfig, ...localConfig });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader pre="Pasivos" title="Obligaciones" action={
        <button onClick={handleSave} disabled={saving} style={{ background: saved ? "rgba(74,222,128,0.15)" : "#f8fafc", color: saved ? "#4ade80" : "#060a10", border: saved ? "1px solid rgba(74,222,128,0.3)" : "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.3s" }}>
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
        </button>
      } />

      {/* Summary banner */}
      <Card style={{ marginBottom: 20, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap", background: totalOblig > 0 ? "rgba(248,113,113,0.04)" : "#0d1520", borderColor: totalOblig > 0 ? "rgba(248,113,113,0.2)" : "#1a2236" }}>
        {[
          { label: "Total Obligaciones", value: fmt(totalOblig), color: "#f87171" },
          { label: "Saldo Neto c/ Oblig.", value: fmt(saldoConOblig), color: saldoConOblig >= 0 ? "#4ade80" : "#f87171" },
          { label: "Dinero a Liquidar", value: localConfig.dinero_liquidar ? fmt(parseFloat(localConfig.dinero_liquidar)) : "—", color: "#facc15" },
        ].map((k, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color, letterSpacing: "-0.03em", fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 44, background: "#1a2236" }} />}
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 14 }}>
        <ObligCard label="Proveedores" value={localConfig.proveedores} onChange={set("proveedores")} />
        <ObligCard label="Talleres" value={localConfig.talleres} onChange={set("talleres")} />
        <ObligCard label="Sueldos Pendientes" value={localConfig.sueldos_pendientes} onChange={set("sueldos_pendientes")} />
        <ObligCard label="Oblig. Oficinas" value={localConfig.oblig_oficinas} onChange={set("oblig_oficinas")} />
      </div>

      <Card>
        <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Dinero a Liquidar</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#475569", fontSize: 18 }}>$</span>
          <input type="number" value={localConfig.dinero_liquidar} onChange={e => set("dinero_liquidar")(e.target.value)} placeholder="0"
            style={{ ...iStyle, fontSize: 24, fontWeight: 700, color: localConfig.dinero_liquidar ? "#facc15" : "#334155", fontFamily: "'DM Mono',monospace", background: "transparent", border: "none", padding: 0 }} />
        </div>
      </Card>
    </div>
  );
}
