import { useMemo, useState } from "react";
import { PageHeader, PrimaryBtn, Badge } from "../components/UI.jsx";
import { CATEGORIAS, fmt, fmtFull, iStyle } from "../lib/utils.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import TxModal from "../components/TxModal.jsx";
import DeleteModal from "../components/DeleteModal.jsx";

export default function MovimientosPage({ data }) {
  const { transactions, cuentas, addTransaction, updateTransaction, deleteTransaction } = data;
  const [showAdd,    setShowAdd]    = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterCat,  setFilterCat]  = useState("Todas");
  const [filterCuenta, setFilterCuenta] = useState("Todas");
  const [menuOpen,   setMenuOpen]   = useState(null); // id of row with open menu
  const isMobile = useIsMobile();

  const filtered = useMemo(() => transactions.filter(t => {
    if (filterTipo !== "Todos" && t.tipo !== filterTipo) return false;
    if (filterCat !== "Todas" && t.categoria !== filterCat) return false;
    if (filterCuenta !== "Todas" && t.cuenta !== filterCuenta) return false;
    return true;
  }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)), [transactions, filterTipo, filterCat, filterCuenta]);

  const netFiltered = filtered.reduce((a, t) => a + parseFloat(t.monto), 0);

  const filterBtn = (val, active, onClick) => (
    <button onClick={onClick} style={{
      padding: isMobile ? "8px 12px" : "7px 14px", borderRadius: 6, cursor: "pointer",
      fontSize: isMobile ? 13 : 12, fontWeight: 500,
      background: active ? "#1e293b" : "transparent",
      border: active ? "1px solid #334155" : "1px solid #1a2236",
      color: active ? "#f8fafc" : "#64748b", transition: "all 0.12s",
      WebkitTapHighlightColor: "transparent",
    }}>{val}</button>
  );

  const handleAddClick = () => setShowAdd(true);

  return (
    <div>
      <PageHeader pre="Registro" title="Movimientos"
        action={<PrimaryBtn onClick={handleAddClick}>+ Agregar</PrimaryBtn>} />

      {/* Mobile FAB */}
      {isMobile && (
        <button onClick={handleAddClick} style={{
          position: "fixed", bottom: 72, right: 16, zIndex: 90,
          background: "#f8fafc", color: "#060a10", border: "none",
          width: 52, height: 52, borderRadius: "50%", fontSize: 22, fontWeight: 700,
          cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          WebkitTapHighlightColor: "transparent",
        }}>+</button>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {["Todos", "Ingreso", "Egreso"].map(f => filterBtn(f, filterTipo === f, () => setFilterTipo(f)))}
        {!isMobile && (
          <>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...iStyle, width: "auto", padding: "7px 12px" }}>
              <option value="Todas">Todas las categorias</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterCuenta} onChange={e => setFilterCuenta(e.target.value)} style={{ ...iStyle, width: "auto", padding: "7px 12px" }}>
              <option value="Todas">Todas las cuentas</option>
              {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </>
        )}
        {(filterTipo !== "Todos" || filterCat !== "Todas" || filterCuenta !== "Todas") && (
          <button onClick={() => { setFilterTipo("Todos"); setFilterCat("Todas"); setFilterCuenta("Todas"); }}
            style={{ background: "none", border: "1px solid #1a2236", color: "#475569", padding: isMobile ? "8px 12px" : "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
            x Limpiar
          </button>
        )}
      </div>

      {/* Mobile filter row 2 */}
      {isMobile && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...iStyle, width: "auto", padding: "8px 10px", fontSize: 13, flex: 1 }}>
            <option value="Todas">Todas las categorias</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterCuenta} onChange={e => setFilterCuenta(e.target.value)} style={{ ...iStyle, width: "auto", padding: "8px 10px", fontSize: 13, flex: 1 }}>
            <option value="Todas">Todas las cuentas</option>
            {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      {/* DESKTOP TABLE */}
      {!isMobile && (
        <div style={{ background: "#0d1520", border: "1px solid #1a2236", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2236" }}>
                {["Fecha", "Concepto", "Categoria", "Cuenta", "Tipo", "Monto", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "13px 16px", textAlign: h === "Monto" ? "right" : "left", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#334155", fontSize: 13 }}>Sin resultados para los filtros aplicados</td></tr>
              )}
              {filtered.map((t, i) => (
                <tr key={t.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid #0d1520" : "none", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#111827"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{t.fecha?.slice(0, 10)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{t.concepto}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 4, background: "#111827", fontSize: 11, color: "#94a3b8", border: "1px solid #1e293b", whiteSpace: "nowrap" }}>{t.categoria}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{t.cuenta}</td>
                  <td style={{ padding: "12px 16px" }}><Badge type={t.tipo}>{t.tipo}</Badge></td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono',monospace", color: parseFloat(t.monto) > 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                    {parseFloat(t.monto) > 0 ? "+" : ""}{fmtFull(t.monto)}
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditing(t)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#334155"; e.currentTarget.style.color = "#f8fafc"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}>Editar</button>
                      <button onClick={() => setDeleting(t)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MOBILE CARD LIST */}
      {isMobile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#334155", fontSize: 13, background: "#0d1520", borderRadius: 12, border: "1px solid #1a2236" }}>
              Sin resultados
            </div>
          )}
          {filtered.map(t => (
            <div key={t.id} style={{ background: "#0d1520", border: "1px solid #1a2236", borderRadius: 12, padding: "14px 14px 12px", position: "relative" }}>
              {/* Row 1: concepto + monto */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", flex: 1, lineHeight: 1.3 }}>
                  {t.concepto}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: parseFloat(t.monto) > 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                  {parseFloat(t.monto) > 0 ? "+" : ""}{fmt(parseFloat(t.monto))}
                </div>
              </div>
              {/* Row 2: fecha + categoria */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono',monospace" }}>{t.fecha?.slice(0, 10)}</span>
                <span style={{ fontSize: 10, color: "#334155" }}>·</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{t.categoria}</span>
                <span style={{ fontSize: 10, color: "#334155" }}>·</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{t.cuenta}</span>
              </div>
              {/* Row 3: badge + actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Badge type={t.tipo}>{t.tipo}</Badge>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditing(t)}
                    style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 6, WebkitTapHighlightColor: "transparent" }}>
                    Editar
                  </button>
                  <button onClick={() => setDeleting(t)}
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 6, WebkitTapHighlightColor: "transparent" }}>
                    x
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#334155" }}>
        {filtered.length} movimiento{filtered.length !== 1 ? "s" : ""} · Neto:{" "}
        <span style={{ color: netFiltered >= 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace" }}>{fmt(netFiltered)}</span>
      </div>

      {(showAdd || editing) && (
        <TxModal tx={editing} cuentas={cuentas} onSave={editing ? (d) => updateTransaction(editing.id, d) : addTransaction} onClose={() => { setShowAdd(false); setEditing(null); }} />
      )}
      {deleting && (
        <DeleteModal tx={deleting} onConfirm={() => deleteTransaction(deleting.id)} onClose={() => setDeleting(null)} />
      )}
    </div>
  );
}
