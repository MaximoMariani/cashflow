import { useState, useEffect, useCallback } from "react";

// Valores válidos de tema
// 'dark'   → siempre oscuro
// 'light'  → siempre claro
// 'system' → sigue la preferencia del OS
const VALID_THEMES = ["dark", "light", "system"];
const STORAGE_KEY  = "cashflow-theme";

// Resuelve el tema efectivo: 'dark' o 'light' (nunca 'system')
function resolveTheme(pref) {
  if (pref === "light") return "light";
  if (pref === "dark")  return "dark";
  // system
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Aplica o remueve la clase en <html>
function applyTheme(effective) {
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  html.classList.add(effective);
}

export function useTheme() {
  // Leer preferencia guardada; default = 'dark'
  const [preference, setPreference] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(stored) ? stored : "dark";
  });

  // Aplicar tema al montar y cuando cambia preferencia
  useEffect(() => {
    const effective = resolveTheme(preference);
    applyTheme(effective);
  }, [preference]);

  // Escuchar cambios del OS cuando el tema es 'system'
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setTheme = useCallback((newPref) => {
    if (!VALID_THEMES.includes(newPref)) return;
    localStorage.setItem(STORAGE_KEY, newPref);
    setPreference(newPref);
  }, []);

  const effective = resolveTheme(preference);

  return {
    theme: preference,      // 'dark' | 'light' | 'system'
    effective,              // 'dark' | 'light'  (resuelto)
    isDark: effective === "dark",
    isLight: effective === "light",
    setTheme,
  };
}
