// functions/generate.js — Cloudflare Pages Function — v2
// Uses onRequest (handles all methods) instead of onRequestPost
// ─────────────────────────────────────────────────────────────
// FOLDER STRUCTURE for Cloudflare Pages:
//
//   your-site-folder/
//   ├── index.html
//   └── functions/
//       └── generate.js   ← this file (no "netlify" folder needed)
//
// SETUP IN CLOUDFLARE DASHBOARD:
// Pages → your project → Settings → Environment variables → Add:
//
//   ANTHROPIC_API_KEY  =  sk-ant-api03-...your key...
//   BYPASS_CODES       =  ICEBERG-VIP,COACH-ROBERTS,FUTURE-SCAPE
//
// The URL to call from the browser is the same: /functions/generate
// Update index.html fetch URL from:
//   '/.netlify/functions/generate'
// To:
//   '/functions/generate'
// ─────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }

  // Parse request body
  let payload;
  try {
    payload = await request.json();
  } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: corsHeaders
    });
  }

  const { messages, model, max_tokens, system, bypass_code } = payload;

  // API key
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 500, headers: corsHeaders
    });
  }

  // Build Anthropic request
  const requestBody = {
    model: model || 'claude-sonnet-4-20250514',
    max_tokens: max_tokens || 4000,
    messages: messages
  };
  if (system) requestBody.system = system;

  // Call Anthropic
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

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'API error' }), {
        status: response.status, headers: corsHeaders
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200, headers: corsHeaders
    });

  } catch(err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: corsHeaders
    });
  }
}
