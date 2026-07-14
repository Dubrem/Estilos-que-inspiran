export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items, payer, orderNum, backUrl } = req.body;

  if (!items || !orderNum) {
    return res.status(400).json({ error: 'Faltan datos del pedido' });
  }

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderNum,
      },
      body: JSON.stringify({
        items: items.map(item => ({
          id: String(item.id),
          title: item.title,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          currency_id: 'MXN',
        })),
        payer: {
          name: payer?.name || '',
          email: payer?.email || 'cliente@dubrem.com',
        },
        back_urls: {
          success: `${backUrl}?pago=exitoso&orden=${encodeURIComponent(orderNum)}`,
          failure: `${backUrl}?pago=fallido&orden=${encodeURIComponent(orderNum)}`,
          pending: `${backUrl}?pago=pendiente&orden=${encodeURIComponent(orderNum)}`,
        },
        auto_return: 'approved',
        external_reference: orderNum,
        statement_descriptor: 'DUBREM',
        notification_url: 'https://dubrem-tula.vercel.app/api/webhook',
      }),
    });

    const data = await response.json();

    if (data.init_point) {
      return res.status(200).json({ init_point: data.init_point });
    }

    console.error('MP Error:', JSON.stringify(data));
    return res.status(500).json({ error: data.message || 'Error al crear preferencia' });
  } catch (err) {
    console.error('Server Error:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
