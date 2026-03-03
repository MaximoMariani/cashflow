const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const DEFAULTS = { umbral_verde: 1000000, umbral_amarillo: 200000 };

// GET /api/settings
// Devuelve siempre un objeto; si no existe la fila, retorna los defaults.
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM financial_settings WHERE id = 'default' LIMIT 1"
    );
    if (rows.length === 0) {
      return res.json(DEFAULTS);
    }
    const row = rows[0];
    res.json({
      umbral_verde:    parseFloat(row.umbral_verde),
      umbral_amarillo: parseFloat(row.umbral_amarillo),
      updated_at:      row.updated_at,
    });
  } catch (err) {
    // Si la tabla todavía no existe (primer deploy sin DB lista), devuelve defaults
    console.error("settings GET error:", err.message);
    res.json(DEFAULTS);
  }
});

// PUT /api/settings
// Body: { umbral_verde: number, umbral_amarillo: number }
router.put("/", async (req, res) => {
  const { umbral_verde, umbral_amarillo } = req.body;

  // Validaciones
  const verde    = parseFloat(umbral_verde);
  const amarillo = parseFloat(umbral_amarillo);

  if (isNaN(verde) || isNaN(amarillo)) {
    return res.status(400).json({ error: "Los umbrales deben ser valores numéricos." });
  }
  if (verde <= 0 || amarillo <= 0) {
    return res.status(400).json({ error: "Los umbrales deben ser mayores a 0." });
  }
  if (verde <= amarillo) {
    return res.status(400).json({ error: "El umbral Verde debe ser mayor que el umbral Amarillo." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO financial_settings (id, user_id, umbral_verde, umbral_amarillo, updated_at)
       VALUES ('default', 'default', $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE
         SET umbral_verde    = EXCLUDED.umbral_verde,
             umbral_amarillo = EXCLUDED.umbral_amarillo,
             updated_at      = NOW()
       RETURNING *`,
      [verde, amarillo]
    );
    const row = rows[0];
    res.json({
      umbral_verde:    parseFloat(row.umbral_verde),
      umbral_amarillo: parseFloat(row.umbral_amarillo),
      updated_at:      row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
