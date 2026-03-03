import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api.js";

const DEFAULT_SETTINGS = { umbral_verde: 1000000, umbral_amarillo: 200000 };

export function useData() {
  const [transactions, setTransactions]               = useState([]);
  const [proyecciones, setProyecciones]               = useState([]);
  const [obligaciones, setObligaciones]               = useState([]);
  const [obligacionesMetricas, setObligacionesMetricas] = useState({
    total_pendiente: 0, a_liquidar_7d: 0, count_pendiente: 0, count_pagada: 0
  });
  const [cuentas, setCuentas]         = useState([]);
  const [dashConfig, setDashConfig]   = useState({
    proveedores: 0, talleres: 0, sueldos_pendientes: 0,
    oblig_oficinas: 0, dinero_liquidar: 0, saldo_respaldo: 0
  });
  const [dineroEstimado, setDineroEstimado]     = useState([]);
  const [fondosInversion, setFondosInversion]   = useState([]);
  const [financialSettings, setFinancialSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, projs, obligs, obligMetr, ctas, dash, settings] = await Promise.all([
        api.getTransactions(),
        api.getProyecciones(),
        api.getObligaciones(),
        api.getObligacionesMetricas(),
        api.getCuentas(),
        api.getDashboard(),
        api.getSettings().catch(() => DEFAULT_SETTINGS), // fallback gracioso
      ]);
      setTransactions(txs);
      setProyecciones(projs);
      setObligaciones(obligs);
      setObligacionesMetricas(obligMetr);
      setCuentas(ctas);
      setDashConfig(dash.config || {});
      setDineroEstimado(dash.dineroEstimado || []);
      setFondosInversion(dash.fondosInversion || []);
      setFinancialSettings(settings || DEFAULT_SETTINGS);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction    = async (data) => { const tx = await api.createTransaction(data); setTransactions(prev => [tx, ...prev]); return tx; };
  const updateTransaction = async (id, data) => { const tx = await api.updateTransaction(id, data); setTransactions(prev => prev.map(t => t.id === id ? tx : t)); return tx; };
  const deleteTransaction = async (id)       => { await api.deleteTransaction(id); setTransactions(prev => prev.filter(t => t.id !== id)); };

  // ── Proyecciones ──────────────────────────────────────────────────────────
  const addProyeccion    = async (data) => { const p = await api.createProyeccion(data); setProyecciones(prev => [...prev, p].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))); return p; };
  const updateProyeccion = async (id, data) => { const p = await api.updateProyeccion(id, data); setProyecciones(prev => prev.map(x => x.id === id ? p : x)); return p; };
  const deleteProyeccion = async (id)       => { await api.deleteProyeccion(id); setProyecciones(prev => prev.filter(x => x.id !== id)); };

  // ── Obligaciones ──────────────────────────────────────────────────────────
  const refreshObligaciones = async () => {
    const [obligs, metricas] = await Promise.all([api.getObligaciones(), api.getObligacionesMetricas()]);
    setObligaciones(obligs);
    setObligacionesMetricas(metricas);
  };
  const addObligacion    = async (data)      => { const o = await api.createObligacion(data); await refreshObligaciones(); return o; };
  const updateObligacion = async (id, data)  => { const o = await api.updateObligacion(id, data); await refreshObligaciones(); return o; };
  const deleteObligacion = async (id)        => { await api.deleteObligacion(id); await refreshObligaciones(); };
  const pagarObligacion  = async (id, fecha_pago) => {
    const result = await api.pagarObligacion(id, fecha_pago);
    setTransactions(prev => [result.movimiento, ...prev]);
    await refreshObligaciones();
    return result;
  };

  // ── Cuentas ───────────────────────────────────────────────────────────────
  const addCuenta    = async (nombre) => { const c = await api.createCuenta(nombre); setCuentas(prev => [...prev, c]); return c; };
  const deleteCuenta = async (id)     => { await api.deleteCuenta(id); setCuentas(prev => prev.filter(c => c.id !== id)); };

  // ── Dashboard config ──────────────────────────────────────────────────────
  const saveConfig = async (data) => { const cfg = await api.updateConfig(data); setDashConfig(cfg); return cfg; };

  // ── Dinero estimado ───────────────────────────────────────────────────────
  const addEstimado    = async (data)      => { const item = await api.createEstimado(data); setDineroEstimado(prev => [...prev, item]); return item; };
  const updateEstimado = async (id, data)  => { const item = await api.updateEstimado(id, data); setDineroEstimado(prev => prev.map(x => x.id === id ? item : x)); return item; };
  const deleteEstimado = async (id)        => { await api.deleteEstimado(id); setDineroEstimado(prev => prev.filter(x => x.id !== id)); };

  // ── Fondos ────────────────────────────────────────────────────────────────
  const addFondo    = async (data)      => { const item = await api.createFondo(data); setFondosInversion(prev => [...prev, item]); return item; };
  const updateFondo = async (id, data)  => { const item = await api.updateFondo(id, data); setFondosInversion(prev => prev.map(x => x.id === id ? item : x)); return item; };
  const deleteFondo = async (id)        => { await api.deleteFondo(id); setFondosInversion(prev => prev.filter(x => x.id !== id)); };

  // ── Financial settings ────────────────────────────────────────────────────
  const saveFinancialSettings = async (data) => {
    const saved = await api.saveSettings(data);
    setFinancialSettings(saved);
    return saved;
  };

  return {
    transactions, proyecciones, obligaciones, obligacionesMetricas,
    cuentas, dashConfig, dineroEstimado, fondosInversion,
    financialSettings,
    loading, error, reload: load,
    addTransaction, updateTransaction, deleteTransaction,
    addProyeccion, updateProyeccion, deleteProyeccion,
    addObligacion, updateObligacion, deleteObligacion, pagarObligacion,
    addCuenta, deleteCuenta,
    saveConfig,
    addEstimado, updateEstimado, deleteEstimado,
    addFondo, updateFondo, deleteFondo,
    saveFinancialSettings,
  };
}
