require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3003;

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const ELEVEN_KEY    = process.env.ELEVEN_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve the meditation page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'meditation.html'));
});

// Free-tier voices with correct names from ElevenLabs public API
app.get('/api/voices', (req, res) => {
  res.json({ voices: [
    { voice_id: 'Atp5cNFg1Wj5gyKD7HWV', name: 'Josie',  labels: { accent: 'American', gender: 'female' } },
    { voice_id: 'atEhNo1k29EZslpsboHA', name: 'Callum', labels: { accent: 'British',  gender: 'male'   } },
      { voice_id: 'UWd1uM1Yoa3pnT3menSz', name: 'Woody', labels: { accent: 'American',  gender: 'male'   } },
      { voice_id: 'oaLGpwm7fYWDEFmlRuQk', name: 'Jack', labels: { accent: 'British',  gender: 'male'   } },
        { voice_id: 'M7wzTk2Y1hGQyRzr9sbS', name: 'Dorothy', labels: { accent: 'British',  gender: 'male'   } },
  ]});
});

// Stream meditation text via Claude SSE
app.post('/api/meditate', async (req, res) => {
  const { request, personality } = req.body;
  if (!request) return res.status(400).json({ error: 'request required' });

  const personalityLine = personality
    ? `\nPersonality & tone (user-defined): ${personality}`
    : '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        stream: true,
        system: `You write guided meditations to be read aloud by a calm, warm British female voice.
Rules:
- Pure spoken words only — no headers, labels, parentheticals, or stage directions
- Second person: "you", "your", "you are"
- Write in long, flowing sentences connected with commas — avoid short choppy phrases
- NEVER end a sentence with a full stop (.) — always use "..." to allow the voice to fade naturally
- Use "......" (six dots) after breath instructions for a longer fade
- Think of each sentence as a gentle wave — it builds softly, flows forward with commas, and fades with "..."
- NEVER use terms of endearment: no "my dear", "my love", "darling", "sweetheart", or similar
- Warm, grounded, unhurried — like a calm trusted presence sitting beside them
- 5–7 minutes when read slowly
- Begin mid-presence, already with them, soft and close

Structure every meditation in this exact order:
1. Arrival — slow the user down, bring attention into the body, create a sense of safety. Almost always involves breathing and body awareness.
2. Regulation — calm the nervous system through breathing patterns, slowing thoughts, and reducing anxiety. This is where it starts to feel like it's working.
3. Core technique — the main practice, chosen based on the user's goal. For anxiety: grounding and thought distancing. For sleep: body scan and heaviness. For confidence: visualisation. For focus: attention training. For other goals: use your judgement.
4. Integration — gentle reframing, carefully used affirmations, emotional processing. Help the user absorb what they've experienced.
5. Return — bring awareness gently back, never end abruptly, leave the user feeling stable and held.${personalityLine}`,
        messages: [{ role: 'user', content: `Please write a meditation for: ${request}` }]
      })
    });

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      res.write(`data: ${JSON.stringify({ error: body.error?.message || r.statusText })}\n\n`);
      return res.end();
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete line
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'content_block_delta' && msg.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ chunk: msg.delta.text })}\n\n`);
          }
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Plain text only — no SSML. ElevenLabs fades naturally on ...
// We expand each ... into multiple sequences so the pause is longer
// without ever losing the fade quality
function prepareForVoice(text, pauseLevel = 2) {
  const prepared = text
    .replace(/\.{3,}/g, ' ... ')   // any ellipsis → single ...
    .replace(/\.\s/g,   '. ')      // normalise sentence spacing
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `... ... ... ${prepared}`;
}

// Convert meditation text to audio via ElevenLabs
app.post('/api/speak', async (req, res) => {
  const { text, voiceId, speed = 0.70, pauseLevel = 2 } = req.body;
  if (!text || !voiceId) return res.status(400).json({ error: 'text and voiceId required' });

  // Clamp speed to ElevenLabs valid range
  const clampedSpeed = Math.min(1.2, Math.max(0.7, parseFloat(speed) || 0.70));

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: prepareForVoice(text, parseInt(pauseLevel) || 2),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.05,
          use_speaker_boost: false,
          speed: clampedSpeed
        }
      })
    });

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: body.detail?.message || r.statusText });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await r.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Meditation server running → http://localhost:${PORT}`);
});
