// functions/generate.js — Cloudflare Pages Function — v3 (streaming)
// Streams the Anthropic response straight through to the browser.
// This keeps the connection continuously active and eliminates the
// Cloudflare 524 timeout on long (rich) report generations.
// ─────────────────────────────────────────────────────────────
// SETUP IN CLOUDFLARE DASHBOARD (unchanged):
//   Pages → project → Settings → Environment variables:
//     ANTHROPIC_API_KEY  =  sk-ant-api03-...your key...
//     BYPASS_CODES       =  ICEBERG-VIP,COACH-ROBERTS,FUTURE-SCAPE
// ─────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { messages, model, max_tokens, system } = payload;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const requestBody = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: max_tokens || 8000,
    messages: messages,
    stream: true
  };
  if (system) requestBody.system = system;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let msg = 'API error';
      try { const errData = await response.json(); msg = errData.error?.message || msg; } catch (e) {}
      return new Response(JSON.stringify({ error: msg }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
