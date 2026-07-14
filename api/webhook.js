export default async function handler(req, res) {
  // Responder 200 inmediatamente para que MP no reintente
  res.status(200).end();

  if (req.method !== 'POST') return;

  const { type, data } = req.body || {};
  if (type !== 'payment' || !data?.id) return;

  try {
    // Verificar el pago directamente con MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    const payment = await mpRes.json();

    if (payment.status !== 'approved') return;

    const orderNum = payment.external_reference;
    if (!orderNum) return;

    const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
    if (!FIREBASE_DB_URL) return;

    // Buscar el pedido en Firebase por número
    const ordersRes = await fetch(`${FIREBASE_DB_URL}/orders.json`);
    const orders = await ordersRes.json();
    if (!orders) return;

    // Encontrar la key del pedido
    const entry = Object.entries(orders).find(([, o]) => o.num === orderNum);
    if (!entry) return;

    const [key] = entry;

    // Actualizar status a 'pagado' y guardar info del pago
    await fetch(`${FIREBASE_DB_URL}/orders/${key}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'pagado',
        paymentId: String(data.id),
        paymentMethod: payment.payment_type_id || 'mp',
        paidAt: new Date().toISOString(),
      })
    });
  } catch (err) {
    console.error('Webhook error:', err);
  }
}
