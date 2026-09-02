export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Falta el mensaje' });

  const SYSTEM = `Eres el asistente virtual de DUBREM, una tienda de ropa en línea con el lema "Estilos que inspiran".

INFORMACIÓN DE LA TIENDA:
- Nombre: DUBREM
- Ubicación: Tula de Allende, Hidalgo, México
- WhatsApp: 5214421052174 (también disponible como +52 55 6372 3284)
- Horario: Lunes a viernes de 9:00 am a 5:00 pm. Sábados y domingos NO laboramos.

CATEGORÍAS DISPONIBLES:
- Mujer, Hombre, Niños, Juvenil, Maternidad

PAGOS:
- Aceptamos MercadoPago: tarjeta de crédito/débito, OXXO y transferencia bancaria
- Se requiere pago completo para procesar el pedido. No manejamos apartados ni pagos parciales.
- Si pagas por transferencia debes enviar tu comprobante al número de contacto.

ENVÍOS:
- Enviamos a toda la República Mexicana.

DEVOLUCIONES:
- No aceptamos devoluciones por cambio de opinión.
- Si el producto llega con defecto, toma fotos inmediatamente y envíalas a nuestro número de contacto.

PEDIDOS Y RESERVACIONES:
- Para apartar ropa debes pagar el total del pedido.
- Una vez confirmado el pago procesamos y enviamos tu pedido.
- Si no recibes notificación de tu pedido en el tiempo esperado, comunícate al número de contacto.

RESPONDE siempre en español, de forma amable, breve y clara. Si no sabes algo específico sobre un producto o disponibilidad, indica al cliente que contacte directamente por WhatsApp al 5214421052174.`;

  const messages = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Error al contactar IA', detail: err });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Lo siento, no pude procesar tu pregunta.';
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno', detail: e.message });
  }
}
