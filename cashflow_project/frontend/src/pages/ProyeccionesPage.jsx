import { useState, useMemo } from "react";
import { Card, PageHeader, PrimaryBtn, Badge, Modal } from "../components/UI.jsx";
import { CATEGORIAS, fmt, fmtFull, iStyle, lStyle } from "../lib/utils.js";

const blank = (cuentas) => ({
  fecha: new Date().toISOString().slice(0, 10),
  concepto: "", tipo: "Ingreso",
  categoria: CATEGORIAS[0], monto: "",
  cuenta: cuentas[0]?.nombre || "", notas: ""
});

// ── Modal para crear/editar proyección ───────────────────────────────────────
function ProjModal({ proj, cuentas, onSave, onClose }) {
  const [form, setForm] = useState(proj
    ? { ...proj, monto: Math.abs(parseFloat(proj.monto)).toString() }
    : blank(cuentas)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.fecha || !form.concepto || !form.monto) { setErr("Completá todos los campos"); return; }
    setSaving(true); setErr("");
    try {
      const monto = form.tipo === "Egreso"
        ? -Math.abs(parseFloat(form.monto))
        : Math.abs(parseFloat(form.monto));
      await onSave({ ...form, monto });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={proj ? "Editar Proyección" : "Nueva Proyección"} onClose={onClose}>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Fecha estimada</label><input type="date" value={form.fecha} onChange={set("fecha")} style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Concepto</label><input type="text" value={form.concepto} onChange={set("concepto")} placeholder="Ej: Cobro cliente, Pago proveedor..." style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Monto ($)</label><input type="number" value={form.monto} onChange={set("monto")} placeholder="0" style={iStyle}/></div>
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
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Categoría</label><select value={form.categoria} onChange={set("categoria")} style={iStyle}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Cuenta (opcional)</label><select value={form.cuenta} onChange={set("cuenta")} style={iStyle}><option value="">Sin especificar</option>{cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Notas (opcional)</label><input type="text" value={form.notas} onChange={set("notas")} placeholder="Cualquier detalle adicional..." style={iStyle}/></div>
      {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{err}</div>}
      <PrimaryBtn onClick={handleSave} style={{ width: "100%", padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Guardando..." : proj ? "Guardar Cambios" : "Agregar Proyección"}
      </PrimaryBtn>
    </Modal>
  );
}

// ── Modal para confirmar y pasar a movimiento real ───────────────────────────
function ConfirmarModal({ proj, cuentas, onConfirm, onClose }) {
  const montoOriginal = Math.abs(parseFloat(proj.monto));
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10), // fecha real de hoy por defecto
    concepto: proj.concepto,
    tipo: proj.tipo,
    categoria: proj.categoria,
    monto: montoOriginal.toString(),
    cuenta: proj.cuenta || (cuentas[0]?.nombre || ""),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const montoActual = parseFloat(form.monto) || 0;
  const diff = montoActual - montoOriginal;
  const hasDiff = Math.abs(diff) > 0;

  const handleConfirm = async () => {
    if (!form.fecha || !form.concepto || !form.monto) { setErr("Completá todos los campos"); return; }
    setSaving(true); setErr("");
    try {
      const monto = form.tipo === "Egreso"
        ? -Math.abs(parseFloat(form.monto))
        : Math.abs(parseFloat(form.monto));
      await onConfirm({ ...form, monto });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Confirmar movimiento real" onClose={onClose} width={460}>
      {/* Aviso explicativo */}
      <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 600, marginBottom: 4 }}>¿El movimiento ya ocurrió?</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          Ajustá el monto si hubo variación y confirmá. Se agregará a Movimientos reales y se eliminará de Proyecciones.
        </div>
      </div>

      {/* Monto original vs actual */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "#111827", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Monto proyectado</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{fmt(proj.monto)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", color: "#334155", fontSize: 18 }}>→</div>
        <div style={{ flex: 1, background: "#111827", borderRadius: 8, padding: "12px 14px", border: hasDiff ? "1px solid rgba(250,204,21,0.3)" : "1px solid transparent" }}>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Monto real</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: hasDiff ? "#facc15" : "#4ade80", fontFamily: "'DM Mono',monospace" }}>
            {form.monto ? fmt(form.tipo === "Egreso" ? -montoActual : montoActual) : "—"}
          </div>
          {hasDiff && (
            <div style={{ fontSize: 11, color: diff > 0 ? "#4ade80" : "#f87171", marginTop: 4 }}>
              {diff > 0 ? "+" : ""}{fmt(form.tipo === "Egreso" ? -diff : diff)} vs proyectado
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}><label style={lStyle}>Fecha real del movimiento</label><input type="date" value={form.fecha} onChange={set("fecha")} style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Concepto</label><input type="text" value={form.concepto} onChange={set("concepto")} style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Monto real ($)</label>
        <div style={{ position: "relative" }}>
          <input type="number" value={form.monto} onChange={set("monto")} style={{ ...iStyle, borderColor: hasDiff ? "rgba(250,204,21,0.4)" : "#1e293b" }}/>
          {hasDiff && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#facc15" }}>modificado</div>}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Categoría</label><select value={form.categoria} onChange={set("categoria")} style={iStyle}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div style={{ marginBottom: 20 }}><label style={lStyle}>Cuenta</label><select value={form.cuenta} onChange={set("cuenta")} style={iStyle}><option value="">Sin especificar</option>{cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>

      {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: "#111827", border: "1px solid #1e293b", color: "#94a3b8", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
        <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Confirmando..." : "✓ Confirmar y pasar a Movimientos"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal eliminar proyección ─────────────────────────────────────────────────
function DeleteProjModal({ proj, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); } catch { setLoading(false); }
  };
  return (
    <Modal title="¿Eliminar proyección?" onClose={onClose} width={380} danger>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Esta acción no se puede deshacer.</p>
      <div style={{ background: "#111827", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{proj.concepto}</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{proj.fecha?.slice(0, 10)} · {proj.categoria}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: parseFloat(proj.monto) > 0 ? "#4ade80" : "#f87171", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
          {parseFloat(proj.monto) > 0 ? "+" : ""}{fmt(proj.monto)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: "#111827", border: "1px solid #1e293b", color: "#94a3b8", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
        <button onClick={handle} disabled={loading} style={{ flex: 1, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProyeccionesPage({ data }) {
  const { proyecciones, transactions, cuentas, addTransaction, addProyeccion, updateProyeccion, deleteProyeccion } = data;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [justConfirmed, setJustConfirmed] = useState(null); // id para animación feedback

  const today = new Date().toISOString().slice(0, 10);

  const saldoActual = useMemo(() => transactions.reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);
  const saldoProyectado = saldoActual + proyecciones.reduce((a, p) => a + parseFloat(p.monto), 0);
  const totalProyIng = proyecciones.filter(p => parseFloat(p.monto) > 0).reduce((a, p) => a + parseFloat(p.monto), 0);
  const totalProyEgr = proyecciones.filter(p => parseFloat(p.monto) < 0).reduce((a, p) => a + Math.abs(parseFloat(p.monto)), 0);

  const filtered = useMemo(() =>
    proyecciones
      .filter(p => filterTipo === "Todos" || p.tipo === filterTipo)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
    [proyecciones, filterTipo]
  );

  const proximos7 = proyecciones.filter(p => {
    const diff = (new Date(p.fecha) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= -1 && diff <= 7; // incluye hoy y vencidos recientes
  });

  // Confirmar: crea movimiento real + elimina proyección
  const handleConfirmar = async (proj, txData) => {
    await addTransaction(txData);
    await deleteProyeccion(proj.id);
    setJustConfirmed(proj.id);
    setTimeout(() => setJustConfirmed(null), 2000);
  };

  const fBtn = (val, active, fn) => (
    <button onClick={fn} style={{ padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, background: active ? "#1e293b" : "transparent", border: active ? "1px solid #334155" : "1px solid #1a2236", color: active ? "#f8fafc" : "#64748b", transition: "all 0.12s" }}>{val}</button>
  );

  return (
    <div>
      <PageHeader pre="Futuro" title="Proyecciones" action={<PrimaryBtn onClick={() => setShowAdd(true)}>+ Nueva Proyección</PrimaryBtn>} />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Saldo Actual", value: fmt(saldoActual), color: saldoActual >= 0 ? "#4ade80" : "#f87171", sub: "Hoy" },
          { label: "Saldo Proyectado", value: fmt(saldoProyectado), color: saldoProyectado >= 0 ? "#4ade80" : "#f87171", sub: "Con todos los futuros" },
          { label: "Ingresos Futuros", value: fmt(totalProyIng), color: "#4ade80", sub: `${proyecciones.filter(p => parseFloat(p.monto) > 0).length} proyectados` },
          { label: "Egresos Futuros", value: fmt(totalProyEgr), color: "#f87171", sub: `${proyecciones.filter(p => parseFloat(p.monto) < 0).length} proyectados` },
        ].map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#334155" }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Alerta próximos 7 días */}
      {proximos7.length > 0 && (
        <div style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#facc15", fontWeight: 600, marginBottom: 10 }}>
            ⚠ Próximos 7 días — {proximos7.length} movimiento{proximos7.length !== 1 ? "s" : ""} para confirmar
          </div>
          {proximos7.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
              <div>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{p.concepto}</span>
                <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>{p.fecha?.slice(0, 10)}</span>
                {p.fecha?.slice(0, 10) <= today && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(248,113,113,0.15)", color: "#f87171", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>HOY / VENCIDO</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: parseFloat(p.monto) > 0 ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace" }}>
                  {parseFloat(p.monto) > 0 ? "+" : ""}{fmt(p.monto)}
                </span>
                <button onClick={() => setConfirming(p)} style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  ✓ Confirmar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Todos los movimientos proyectados
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Todos", "Ingreso", "Egreso"].map(f => fBtn(f, filterTipo === f, () => setFilterTipo(f)))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#334155", fontSize: 13 }}>
            No hay proyecciones. Agregá ingresos o egresos futuros para proyectar tu cashflow.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2236" }}>
                {["Fecha", "Concepto", "Categoría", "Tipo", "Monto", "Notas", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: h === "Monto" ? "right" : "left", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const isPast = p.fecha?.slice(0, 10) < today;
                const isToday = p.fecha?.slice(0, 10) === today;
                return (
                  <tr key={p.id}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid #0d1520" : "none", transition: "background 0.1s", opacity: isPast && !isToday ? 0.55 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#111827"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#94a3b8", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>
                      {p.fecha?.slice(0, 10)}
                      {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(250,204,21,0.15)", color: "#facc15", padding: "2px 5px", borderRadius: 3, fontWeight: 700 }}>HOY</span>}
                      {isPast && !isToday && <span style={{ marginLeft: 6, fontSize: 10, color: "#475569" }}>vencido</span>}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{p.concepto}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 4, background: "#111827", fontSize: 11, color: "#94a3b8", border: "1px solid #1e293b" }}>{p.categoria}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}><Badge type={p.tipo}>{p.tipo}</Badge></td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono',monospace", color: parseFloat(p.monto) > 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                      {parseFloat(p.monto) > 0 ? "+" : ""}{fmtFull(p.monto)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#475569", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.notas || "—"}</td>
                    <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {/* Confirmar — destacado si es hoy o pasado */}
                        <button onClick={() => setConfirming(p)} style={{
                          background: (isPast || isToday) ? "rgba(74,222,128,0.12)" : "#111827",
                          border: `1px solid ${(isPast || isToday) ? "rgba(74,222,128,0.35)" : "#1e293b"}`,
                          color: (isPast || isToday) ? "#4ade80" : "#475569",
                          cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, transition: "all 0.15s"
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,222,128,0.2)"; e.currentTarget.style.color = "#4ade80"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.4)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = (isPast || isToday) ? "rgba(74,222,128,0.12)" : "#111827"; e.currentTarget.style.color = (isPast || isToday) ? "#4ade80" : "#475569"; e.currentTarget.style.borderColor = (isPast || isToday) ? "rgba(74,222,128,0.35)" : "#1e293b"; }}>
                          ✓ Confirmar
                        </button>
                        <button onClick={() => setEditing(p)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#334155"; e.currentTarget.style.color = "#f8fafc"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}>Editar</button>
                        <button onClick={() => setDeleting(p)} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modales */}
      {(showAdd || editing) && (
        <ProjModal
          proj={editing}
          cuentas={cuentas}
          onSave={editing ? (d) => updateProyeccion(editing.id, d) : addProyeccion}
          onClose={() => { setShowAdd(false); setEditing(null); }}
        />
      )}
      {deleting && (
        <DeleteProjModal
          proj={deleting}
          onConfirm={() => deleteProyeccion(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
      {confirming && (
        <ConfirmarModal
          proj={confirming}
          cuentas={cuentas}
          onConfirm={(txData) => handleConfirmar(confirming, txData)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
