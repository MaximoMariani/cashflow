import { useState, useMemo } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Card, PageHeader, PrimaryBtn, Badge, Modal } from "../components/UI.jsx";
import { CATEGORIAS, fmt, fmtFull, iStyle, lStyle } from "../lib/utils.js";

// Badges visuales para escenario
const ESC_STYLES = {
  CONFIRMADO: { bg: "var(--cf-accent-tint)", color: "var(--cf-accent)", border: "var(--cf-accent-glow)", label: "Confirmado" },
  PROBABLE:   { bg: "var(--cf-warning-tint)", color: "var(--cf-warning)", border: "var(--cf-warning-glow)", label: "Probable"   },
};

function EscenarioBadge({ escenario }) {
  const s = ESC_STYLES[escenario] || ESC_STYLES.PROBABLE;
  return (
    <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

const blank = (cuentas) => ({
  fecha: new Date().toISOString().slice(0, 10),
  concepto: "", tipo: "Ingreso", escenario: "PROBABLE",
  categoria: CATEGORIAS[0], monto: "",
  cuenta: cuentas[0]?.nombre || "", notas: ""
});

// ── Modal crear/editar ────────────────────────────────────────────────────────
function ProjModal({ proj, cuentas, onSave, onClose }) {
  const [form, setForm] = useState(proj
    ? { ...proj, monto: Math.abs(parseFloat(proj.monto)).toString(), escenario: proj.escenario || "PROBABLE" }
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
    <Modal title={proj ? "Editar Escenario" : "Nuevo Escenario"} onClose={onClose}>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Fecha estimada</label><input type="date" value={form.fecha} onChange={set("fecha")} style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Concepto</label><input type="text" value={form.concepto} onChange={set("concepto")} placeholder="Ej: Cobro cliente, Pago proveedor..." style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Monto ($)</label><input type="number" value={form.monto} onChange={set("monto")} placeholder="0" style={iStyle}/></div>

      {/* Tipo: Ingreso / Egreso */}
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Tipo</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["Ingreso", "Egreso"].map(t => (
            <button key={t} onClick={() => setForm(p => ({ ...p, tipo: t }))} style={{
              flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: "1px solid",
              background: form.tipo === t ? (t === "Ingreso" ? "var(--cf-positive-tint)" : "var(--cf-negative-tint)") : "transparent",
              borderColor: form.tipo === t ? (t === "Ingreso" ? "var(--cf-positive-glow)" : "var(--cf-negative-glow)") : "var(--cf-border-mid)",
              color: form.tipo === t ? (t === "Ingreso" ? "var(--cf-positive)" : "var(--cf-negative)") : "var(--cf-text-faint)",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Escenario: PROBABLE / CONFIRMADO */}
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Escenario</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: "PROBABLE",   label: "Probable",   activeColor: "var(--cf-warning)", activeBg: "var(--cf-warning-tint)", activeBorder: "var(--cf-warning-glow)" },
            { val: "CONFIRMADO", label: "Confirmado", activeColor: "var(--cf-accent)", activeBg: "var(--cf-accent-tint)",  activeBorder: "var(--cf-accent-glow)" },
          ].map(({ val, label, activeColor, activeBg, activeBorder }) => (
            <button key={val} onClick={() => setForm(p => ({ ...p, escenario: val }))} style={{
              flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: "1px solid",
              background: form.escenario === val ? activeBg : "transparent",
              borderColor: form.escenario === val ? activeBorder : "var(--cf-border-mid)",
              color: form.escenario === val ? activeColor : "var(--cf-text-faint)",
            }}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--cf-text-dim)", marginTop: 6, lineHeight: 1.4 }}>
          {form.escenario === "CONFIRMADO"
            ? "Impacta en el saldo futuro confirmado (deudas o cobros seguros)."
            : "Solo impacta en el escenario probable (puede o no ocurrir)."}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}><label style={lStyle}>Categoría</label><select value={form.categoria} onChange={set("categoria")} style={iStyle}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Cuenta (opcional)</label><select value={form.cuenta} onChange={set("cuenta")} style={iStyle}><option value="">Sin especificar</option>{cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Notas (opcional)</label><input type="text" value={form.notas} onChange={set("notas")} placeholder="Cualquier detalle adicional..." style={iStyle}/></div>
      {err && <div style={{ color: "var(--cf-negative)", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "var(--cf-negative-tint)", borderRadius: 6 }}>{err}</div>}
      <PrimaryBtn onClick={handleSave} style={{ width: "100%", padding: "12px", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Guardando..." : proj ? "Guardar Cambios" : "Agregar Escenario"}
      </PrimaryBtn>
    </Modal>
  );
}

// ── Modal confirmar → movimiento real ────────────────────────────────────────
function ConfirmarModal({ proj, cuentas, onConfirm, onClose }) {
  const montoOriginal = Math.abs(parseFloat(proj.monto));
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
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
      const monto = form.tipo === "Egreso" ? -Math.abs(parseFloat(form.monto)) : Math.abs(parseFloat(form.monto));
      await onConfirm({ ...form, monto });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Confirmar movimiento real" onClose={onClose} width={460}>
      <div style={{ background: "var(--cf-positive-tint)", border: "1px solid var(--cf-positive-glow)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "var(--cf-positive)", fontWeight: 600, marginBottom: 4 }}>¿El movimiento ya ocurrió?</div>
        <div style={{ fontSize: 12, color: "var(--cf-text-faint)", lineHeight: 1.5 }}>
          Ajustá el monto si hubo variación y confirmá. Se agregará a Movimientos reales y se eliminará de Escenarios.
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "var(--cf-card-raised)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Monto estimado</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cf-text-faint)", fontFamily: "'DM Mono',monospace" }}>{fmt(proj.monto)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", color: "var(--cf-border-hi)", fontSize: 18 }}>→</div>
        <div style={{ flex: 1, background: "var(--cf-card-raised)", borderRadius: 8, padding: "12px 14px", border: hasDiff ? "1px solid var(--cf-warning-glow)" : "1px solid transparent" }}>
          <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Monto real</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: hasDiff ? "var(--cf-warning)" : "var(--cf-positive)", fontFamily: "'DM Mono',monospace" }}>
            {form.monto ? fmt(form.tipo === "Egreso" ? -montoActual : montoActual) : "—"}
          </div>
          {hasDiff && (
            <div style={{ fontSize: 11, color: diff > 0 ? "var(--cf-positive)" : "var(--cf-negative)", marginTop: 4 }}>
              {diff > 0 ? "+" : ""}{fmt(form.tipo === "Egreso" ? -diff : diff)} vs estimado
            </div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Fecha real</label><input type="date" value={form.fecha} onChange={set("fecha")} style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Concepto</label><input type="text" value={form.concepto} onChange={set("concepto")} style={iStyle}/></div>
      <div style={{ marginBottom: 16 }}>
        <label style={lStyle}>Monto real ($)</label>
        <div style={{ position: "relative" }}>
          <input type="number" value={form.monto} onChange={set("monto")} style={{ ...iStyle, borderColor: hasDiff ? "var(--cf-warning-glow)" : "var(--cf-border-mid)" }}/>
          {hasDiff && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cf-warning)" }}>modificado</div>}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lStyle}>Categoría</label><select value={form.categoria} onChange={set("categoria")} style={iStyle}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div style={{ marginBottom: 20 }}><label style={lStyle}>Cuenta</label><select value={form.cuenta} onChange={set("cuenta")} style={iStyle}><option value="">Sin especificar</option>{cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
      {err && <div style={{ color: "var(--cf-negative)", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "var(--cf-negative-tint)", borderRadius: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: "var(--cf-card-raised)", border: "1px solid #1e293b", color: "var(--cf-text-muted)", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
        <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, background: "var(--cf-positive-tint)", border: "1px solid var(--cf-positive-glow)", color: "var(--cf-positive)", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Confirmando..." : "✓ Confirmar y pasar a Movimientos"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal eliminar ────────────────────────────────────────────────────────────
function DeleteProjModal({ proj, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); } catch { setLoading(false); }
  };
  return (
    <Modal title="¿Eliminar escenario?" onClose={onClose} width={380} danger>
      <p style={{ fontSize: 13, color: "var(--cf-text-faint)", marginBottom: 16 }}>Esta acción no se puede deshacer.</p>
      <div style={{ background: "var(--cf-card-raised)", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cf-text-sub)", marginBottom: 4 }}>{proj.concepto}</div>
        <div style={{ fontSize: 12, color: "var(--cf-text-dim)" }}>{proj.fecha?.slice(0, 10)} · {proj.categoria}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: parseFloat(proj.monto) > 0 ? "var(--cf-positive)" : "var(--cf-negative)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
          {parseFloat(proj.monto) > 0 ? "+" : ""}{fmt(proj.monto)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: "var(--cf-card-raised)", border: "1px solid #1e293b", color: "var(--cf-text-muted)", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
        <button onClick={handle} disabled={loading} style={{ flex: 1, background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", color: "var(--cf-negative)", padding: "11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function EscenariosPage({ data }) {
  const { proyecciones, transactions, cuentas, addTransaction, addProyeccion, updateProyeccion, deleteProyeccion } = data;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [filterEsc, setFilterEsc] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");

  const today = new Date().toISOString().slice(0, 10);

  // ── Cálculos de escenarios ──────────────────────────────────────────────────
  const saldoActual = useMemo(() =>
    transactions.reduce((a, t) => a + parseFloat(t.monto), 0), [transactions]);

  const futuras = useMemo(() =>
    proyecciones.filter(p => p.fecha?.slice(0, 10) >= today), [proyecciones, today]);

  // Saldo futuro CONFIRMADO = saldo actual + futuros confirmados
  const saldoConfirmado = useMemo(() => {
    const sumConf = futuras
      .filter(p => p.escenario === "CONFIRMADO")
      .reduce((a, p) => a + parseFloat(p.monto), 0);
    return saldoActual + sumConf;
  }, [saldoActual, futuras]);

  // Saldo futuro PROBABLE = saldo confirmado + futuros probables
  const saldoProbable = useMemo(() => {
    const sumProb = futuras
      .filter(p => p.escenario === "PROBABLE")
      .reduce((a, p) => a + parseFloat(p.monto), 0);
    return saldoConfirmado + sumProb;
  }, [saldoConfirmado, futuras]);

  const diferencia = saldoProbable - saldoConfirmado;

  const totalIng = proyecciones.filter(p => parseFloat(p.monto) > 0).reduce((a, p) => a + parseFloat(p.monto), 0);
  const totalEgr = proyecciones.filter(p => parseFloat(p.monto) < 0).reduce((a, p) => a + Math.abs(parseFloat(p.monto)), 0);

  const filtered = useMemo(() =>
    proyecciones
      .filter(p => filterEsc === "Todos" || p.escenario === filterEsc)
      .filter(p => filterTipo === "Todos" || p.tipo === filterTipo)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
    [proyecciones, filterEsc, filterTipo]
  );

  const proximos7 = proyecciones.filter(p => {
    const diff = (new Date(p.fecha) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= -1 && diff <= 7;
  });

  const handleConfirmar = async (proj, txData) => {
    await addTransaction(txData);
    await deleteProyeccion(proj.id);
  };

  const fBtn = (val, active, fn) => (
    <button onClick={fn} style={{ padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500,
      background: active ? "var(--cf-border-mid)" : "transparent",
      border: active ? "1px solid #334155" : "1px solid #1a2236",
      color: active ? "var(--cf-text)" : "var(--cf-text-faint)", transition: "all 0.12s" }}>{val}</button>
  );

  return (
    <div>
      <PageHeader pre="Futuro" title="Escenarios" action={<PrimaryBtn onClick={() => setShowAdd(true)}>+ Nuevo Escenario</PrimaryBtn>} />

      {/* KPIs de escenarios — la parte central del feature */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Saldo Actual",           value: fmt(saldoActual),    color: saldoActual >= 0    ? "var(--cf-positive)" : "var(--cf-negative)", sub: "Hoy" },
          { label: "Futuro Confirmado",       value: fmt(saldoConfirmado),color: saldoConfirmado >= 0 ? "var(--cf-accent)" : "var(--cf-negative)", sub: "Solo movimientos seguros" },
          { label: "Futuro c/ Probables",     value: fmt(saldoProbable),  color: saldoProbable >= 0  ? "var(--cf-positive)" : "var(--cf-negative)", sub: "Confirmado + probable" },
          {
            label: "Diferencia",
            value: (diferencia >= 0 ? "+" : "") + fmt(diferencia),
            color: diferencia >= 0 ? "var(--cf-positive)" : "var(--cf-negative)",
            sub: "Probable vs Confirmado"
          },
        ].map((k, i) => (
          <Card key={i}>
            <div style={{ fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "var(--cf-border-hi)" }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Panel explicativo de escenarios */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--cf-accent-tint)", border: "1px solid var(--cf-accent-glow)", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--cf-accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>◆ Confirmado</div>
          <div style={{ fontSize: 12, color: "var(--cf-text-faint)", lineHeight: 1.5 }}>
            Cobros asegurados y obligaciones contraídas. Impactan directamente en el saldo futuro real.
          </div>
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--cf-accent)", fontFamily: "'DM Mono',monospace" }}>
            {proyecciones.filter(p => p.escenario === "CONFIRMADO").length} movimientos
          </div>
        </div>
        <div style={{ background: "var(--cf-warning-tint)", border: "1px solid var(--cf-warning-glow)", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--cf-warning)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>◇ Probable</div>
          <div style={{ fontSize: 12, color: "var(--cf-text-faint)", lineHeight: 1.5 }}>
            Ingresos o egresos que pueden ocurrir. Sirven para simular riesgo y planificar escenarios alternativos.
          </div>
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--cf-warning)", fontFamily: "'DM Mono',monospace" }}>
            {proyecciones.filter(p => !p.escenario || p.escenario === "PROBABLE").length} movimientos
          </div>
        </div>
      </div>

      {/* Alerta próximos 7 días */}
      {proximos7.length > 0 && (
        <div style={{ background: "var(--cf-warning-tint)", border: "1px solid var(--cf-warning-glow)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--cf-warning)", fontWeight: 600, marginBottom: 10 }}>
            ⚠ Próximos 7 días — {proximos7.length} movimiento{proximos7.length !== 1 ? "s" : ""} para confirmar
          </div>
          {proximos7.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--cf-warning-tint)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "var(--cf-text-sub)", fontWeight: 500 }}>{p.concepto}</span>
                <span style={{ fontSize: 11, color: "var(--cf-text-faint)" }}>{p.fecha?.slice(0, 10)}</span>
                <EscenarioBadge escenario={p.escenario || "PROBABLE"} />
                {p.fecha?.slice(0, 10) <= today && <span style={{ fontSize: 10, background: "var(--cf-negative-tint)", color: "var(--cf-negative)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>HOY / VENCIDO</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: parseFloat(p.monto) > 0 ? "var(--cf-positive)" : "var(--cf-negative)", fontFamily: "'DM Mono',monospace" }}>
                  {parseFloat(p.monto) > 0 ? "+" : ""}{fmt(p.monto)}
                </span>
                <button onClick={() => setConfirming(p)} style={{ background: "var(--cf-positive-tint)", border: "1px solid var(--cf-positive-glow)", color: "var(--cf-positive)", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>
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
          <div style={{ fontSize: 12, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {filtered.length} de {proyecciones.length} movimientos
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Todos", "CONFIRMADO", "PROBABLE"].map(f => fBtn(
              f === "CONFIRMADO" ? "Confirmados" : f === "PROBABLE" ? "Probables" : "Todos",
              filterEsc === f,
              () => setFilterEsc(f)
            ))}
            <div style={{ width: 1, background: "var(--cf-border-mid)", margin: "0 4px" }} />
            {["Todos", "Ingreso", "Egreso"].map(f => fBtn(f, filterTipo === f, () => setFilterTipo(f)))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--cf-border-hi)", fontSize: 13 }}>
            No hay escenarios con este filtro.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2236" }}>
                {["Fecha", "Concepto", "Escenario", "Tipo", "Monto", "Notas", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: h === "Monto" ? "right" : "left", fontSize: 10, color: "var(--cf-text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
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
                    onMouseEnter={e => e.currentTarget.style.background = "var(--cf-card-raised)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--cf-text-muted)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>
                      {p.fecha?.slice(0, 10)}
                      {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: "var(--cf-warning-tint)", color: "var(--cf-warning)", padding: "2px 5px", borderRadius: 3, fontWeight: 700 }}>HOY</span>}
                      {isPast && !isToday && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--cf-text-dim)" }}>vencido</span>}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--cf-text-sub)", fontWeight: 500 }}>{p.concepto}</td>
                    <td style={{ padding: "11px 14px" }}><EscenarioBadge escenario={p.escenario || "PROBABLE"} /></td>
                    <td style={{ padding: "11px 14px" }}><Badge type={p.tipo}>{p.tipo}</Badge></td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono',monospace", color: parseFloat(p.monto) > 0 ? "var(--cf-positive)" : "var(--cf-negative)", whiteSpace: "nowrap" }}>
                      {parseFloat(p.monto) > 0 ? "+" : ""}{fmtFull(p.monto)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "var(--cf-text-dim)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.notas || "—"}</td>
                    <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => setConfirming(p)} style={{
                          background: (isPast || isToday) ? "var(--cf-positive-tint)" : "var(--cf-card-raised)",
                          border: `1px solid ${(isPast || isToday) ? "var(--cf-positive-glow)" : "var(--cf-border-mid)"}`,
                          color: (isPast || isToday) ? "var(--cf-positive)" : "var(--cf-text-dim)",
                          cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--cf-positive-glow)"; e.currentTarget.style.color = "var(--cf-positive)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = (isPast || isToday) ? "var(--cf-positive-tint)" : "var(--cf-card-raised)"; e.currentTarget.style.color = (isPast || isToday) ? "var(--cf-positive)" : "var(--cf-text-dim)"; }}>
                          ✓ Confirmar
                        </button>
                        <button onClick={() => setEditing(p)} style={{ background: "var(--cf-border-mid)", border: "1px solid #334155", color: "var(--cf-text-muted)", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--cf-border-hi)"; e.currentTarget.style.color = "var(--cf-text)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "var(--cf-border-mid)"; e.currentTarget.style.color = "var(--cf-text-muted)"; }}>Editar</button>
                        <button onClick={() => setDeleting(p)} style={{ background: "var(--cf-negative-tint)", border: "1px solid var(--cf-negative-glow)", color: "var(--cf-negative)", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--cf-negative-glow)"}
                          onMouseLeave={e => e.currentTarget.style.background = "var(--cf-negative-tint)"}>Eliminar</button>
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
