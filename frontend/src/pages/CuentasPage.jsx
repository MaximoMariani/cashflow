import { useState } from "react";
import { Card, PageHeader, Modal, PrimaryBtn } from "../components/UI.jsx";
import { fmt, iStyle, lStyle } from "../lib/utils.js";

export default function CuentasPage({ data }) {
  const { cuentas, transactions, addCuenta, deleteCuenta } = data;
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const n = nombre.trim();
    if (!n) { setErr("Ingresá un nombre"); return; }
    setSaving(true); setErr("");
    try {
      await addCuenta(n);
      setNombre(""); setShowModal(false);
    } catch (e) {
      setErr(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (cuentas.length <= 1) return;
    await deleteCuenta(id);
  };

  return (
    <div>
      <PageHeader pre="Config" title="Cuentas" action={<PrimaryBtn onClick={() => setShowModal(true)}>+ Nueva Cuenta</PrimaryBtn>} />

      {cuentas.length === 0 && (
        <Card><p style={{ color: "#334155", fontSize: 13 }}>No hay cuentas. Creá una para empezar.</p></Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {cuentas.map(cuenta => {
          const txC = transactions.filter(t => t.cuenta === cuenta.nombre);
          const total = txC.reduce((a, t) => a + parseFloat(t.monto), 0);
          const ing = txC.filter(t => parseFloat(t.monto) > 0).reduce((a, t) => a + parseFloat(t.monto), 0);
          const egr = txC.filter(t => parseFloat(t.monto) < 0).reduce((a, t) => a + Math.abs(parseFloat(t.monto)), 0);

          return (
            <Card key={cuenta.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{cuenta.nombre}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{txC.length} movimiento{txC.length !== 1 ? "s" : ""}</div>
                </div>
                {cuentas.length > 1 && (
                  <button onClick={() => handleDelete(cuenta.id)}
                    style={{ background: "none", border: "1px solid #1e293b", color: "#475569", cursor: "pointer", fontSize: 11, padding: "4px 10px", borderRadius: 6, transition: "all 0.1s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#475569"; }}>
                    Eliminar
                  </button>
                )}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: total >= 0 ? "#4ade80" : "#f87171", letterSpacing: "-0.03em", marginBottom: 16, fontFamily: "'DM Mono',monospace" }}>
                {fmt(total)}
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Ingresos</div>
                  <div style={{ fontSize: 13, color: "#4ade80", fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>+{fmt(ing)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Egresos</div>
                  <div style={{ fontSize: 13, color: "#f87171", fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>-{fmt(egr)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <Modal title="Nueva Cuenta" onClose={() => { setShowModal(false); setNombre(""); setErr(""); }} width={380}>
          <label style={lStyle}>Nombre de la cuenta</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="ej: Banco Galicia, Efectivo, Crypto..."
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{ ...iStyle, marginBottom: err ? 8 : 20 }} autoFocus />
          {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 16, padding: "6px 10px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{err}</div>}
          <PrimaryBtn onClick={handleAdd} style={{ width: "100%", padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Creando..." : "Crear Cuenta"}
          </PrimaryBtn>
        </Modal>
      )}
    </div>
  );
}
