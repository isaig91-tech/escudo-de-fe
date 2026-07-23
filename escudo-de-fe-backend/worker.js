const SYSTEM_PROMPT = `Eres un experto en apologetica catolica. Responde UNICAMENTE con JSON valido sin texto adicional: {"topic":"Titulo breve","verse":"Cita biblica","verseRef":"Libro Cap:Ver","cic":"CIC numero","argument":"Argumento en 3-4 oraciones con referencia patristica.","deepAnalysis":"Analisis patristico extendido.","sources":["fuente1","fuente2"]} Fuentes: Padre Luis Toro, Santiago Alarcon, Soldado Apologeta, Jose Placencia, San Agustin, San Ireneo, Concilio Vaticano II. Siempre incluye cita biblica. Responde en el idioma del usuario.`;

export default {
  async fetch(request, env, ctx) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
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
    if (question.length > 600) return resp({ error: 'Pregunta demasiado larga' }, 400, cors);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const dailyLimit = parseInt(env.DAILY_LIMIT || '500');
    const perIpLimit = parseInt(env.PER_IP_LIMIT || '15');
    const today = new Date().toISOString().slice(0, 10);
    const globalKey = 'global:' + today;
    const ipKey = 'ip:' + ip + ':' + today;
    const globalCount = parseInt((await env.ESCUDO_KV.get(globalKey)) || '0');
    if (globalCount >= dailyLimit) {
      return resp({ error: 'cuota_agotada', message: 'El credito comunitario de hoy se agoto. Vuelve manana.' }, 429, cors);
    }
    const ipCount = parseInt((await env.ESCUDO_KV.get(ipKey)) || '0');
    if (ipCount >= perIpLimit) {
      return resp({ error: 'limite_ip', message: 'Limite de hoy alcanzado. Vuelve manana.' }, 429, cors);
    }
    const modeTexts = { debate: 'Debate apologetico.', duda: 'Duda personal.', evan: 'Evangelizacion.' };
    const fullPrompt = SYSTEM_PROMPT + ' Modo: ' + (modeTexts[mode] || modeTexts.duda) + ' Pregunta: ' + question;
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1000 } }),
    });
if (aiResponse.status === 429) {
  const errBody = await aiResponse.text();
  return resp({ error: 'limite_ip', message: 'Gemini 429: ' + errBody.substring(0, 150) }, 429, cors);
}
    if (!aiResponse.ok) {
      return resp({ error: 'Error al consultar la IA. Codigo: ' + aiResponse.status }, 502, cors);
    }
    const aiData = await aiResponse.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch (e) {
      return resp({ error: 'Respuesta invalida.' }, 502, cors);
    }
    await env.ESCUDO_KV.put(globalKey, String(globalCount + 1), { expirationTtl: 172800 });
    await env.ESCUDO_KV.put(ipKey, String(ipCount + 1), { expirationTtl: 172800 });
    return resp({ success: true, data: parsed, quota: { used: ipCount + 1, limit: perIpLimit } }, 200, cors);
  } catch (err) {
    return resp({ error: 'Error interno: ' + err.message }, 500, cors);
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