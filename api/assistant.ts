// Vercel serverless endpoint. OPENAI_API_KEY is configured in Vercel, never in Vite.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI is not configured yet. Add OPENAI_API_KEY in Vercel.' });
  const { message, context } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) return res.status(400).json({ error: 'Enter a message under 4,000 characters.' });
  const data = JSON.stringify(context || {}).slice(0, 12000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', store: false,
        instructions: 'You are ORDER, a concise personal planning assistant. Use only the supplied saved app data for factual claims. Never claim an action was completed. Suggest changes clearly; do not invent history.',
        input: `User request:\n${message.trim()}\n\nSaved ORDER context (JSON):\n${data}` })
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.error?.message || 'OpenAI request failed.' });
    const text = (result.output || []).flatMap((item: any) => item.content || []).filter((item: any) => item.type === 'output_text').map((item: any) => item.text).join('\n');
    return res.status(200).json({ text: text || 'I could not form a response. Try rephrasing.' });
  } catch { return res.status(502).json({ error: 'Could not reach OpenAI. Try again.' }); }
}
