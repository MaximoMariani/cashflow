const BASE = "";

async function req(method, path, body) {
  const url = `${BASE}/api${path}`;
  let res;
  try {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    res = await fetch(url, opts);
  } catch (networkErr) {
    throw new Error(`No se puede conectar con el servidor. Verificá tu conexión.`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || "Error desconocido");
  }
  return res.json();
}

export const api = {
  // Transactions
  getTransactions: () => req("GET", "/transactions"),
  createTransaction: (data) => req("POST", "/transactions", data),
  updateTransaction: (id, data) => req("PUT", `/transactions/${id}`, data),
  deleteTransaction: (id) => req("DELETE", `/transactions/${id}`),
  // Cuentas
  getCuentas: () => req("GET", "/cuentas"),
  createCuenta: (nombre) => req("POST", "/cuentas", { nombre }),
  deleteCuenta: (id) => req("DELETE", `/cuentas/${id}`),
  // Dashboard
  getDashboard: () => req("GET", "/dashboard"),
  updateConfig: (data) => req("PUT", "/dashboard/config", data),
  // Estimado
  createEstimado: (data) => req("POST", "/dashboard/estimado", data),
  updateEstimado: (id, data) => req("PUT", `/dashboard/estimado/${id}`, data),
  deleteEstimado: (id) => req("DELETE", `/dashboard/estimado/${id}`),
  // Fondos
  createFondo: (data) => req("POST", "/dashboard/fondos", data),
  updateFondo: (id, data) => req("PUT", `/dashboard/fondos/${id}`, data),
  deleteFondo: (id) => req("DELETE", `/dashboard/fondos/${id}`),
  // Proyecciones
  getProyecciones: () => req("GET", "/proyecciones"),
  createProyeccion: (data) => req("POST", "/proyecciones", data),
  updateProyeccion: (id, data) => req("PUT", `/proyecciones/${id}`, data),
  deleteProyeccion: (id) => req("DELETE", `/proyecciones/${id}`),
};
