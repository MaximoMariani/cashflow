const express = require("express");
const router  = express.Router();
const stripe  = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { pool } = require("../db");

const PRICE_ID    = process.env.STRIPE_PRICE_ID;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL   = process.env.FRONTEND_URL || "https://cashflow-production-b267.up.railway.app";

// ── GET /api/billing/status ───────────────────────────────────────────────────
// Devuelve el estado de suscripción del usuario actual
router.get("/status", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id=$1 LIMIT 1",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.json({ plan: "free", status: "trial", trialEndsAt: null, active: true });
    }
    const sub = rows[0];
    const now  = new Date();
    const trialEnd = new Date(sub.trial_ends_at);
    const isTrialActive  = sub.status === "trial" && now < trialEnd;
    const isProActive    = sub.status === "active";
    res.json({
      plan:        sub.status === "active" ? "pro" : "free",
      status:      sub.status,
      trialEndsAt: sub.trial_ends_at,
      active:      isTrialActive || isProActive,
      stripeSubscriptionId: sub.stripe_subscription_id,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/billing/checkout ────────────────────────────────────────────────
// Crea una sesión de Stripe Checkout y devuelve la URL
router.post("/checkout", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id=$1 LIMIT 1",
      [req.userId]
    );
    const email = req.headers["x-user-email"] || "";

    // Si ya tiene un customer_id de Stripe lo reutilizamos
    let customerId = rows[0]?.stripe_customer_id || null;
    if (!customerId && email) {
      const customer = await stripe.customers.create({ email, metadata: { user_id: req.userId } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer:   customerId || undefined,
      customer_email: !customerId ? email || undefined : undefined,
      mode:       "subscription",
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${FRONTEND_URL}?checkout=success`,
      cancel_url:  `${FRONTEND_URL}?checkout=cancelled`,
      metadata:    { user_id: req.userId },
    });

    res.json({ url: session.url });
  } catch (err) { console.error("[checkout]", err.message); res.status(500).json({ error: err.message }); }
});

// ── POST /api/billing/portal ──────────────────────────────────────────────────
// Crea una sesión del portal de Stripe (para cancelar/actualizar)
router.post("/portal", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id=$1 LIMIT 1",
      [req.userId]
    );
    if (!rows[0]?.stripe_customer_id)
      return res.status(400).json({ error: "No tenés una suscripción activa" });

    const session = await stripe.billingPortal.sessions.create({
      customer:   rows[0].stripe_customer_id,
      return_url: FRONTEND_URL,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
// Recibe eventos de Stripe — DEBE ir sin el middleware requireUser y con raw body
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] Signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session  = event.data.object;
      const userId   = session.metadata?.user_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      if (userId) {
        await pool.query(`
          INSERT INTO subscriptions (user_id, status, stripe_customer_id, stripe_subscription_id, updated_at)
          VALUES ($1, 'active', $2, $3, NOW())
          ON CONFLICT (user_id) DO UPDATE
            SET status='active', stripe_customer_id=$2, stripe_subscription_id=$3, updated_at=NOW()
        `, [userId, customerId, subscriptionId]);
        console.log(`[webhook] ✅ Activated subscription for user ${userId}`);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await pool.query(`
        UPDATE subscriptions SET status='cancelled', updated_at=NOW()
        WHERE stripe_subscription_id=$1
      `, [sub.id]);
      console.log(`[webhook] ❌ Cancelled subscription ${sub.id}`);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      await pool.query(`
        UPDATE subscriptions SET status='past_due', updated_at=NOW()
        WHERE stripe_subscription_id=$1
      `, [invoice.subscription]);
      console.log(`[webhook] ⚠️ Payment failed for subscription ${invoice.subscription}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[webhook] Processing error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
