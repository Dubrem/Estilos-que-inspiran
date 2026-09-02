export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Falta el mensaje' });

  const SYSTEM = `Eres el asistente virtual de DUBREM, una tienda de ropa con el lema "Estilos que inspiran".

INFORMACIÓN DE LA TIENDA:
- Nombre: DUBREM
- Dirección física: H Colegio Militar 2, Centro, 42800 Tula de Allende, Hgo.
- Horario de la tienda física: Lunes a sábado de 10:00 am a 7:00 pm (19:00 h)
- Horario de atención al cliente (pedidos en línea): Lunes a viernes de 9:00 am a 5:00 pm
- Teléfono / WhatsApp: 55 6372 3284
- WhatsApp directo: 5214421052174

CATEGORÍAS DISPONIBLES:
- Mujer, Hombre, Niños, Juvenil, Maternidad

PRENDAS Y DISPONIBILIDAD:
- Si el cliente pregunta por una prenda específica que no tienes confirmada en catálogo, ofrecele alternativas similares dentro de nuestras categorías disponibles y sugierele explorar el catálogo en la página o contactarnos por WhatsApp para consultar disponibilidad exacta.

PAGOS:
- Aceptamos MercadoPago: tarjeta de crédito/débito, pago en OXXO y transferencia bancaria
- Se requiere pago completo para procesar el pedido. No manejamos apartados ni pagos parciales.
- Si pagas por transferencia debes enviar tu comprobante al número de contacto.

ENVÍOS:
- Enviamos a toda la República Mexicana.

DEVOLUCIONES Y CAMBIOS:
- No aceptamos devoluciones ni cambios por cambio de opinión o talla equivocada.
- Si el producto llega con defecto de fábrica, toma fotografías inmediatamente y envíalas a nuestro número de contacto. Atenderemos tu caso a la brevedad.
- Sin comprobante de defecto no se puede gestionar ningún caso.

PEDIDOS Y RESERVACIONES:
- Para apartar cualquier prenda se requiere pago total del pedido.
- Una vez confirmado el pago procesamos y enviamos tu pedido.
- Si no recibes notificación en el tiempo esperado, comunícate directamente al 55 6372 3284.

INSTRUCCIONES DE RESPUESTA:
- Responde siempre en español, de forma amable, breve y clara.
- Si preguntan por ubicación, da la dirección completa y los horarios de la tienda física.
- Si preguntan por una prenda específica, sugiere alternativas de nuestro catálogo y el contacto directo.
- Si preguntan sobre políticas de la página (envíos, devoluciones, pagos, horarios) responde con la información que tienes.
- Si no puedes resolver algo, dirige al cliente a WhatsApp: 5214421052174 o al teléfono 55 6372 3284.`;

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
