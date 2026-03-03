import { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Card, PageHeader, Modal, PrimaryBtn } from "../components/UI.jsx";
import { fmt, fmtFull, iStyle, lStyle } from "../lib/utils.js";

export default function CuentasPage({ data }) {
  const { cuentas, transactions, addCuenta, deleteCuenta, updateCuentaBalance } = data;
  const isMobile = useIsMobile();

  const [showModal,    setShowModal]    = useState(false);
  const [nombre,       setNombre]       = useState("");
  const [err,          setErr]          = useState("");
  const [saving,       setSaving]       = useState(false);

  // Estado para editar balance_actual en línea
  const [editingBal,   setEditingBal]   = useState(null); // id de la cuenta en edición
  const [balInput,     setBalInput]     = useState("");
  const [balSaving,    setBalSaving]    = useState(false);
  const [balErr,       setBalErr]       = useState("");

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

  const startEditBal = (cuenta) => {
    setEditingBal(cuenta.id);
    setBalInput(parseFloat(cuenta.balance_actual || 0).toString());
    setBalErr("");
  };

  const cancelEditBal = () => {
    setEditingBal(null); setBalInput(""); setBalErr("");
  };

  const saveBalance = async (id) => {
    const val = parseFloat(balInput);
    if (isNaN(val)) { setBalErr("Ingresá un número válido"); return; }
    setBalSaving(true); setBalErr("");
    try {
      await updateCuentaBalance(id, val);
      setEditingBal(null); setBalInput("");
    } catch (e) {
      setBalErr(e.message);
    } finally { setBalSaving(false); }
  };

  // Totales para mostrar en el header
  const liquidezTotal = cuentas.reduce((a, c) => a + parseFloat(c.balance_actual || 0), 0);

  return (
    <div>
      <PageHeader pre="Config" title="Cuentas" action={<PrimaryBtn onClick={() => setShowModal(true)}>+ Nueva Cuenta</PrimaryBtn>} />

      {/* Mobile add button */}
      {isMobile && (
        <button onClick={() => setShowModal(true)} style={{ width: "100%", background: "#f8fafc", color: "#060a10", border: "none", padding: "13px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 16, WebkitTapHighlightColor: "transparent" }}>
          + Nueva Cuenta
        </button>
      )}

      {/* Liquidez total banner */}
      {cuentas.length > 0 && (
        <div style={{ background: "#0d1520", border: "1px solid #1a2236", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Liquidez actual total (Dashboard)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: liquidezTotal >= 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.02em" }}>
              {fmt(liquidezTotal)}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#334155", textAlign: "right", lineHeight: 1.6 }}>
            Suma de balance_actual<br />de todas las cuentas
          </div>
        </div>
      )}

      {cuentas.length === 0 && (
        <div style={{ background: "#0d1520", border: "1px solid #1a2236", borderRadius: 12, padding: "40px", textAlign: "center", color: "#334155", fontSize: 13 }}>
          No hay cuentas. Creá una para empezar.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
        {cuentas.map(cuenta => {
          // Estadísticas de movimientos (solo informativas, no afectan liquidezActual del dashboard)
          const txC = transactions.filter(t => t.cuenta === cuenta.nombre);
          const ing = txC.filter(t => parseFloat(t.monto) > 0).reduce((a, t) => a + parseFloat(t.monto), 0);
          const egr = txC.filter(t => parseFloat(t.monto) < 0).reduce((a, t) => a + Math.abs(parseFloat(t.monto)), 0);
          const balActual = parseFloat(cuenta.balance_actual || 0);
          const isEditing = editingBal === cuenta.id;

          return (
            <Card key={cuenta.id}>
              {/* Header: nombre + eliminar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{cuenta.nombre}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{txC.length} movimiento{txC.length !== 1 ? "s" : ""}</div>
                </div>
                {cuentas.length > 1 && (
                  <button onClick={() => handleDelete(cuenta.id)}
                    style={{ background: "none", border: "1px solid #1e293b", color: "#475569", cursor: "pointer", fontSize: 11, padding: "4px 10px", borderRadius: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#475569"; }}>
                    Eliminar
                  </button>
                )}
              </div>

              {/* Balance actual (spec: liquidezActual = Σ balance_actual) */}
              <div style={{ background: "#111827", border: "1px solid #1a2236", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  Balance actual (impacta liquidez del Dashboard)
                </div>
                {isEditing ? (
                  <div>
                    <input
                      type="number"
                      value={balInput}
                      onChange={e => setBalInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveBalance(cuenta.id); if (e.key === "Escape") cancelEditBal(); }}
                      autoFocus
                      style={{ ...iStyle, fontSize: 20, fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 8 }}
                    />
                    {balErr && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 8 }}>{balErr}</div>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveBalance(cuenta.id)} disabled={balSaving}
                        style={{ flex: 1, background: "#f8fafc", color: "#060a10", border: "none", padding: "9px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: balSaving ? 0.6 : 1, WebkitTapHighlightColor: "transparent" }}>
                        {balSaving ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={cancelEditBal}
                        style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", padding: "9px 14px", borderRadius: 7, cursor: "pointer", fontSize: 13, WebkitTapHighlightColor: "transparent" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: balActual >= 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace", letterSpacing: "-0.02em" }}>
                      {fmt(balActual)}
                    </div>
                    <button onClick={() => startEditBal(cuenta)}
                      style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, WebkitTapHighlightColor: "transparent" }}>
                      Actualizar
                    </button>
                  </div>
                )}
              </div>

              {/* Estadísticas de movimientos (informativas) */}
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Ingresos registrados</div>
                  <div style={{ fontSize: 13, color: "#4ade80", fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>+{fmt(ing)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Egresos registrados</div>
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
