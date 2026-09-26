/* =========================================================
   Cloudflare Worker: приймає замовлення з сайту і шле в Telegram.
   Змінні (Settings → Variables → Secrets):
     BOT_TOKEN — токен бота від @BotFather
     CHAT_ID   — куди слати (id чату або групи менеджерів)
     ORIGIN    — адреса сайту, напр. https://daud-coder.github.io
   Після деплою адресу воркера вписати в js/config.js → orderEndpoint.
   ========================================================= */
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

    // пастка для ботів: справжня людина це поле не бачить і не заповнює
    if (body.website) return new Response('ok', { headers: cors });

    const text = String(body.text || '').slice(0, 3500);
    if (text.length < 20) return new Response('Empty order', { status: 400, headers: cors });

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text: '🥩 ' + text, disable_web_page_preview: true }),
    });
    if (!tg.ok) return new Response('Telegram error', { status: 502, headers: cors });
    return new Response('ok', { headers: cors });
  },
};
