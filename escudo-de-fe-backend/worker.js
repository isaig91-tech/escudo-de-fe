const SYSTEM_PROMPT = `Eres un experto en apologetica catolica y doctrina de la Iglesia Catolica.
Tu mision es ayudar a los fieles a defender y explicar su fe con caridad y firmeza.

Responde UNICAMENTE con un objeto JSON valido sin texto adicional ni markdown:
{
  "topic": "Titulo breve maximo 5 palabras",
  "verse": "Texto completo de la cita biblica",
  "verseRef": "Libro Capitulo:Versiculo",
  "cic": "CIC numero de paragrafo",
  "argument": "Argumento apologetico completo en 3-4 oraciones con referencia patristica cuando aplique.",
  "deepAnalysis": "Analisis patristico extendido de 2-3 oraciones citando Padres de la Iglesia y Concilios.",
  "sources": ["fuente1", "fuente2"]
}

Fuentes validas: Padre Luis Toro, Santiago Alarcon, Soldado Apologeta, Jose Placencia El Papista, San Agustin de Hipona, San Ireneo de Lyon, Concilio Vaticano II, San Juan Pablo II.
Siempre incluye cita biblica real. Responde en el idioma del usuario. Sin texto fuera del JSON.`;

export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return resp({ error: 'Metodo no permitido' }, 405, cors);
    const { pathname } = new URL(request.url);
    if (pathname === '/ask') return handleAsk(request, env, cors);
    if (pathname === '/status') return handleStatus(request, env, cors);
    return resp({ error: 'Ruta no encontrada' }, 404, cors);
  },
};

async function handleAsk(request, env, cors) {
  try {
    const body = await request.json();
    const question = (body.question || '').trim();
    const mode = body.mode || 'duda';
    if (!question || question.length < 3) return resp({ error: 'Pregunta invalida' }, 400, cors);
    if (question.length > 600) return resp({ error: 'Pregunta demasiado larga.' }, 400, cors);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const dailyLimit = parseInt(env.DAILY_LIMIT || '500');
    const perIpLimit = parseInt(env.PER_IP_LIMIT || '15');
    const today = new Date().toISOString().slice(0, 10);
    const globalKey = 'global:' + today;
    const ipKey = 'ip:' + ip + ':' + today;
    const globalCount = parseInt((await env.ESCUDO_KV.get(globalKey)) || '0');
    if (globalCount >= dailyLimit) return resp({ error: 'cuota_agotada', message: 'El credito comunitario de hoy se agoto. Vuelve manana.' }, 429, cors);
    const ipCount = parseInt((await env.ESCUDO_KV.get(ipKey)) || '0');
    if (ipCount >= perIpLimit) return resp({ error: 'limite_ip', message: 'Limite de hoy alcanzado (' + perIpLimit + ' consultas). Vuelve manana.' }, 429, cors);
    const modeTexts = {
      debate: 'Debate apologetico - defiende la posicion catolica con firmeza y caridad.',
      duda: 'Duda personal - responde claro y pastoral.',
      evan: 'Evangelizacion - responde de forma acogedora.'
    };
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system: SYSTEM_PROMPT + '\nModo: ' + (modeTexts[mode] || modeTexts.duda), messages: [{ role: 'user', content: question }] }),
    });
    if (!aiResponse.ok) return resp({ error: 'Error al consultar la IA.' }, 502, cors);
    const aiData = await aiResponse.json();
    const rawText = aiData.content.map((b) => b.text || '').join('');
    let parsed;
    try { parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim()); }
    catch (e) { return resp({ error: 'Respuesta invalida.' }, 502, cors); }
    await env.ESCUDO_KV.put(globalKey, String(globalCount + 1), { expirationTtl: 172800 });
    await env.ESCUDO_KV.put(ipKey, String(ipCount + 1), { expirationTtl: 172800 });
    return resp({ success: true, data: parsed, quota: { used: ipCount + 1, limit: perIpLimit } }, 200, cors);
  } catch (err) {
    return resp({ error: 'Error interno.' }, 500, cors);
  }
}

async function handleStatus(request, env, cors) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const perIpLimit = parseInt(env.PER_IP_LIMIT || '15');
  const dailyLimit = parseInt(env.DAILY_LIMIT || '500');
  const ipCount = parseInt((await env.ESCUDO_KV.get('ip:' + ip + ':' + today)) || '0');
  const globalCount = parseInt((await env.ESCUDO_KV.get('global:' + today)) || '0');
  return resp({ yourUsage: ipCount, yourLimit: perIpLimit, communityUsage: globalCount, communityLimit: dailyLimit }, 200, cors);
}

function resp(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}