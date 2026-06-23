// api.js
// Vercel serverless / Edge function handler for NVIDIA NIM integration
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();
    const apiKey = process.env.FIRE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'FIRE_API_KEY environment variable is not configured on Vercel.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Proxy request securely to NVIDIA NIM OpenAI-compliant endpoints
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-405b-instruct",
        messages: messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `NVIDIA API Error: ${errText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}