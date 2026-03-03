import { useState, useMemo } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Card, PageHeader, PrimaryBtn, Badge, Modal } from "../components/UI.jsx";
import { CATEGORIAS, fmt, fmtFull, iStyle, lStyle } from "../lib/utils.js";

const today = () => new Date().toISOString().slice(0, 10);

// Parsea fecha de forma segura independientemente del formato que devuelva Postgres
// (DATE como "2026-03-10", TIMESTAMPTZ como "2026-03-10T00:00:00.000Z", etc.)
const parseDate = (val) => {
  if (!val) return null;
  // Tomar solo los primeros 10 chars si es timestamp completo, para evitar
  // problemas de timezone al concatenar "T00:00:00"
  const iso = typeof val === "string" ? val.slice(0, 10) : null;
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

const formatDateSafe = (val) => {
  const d = parseDate(val);
  if (!d) return "—";
  return d.toLocaleDateString("es-AR");
};

const blankForm = (cuentas) => ({
  fecha_vencimiento: today(),
  concepto: "",
  categoria: CATEGORIAS[0],
  cuenta: cuentas[0]?.nombre || "",
  monto: "",
  notas: "",
  certeza: "CONFIRMADA",  // default conservador
});

// ── Modal crear/editar obligación ─────────────────────────────────────────────
function ObligModal({ oblig, cuentas, onSave, onClose }) {
  const [form, setForm] = useState(oblig
    ? { ...oblig, monto: Math.abs(parseFloat(oblig.monto)).toString(), fecha_vencimiento: oblig.fecha_vencimiento?.slice(0, 10), certeza: oblig.certeza || "CONFIRMADA" }
    : blankForm(cuentas)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.fecha_vencimiento || !form.concepto || !form.cuenta || !form.monto) {
      setErr("Completá todos los campos obligatorios"); return;
    }
    if (parseFloat(form.monto) <= 0) { setErr("El monto debe ser mayor a 0"); return; }
    setSaving(true); setErr("");
    try {
      await onSave({ ...form, monto: Math.abs(parseFloat(form.monto)) });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={oblig ? "Editar Obligación" : "Nueva Obligación"} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Fecha de vencimiento *</label>
        <input type="date" value={form.fecha_vencimiento} onChange={set("fecha_vencimiento")} style={iStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Concepto *</label>
        <input type="text" value={form.concepto} onChange={set("concepto")} placeholder="Ej: Alquiler, Sueldo, Proveedor..." style={iStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Monto ($) *</label>
        <input type="number" value={form.monto} onChange={set("monto")} placeholder="0" style={iStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Categoría</label>
        <select value={form.categoria} onChange={set("categoria")} style={iStyle}>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Cuenta *</label>
        <select value={form.cuenta} onChange={set("cuenta")} style={iStyle}>
          {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Notas (opcional)</label>
        <input type="text" value={form.notas} onChange={set("notas")} placeholder="Detalle adicional..." style={iStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Certeza</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: "CONFIRMADA", label: "Confirmada", color: "#818cf8", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.35)" },
            { val: "PROBABLE",   label: "Probable",   color: "#facc15", bg: "rgba(250,204,21,0.10)",  border: "rgba(250,204,21,0.30)" },
          ].map(({ val, label, color, bg, border }) => (
            <button key={val} onClick={() => setForm(p => ({ ...p, certeza: val }))} style={{
              flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: "1px solid",
              background: form.certeza === val ? bg : "transparent",
              borderColor: form.certeza === val ? border : "#1e293b",
              color: form.certeza === val ? color : "#64748b",
            }}>{label}</button>
          ))}
        </div>
      </div>
      {err && (
        <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>
          {err}
        </div>
      )}
      <PrimaryBtn onClick={handleSave} style={{ width: "100%", padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Guardando..." : oblig ? "Guardar Cambios" : "Crear Obligación"}
      </PrimaryBtn>
    </Modal>
  );
}

// ── Modal confirmar pago ──────────────────────────────────────────────────────
function PagarModal({ oblig, onConfirm, onClose }) {
  const [fechaPago, setFechaPago] = useState(today());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handlePagar = async () => {
    setSaving(true); setErr("");
    try {
      await onConfirm(oblig.id, fechaPago);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Confirmar pago" onClose={onClose} width={420}>
      <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600, marginBottom: 4 }}>Se creará un movimiento de egreso</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          La obligación pasará a PAGADA y se registrará un egreso real por <strong style={{ color: "#f8fafc" }}>{fmtFull(oblig.monto)}</strong> en Movimientos.
        </div>
      </div>
      <div style={{ marginBottom: 8, fontSize: 13, color: "#94a3b8" }}>
        <span style={{ color: "#64748b" }}>Concepto:</span> {oblig.concepto}
      </div>
      <div style={{ marginBottom: 16, fontSize: 13, color: "#94a3b8" }}>
        <span style={{ color: "#64748b" }}>Cuenta:</span> {oblig.cuenta} — <span style={{ color: "#64748b" }}>Categoría:</span> {oblig.categoria}
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={lStyle}>Fecha de pago</label>
        <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} style={iStyle} />
      </div>
      {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{err}</div>}
      <PrimaryBtn onClick={handlePagar} style={{ width: "100%", padding: "12px", fontSize: 14, background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Procesando..." : "Confirmar Pago"}
      </PrimaryBtn>
    </Modal>
  );
}

// ── Fila de obligación ────────────────────────────────────────────────────────
function ObligRow({ o, onPagar, onEdit, onDelete }) {
  const venc = parseDate(o.fecha_vencimiento);
  const diffDays = venc ? Math.ceil((venc - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isVencida = o.estado === "PENDIENTE" && diffDays !== null && diffDays < 0;
  const isProxima = o.estado === "PENDIENTE" && diffDays !== null && diffDays >= 0 && diffDays <= 7;

  const estadoBadge = o.estado === "PAGADA"
    ? { bg: "rgba(74,222,128,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.3)", label: "Pagada" }
    : isVencida
    ? { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.3)", label: "Vencida" }
    : isProxima
    ? { bg: "rgba(250,204,21,0.12)", color: "#facc15", border: "rgba(250,204,21,0.3)", label: "Próxima" }
    : { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "rgba(100,116,139,0.3)", label: "Pendiente" };

  const rowBg = isVencida ? "rgba(248,113,113,0.03)" : isProxima ? "rgba(250,204,21,0.03)" : "transparent";

  return (
    <tr style={{ borderBottom: "1px solid #1a2236", background: rowBg }}>
      <td style={{ padding: "12px 16px", fontSize: 12, color: isVencida ? "#f87171" : "#94a3b8", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
        {formatDateSafe(o.fecha_vencimiento)}
        {o.estado === "PENDIENTE" && (
          <div style={{ fontSize: 10, color: isVencida ? "#f87171" : isProxima ? "#facc15" : "#475569", marginTop: 2 }}>
            {diffDays !== null ? (isVencida ? `hace ${Math.abs(diffDays)}d` : diffDays === 0 ? "hoy" : `en ${diffDays}d`) : ""}
          </div>
        )}
        {o.estado === "PAGADA" && o.fecha_pago && (
          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
            pagado {formatDateSafe(o.fecha_pago)}
          </div>
        )}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 13, color: "#f8fafc" }}>{o.concepto}</td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>{o.categoria}</td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>{o.cuenta}</td>
      <td style={{ padding: "12px 16px", fontSize: 13, color: "#f87171", fontFamily: "'DM Mono', monospace", textAlign: "right" }}>
        {fmtFull(o.monto)}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: estadoBadge.bg, color: estadoBadge.color, border: `1px solid ${estadoBadge.border}` }}>
          {estadoBadge.label}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {o.estado === "PENDIENTE" && (
            <>
              <button onClick={() => onPagar(o)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600, background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                Pagar
              </button>
              <button onClick={() => onEdit(o)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", background: "rgba(100,116,139,0.1)", color: "#64748b", border: "1px solid #1e293b" }}>
                Editar
              </button>
            </>
          )}
          <button onClick={() => onDelete(o)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", color: "#475569", border: "1px solid #1a2236" }}>
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ObligacionesPage({ data }) {
  const { transactions, obligaciones, obligacionesMetricas, cuentas, addObligacion, updateObligacion, deleteObligacion, pagarObligacion } = data;
  const isMobile = useIsMobile();

  const [showModal, setShowModal] = useState(false);
  const [editOblig, setEditOblig] = useState(null);
  const [pagarOblig, setPagarOblig] = useState(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroCuenta, setFiltroCuenta] = useState("");

  const saldoActual = useMemo(() => transactions.reduce((a, t) => a + parseFloat(t.monto || 0), 0), [transactions]);
  const totalPendiente = parseFloat(obligacionesMetricas.total_pendiente) || 0;
  const aLiquidar7d = parseFloat(obligacionesMetricas.a_liquidar_7d) || 0;
  const saldoConOblig = saldoActual - totalPendiente;

  const obligFiltradas = useMemo(() => {
    return obligaciones.filter(o => {
      if (filtroEstado !== "TODOS" && o.estado !== filtroEstado) return false;
      if (filtroCategoria && o.categoria !== filtroCategoria) return false;
      if (filtroCuenta && o.cuenta !== filtroCuenta) return false;
      return true;
    });
  }, [obligaciones, filtroEstado, filtroCategoria, filtroCuenta]);

  const categoriasFiltro = useMemo(() => [...new Set(obligaciones.map(o => o.categoria))].sort(), [obligaciones]);
  const cuentasFiltro = useMemo(() => [...new Set(obligaciones.map(o => o.cuenta))].sort(), [obligaciones]);

  const handlePagar = async (id, fechaPago) => {
    await pagarObligacion(id, fechaPago);
  };

  const handleDelete = async (o) => {
    if (!window.confirm(`¿Eliminar la obligación "${o.concepto}"?`)) return;
    try { await deleteObligacion(o.id); } catch (e) { alert(e.message); }
  };

  const btnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: active ? "rgba(248,113,113,0.15)" : "transparent",
    color: active ? "#f87171" : "#64748b",
    border: active ? "1px solid rgba(248,113,113,0.3)" : "1px solid #1e293b",
    transition: "all 0.15s",
  });

  return (
    <div>
      <PageHeader
        pre="Pasivos"
        title="Obligaciones"
        action={
          <PrimaryBtn onClick={() => { setEditOblig(null); setShowModal(true); }}>
            + Nueva obligación
          </PrimaryBtn>
        }
      />

      {/* Métricas */}
      <Card style={{ marginBottom: 20, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap", background: totalPendiente > 0 ? "rgba(248,113,113,0.04)" : "#0d1520", borderColor: totalPendiente > 0 ? "rgba(248,113,113,0.2)" : "#1a2236" }}>
        {[
          { label: "Total Pendiente", value: fmt(totalPendiente), color: "#f87171", sub: `${obligacionesMetricas.count_pendiente || 0} obligaciones` },
          { label: "Saldo Neto c/ Oblig.", value: fmt(saldoConOblig), color: saldoConOblig >= 0 ? "#4ade80" : "#f87171", sub: `Saldo actual ${fmt(saldoActual)}` },
          { label: "A liquidar (7 días)", value: aLiquidar7d > 0 ? fmt(aLiquidar7d) : "—", color: "#facc15", sub: "vencen en los próximos 7 días" },
        ].map((k, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color, letterSpacing: "-0.03em", fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{k.sub}</div>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 50, background: "#1a2236" }} />}
          </div>
        ))}
      </Card>

      {/* Filtros */}
      <Card style={{ marginBottom: 16, padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Estado:</span>
          {["TODOS", "PENDIENTE", "PAGADA"].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} style={btnStyle(filtroEstado === e)}>
              {e === "TODOS" ? "Todos" : e === "PENDIENTE" ? "Pendientes" : "Pagadas"}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: "#1e293b", margin: "0 8px" }} />
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...iStyle, width: "auto", padding: "6px 12px", fontSize: 12 }}>
            <option value="">Todas las categorías</option>
            {categoriasFiltro.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filtroCuenta} onChange={e => setFiltroCuenta(e.target.value)} style={{ ...iStyle, width: "auto", padding: "6px 12px", fontSize: 12 }}>
            <option value="">Todas las cuentas</option>
            {cuentasFiltro.map(c => <option key={c}>{c}</option>)}
          </select>
          {(filtroEstado !== "TODOS" || filtroCategoria || filtroCuenta) && (
            <button onClick={() => { setFiltroEstado("TODOS"); setFiltroCategoria(""); setFiltroCuenta(""); }} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", color: "#475569", border: "1px solid #1a2236" }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {obligFiltradas.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#334155" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No hay obligaciones</div>
            <div style={{ fontSize: 12, color: "#1e293b" }}>
              {obligaciones.length === 0 ? 'Creá tu primera obligación con "+ Nueva obligación"' : "Probá cambiando los filtros"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  {["Vencimiento", "Concepto", "Categoría", "Cuenta", "Monto", "Estado", ""].map((h, i) => (
                    <th key={i} style={{ padding: "12px 16px", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: i === 4 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obligFiltradas.map(o => (
                  <ObligRow
                    key={o.id}
                    o={o}
                    onPagar={setPagarOblig}
                    onEdit={(o) => { setEditOblig(o); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Totales pie de tabla */}
      {obligFiltradas.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px 0", gap: 24, fontSize: 12, color: "#475569" }}>
          <span>{obligFiltradas.length} registro{obligFiltradas.length !== 1 ? "s" : ""}</span>
          <span style={{ color: "#f87171", fontFamily: "'DM Mono',monospace" }}>
            Total visible: {fmtFull(obligFiltradas.filter(o => o.estado === "PENDIENTE").reduce((a, o) => a + parseFloat(o.monto), 0))} pendiente
          </span>
        </div>
      )}

      {/* Modales */}
      {showModal && (
        <ObligModal
          oblig={editOblig}
          cuentas={cuentas}
          onSave={editOblig
            ? (data) => updateObligacion(editOblig.id, data)
            : addObligacion
          }
          onClose={() => { setShowModal(false); setEditOblig(null); }}
        />
      )}
      {pagarOblig && (
        <PagarModal
          oblig={pagarOblig}
          onConfirm={handlePagar}
          onClose={() => setPagarOblig(null)}
        />
      )}
    </div>
  );
}
