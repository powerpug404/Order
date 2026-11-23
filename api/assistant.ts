// Vercel serverless endpoint. OPENAI_API_KEY is configured in Vercel, never in Vite.
export default async function handler(req: any, res: any) {
  const origin = req.headers.origin;
  if (origin === 'https://powerpug404.github.io' || origin === 'https://order-one-bay.vercel.app') { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
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
        text: { format: { type: 'json_object' } },
        instructions: 'You are ORDER, a personal planning assistant connected to a real app. Always return a JSON object with keys reply (string) and actions (array). Supported action types are goal, task, event, complete_task, set_priority, reschedule_task. Propose only changes directly requested. Each action has type,title,date,start,priority,goal,eventTitle,taskId,recurrence; for recurring events, recurrence may specify frequency and weekdays. Events without a clear date must keep date empty. Each action has type,title,date,start,priority,goal,eventTitle,taskId,recurrence; use empty strings for unknown optional values and priority 1-4. For edits, reference an existing task by its supplied taskId. Never propose deleting data. For bulk schedule changes propose each task separately and explain the plan for user approval. Never invent dates, progress, history, or claim changes are saved. If asked to edit, delete, reschedule, analyze historical data, or perform an unsupported action, explain that it is not available yet and return actions: []. Use supplied data to avoid duplicates.',
        input: `User request:\n${message.trim()}\n\nSaved ORDER context (JSON):\n${data}` })
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.error?.message || 'OpenAI request failed.' });
    const text = (result.output || []).flatMap((item: any) => item.content || []).filter((item: any) => item.type === 'output_text').map((item: any) => item.text).join('\n');
    return res.status(200).json({ text: text || 'I could not form a response. Try rephrasing.' });
  } catch { return res.status(502).json({ error: 'Could not reach OpenAI. Try again.' }); }
}
