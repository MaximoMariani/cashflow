const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const DEFAULTS = { umbral_verde: 1000000, umbral_amarillo: 200000 };

router.get("/", async (req, res) => {
  const settingsId = `settings_${req.userId}`;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM financial_settings WHERE id=$1 LIMIT 1",
      [settingsId]
    );
    if (rows.length === 0) return res.json(DEFAULTS);
    res.json({
      umbral_verde:    parseFloat(rows[0].umbral_verde),
      umbral_amarillo: parseFloat(rows[0].umbral_amarillo),
      updated_at:      rows[0].updated_at,
    });
  } catch (err) { console.error("settings GET error:", err.message); res.json(DEFAULTS); }
});

router.put("/", async (req, res) => {
  const { umbral_verde, umbral_amarillo } = req.body;
  const verde = parseFloat(umbral_verde), amarillo = parseFloat(umbral_amarillo);
  if (isNaN(verde) || isNaN(amarillo)) return res.status(400).json({ error: "Los umbrales deben ser numéricos." });
  if (verde <= 0 || amarillo <= 0) return res.status(400).json({ error: "Los umbrales deben ser mayores a 0." });
  if (verde <= amarillo) return res.status(400).json({ error: "El umbral Verde debe ser mayor que el Amarillo." });
  const settingsId = `settings_${req.userId}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO financial_settings (id, user_id, umbral_verde, umbral_amarillo, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (id) DO UPDATE
         SET umbral_verde=$3, umbral_amarillo=$4, updated_at=NOW()
       RETURNING *`,
      [settingsId, req.userId, verde, amarillo]
    );
    res.json({
      umbral_verde:    parseFloat(rows[0].umbral_verde),
      umbral_amarillo: parseFloat(rows[0].umbral_amarillo),
      updated_at:      rows[0].updated_at,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
