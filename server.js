import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// ── Health check ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'MCE Field Server running', version: '1.0.0' });
});

// ── Chat endpoint ──────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'CLAUDE_API_KEY not set on server' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 800,
        system: system || 'You are Claude, an AI assistant.',
        messages: messages.slice(-12)
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { return res.status(500).json({ error: 'Claude API returned non-JSON', raw: raw.slice(0, 200) }); }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Claude API error', detail: data });
    }

    let text = '';
    if (data.content?.length) {
      for (const c of data.content) {
        if (c.type === 'text') { text = c.text; break; }
      }
    }

    return res.json({ text, phase: req.body.phase || 'HYDROGEN', model: data.model });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 MCE Field Server on port ${PORT}`);
});
