require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

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
    { voice_id: 'xGDJhCwcqw94ypljc95Z', name: 'Jack',  labels: { accent: 'British',    gender: 'male'   } },
    { voice_id: 'Atp5cNFg1Wj5gyKD7HWV', name: 'Josie', labels: { accent: 'American',   gender: 'female' } },
    { voice_id: 'UWd1uM1Yoa3pnT3menSz', name: 'Woody', labels: { accent: 'American',   gender: 'male'   } },
    { voice_id: 'oaLGpwm7fYWDEFmlRuQk', name: 'James', labels: { accent: 'American',   gender: 'male'   } },
    { voice_id: 'KmnvDXRA0HU55Q0aqkPG', name: 'Ollie', labels: { accent: 'Australian', gender: 'male'   } },
  ]});
});

// Stream meditation text via Claude SSE
app.post('/api/meditate', async (req, res) => {
  const { request, personality, duration, features } = req.body;
  if (!request) return res.status(400).json({ error: 'request required' });

  const targetWords = Math.round((duration || 5) * 130);
  // 1.65 tokens/word accounts for ellipsis-heavy meditation prose; hard ceiling enforced by max_tokens
  const maxTokens   = Math.max(150, Math.ceil(targetWords * 1.65));

  const structureNote = targetWords <= 200
    ? 'Structure: brief arrival (settle breath, soften body), then a single gentle close. Nothing more — there is no time.'
    : targetWords <= 500
    ? 'Structure: arrival → one core technique → return. Keep each section tight.'
    : 'Structure: arrival → regulation → core technique → integration → return.';

  const personalityLine = personality
    ? `\nPersonality & tone: ${personality}`
    : '';

  const featuresLine = features && features.length > 0
    ? `\nOptional techniques — weave in naturally when they fit, not forced into every meditation: ${features.join(', ')}.`
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
        max_tokens: maxTokens,
        stream: true,
        system: `You write short guided meditations to be read aloud.

WORD COUNT: EXACTLY ${targetWords} words. Hard stop. Do not exceed this.

- Spoken words only — no labels, headers, or stage directions
- Second person ("you", "your")
- Simple, plain language — no metaphors, no poetic analogies, no flowery descriptions
- Vary how each meditation opens — do not always start with breath or settling instructions
- NEVER end a sentence with "." — always use "..." for natural pauses
- Warm but direct — like a calm person talking, not a performance
- No terms of endearment (no "my dear", "darling", etc.)

${structureNote}${personalityLine}${featuresLine}`,
        messages: [{ role: 'user', content: `Write a ${duration || 5}-minute meditation (${targetWords} words) for: ${request}` }]
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
    let fullText = '';
    let stopped = false;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'content_block_delta' && msg.delta?.type === 'text_delta') {
            const chunk = msg.delta.text;
            fullText += chunk;
            const wordCount = fullText.trim().split(/\s+/).filter(w => w).length;
            if (wordCount >= targetWords) {
              // Send the chunk that pushed us over, then stop
              res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
              stopped = true;
              reader.cancel().catch(() => {});
              break outer;
            }
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
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
function prepareForVoice(text) {
  // Trim to last ellipsis so ElevenLabs always gets a clean sentence ending.
  // Word-count cutting can leave text mid-sentence which causes repetition artifacts.
  const lastPause = text.lastIndexOf('...');
  const trimmed = lastPause > text.length * 0.6 ? text.slice(0, lastPause + 3) : text;

  const prepared = trimmed
    .replace(/\.{6,}/g, ' ... ... ... ')
    .replace(/\.{3,}/g, ' ... ... ')
    .replace(/\.\s/g,   '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `... ... ... ... ${prepared}`;
}

const VOICE_INTROS = {
  'Atp5cNFg1Wj5gyKD7HWV': "Take a slow breath in... and let your shoulders drop... You're safe here, and there's nowhere else you need to be...",
  'atEhNo1k29EZslpsboHA': "Let your eyes close gently... and just feel the weight of your body settling... There's nothing to do right now, except arrive...",
  'UWd1uM1Yoa3pnT3menSz': "Let everything slow right down... just for a moment... Take one easy breath, and let yourself land here...",
  'oaLGpwm7fYWDEFmlRuQk': "Bring your attention inward... quietly, without force... Let this breath be the beginning of something still...",
  'M7wzTk2Y1hGQyRzr9sbS': "Close your eyes if that feels right... and take one slow, gentle breath... Let your body know that it's safe to rest...",
  'xGDJhCwcqw94ypljc95Z': "Settle in... take a breath, and let the world grow quiet for a moment... You're exactly where you need to be...",
  'KmnvDXRA0HU55Q0aqkPG': "Take a slow breath in... let your shoulders drop... There's nothing to rush here, just settle in and be present...",
  'mZTVERjx1WQkdAWt1Lcm': "Let your body soften... take one easy breath... and just allow yourself to be here, exactly as you are...",
};

const PREVIEW_CACHE_DIR = path.join(__dirname, '.preview-cache');
if (!fs.existsSync(PREVIEW_CACHE_DIR)) fs.mkdirSync(PREVIEW_CACHE_DIR);

// Short voice preview for the voice picker carousel — cached to disk after first generation
app.get('/api/preview/:voiceId', async (req, res) => {
  const { voiceId } = req.params;
  const cachePath = path.join(PREVIEW_CACHE_DIR, `${voiceId}.mp3`);
  if (fs.existsSync(cachePath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(fs.readFileSync(cachePath));
  }
  const text = VOICE_INTROS[voiceId] || "Hello... take a breath, and let yourself arrive...";
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.75, similarity_boost: 0.75, style: 0.05, use_speaker_boost: false, speed: 0.85 }
      })
    });
    if (!r.ok) return res.status(r.status).end();
    const buffer = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(cachePath, buffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    res.status(500).end();
  }
});

// Convert meditation text to audio via ElevenLabs — streamed directly to client
app.post('/api/speak', async (req, res) => {
  const { text, voiceId, speed = 0.70, pauseLevel = 2 } = req.body;
  if (!text || !voiceId) return res.status(400).json({ error: 'text and voiceId required' });

  const clampedSpeed = Math.min(1.2, Math.max(0.7, parseFloat(speed) || 0.70));

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: prepareForVoice(text, parseInt(pauseLevel) || 2),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.75, similarity_boost: 0.75, style: 0.05, use_speaker_boost: false, speed: clampedSpeed }
      })
    });

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: body.detail?.message || r.statusText });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = r.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) await new Promise(resolve => res.once('drain', resolve));
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

app.post('/api/title', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.json({ title: 'a quiet pause' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16,
        messages: [{ role: 'user', content: `Give a 2-3 word lowercase title for a meditation about: "${prompt}". Warm, positive, and uplifting — never negative or heavy words. Plain everyday words, no metaphors, no punctuation, no quotes. Just the title.` }]
      })
    });
    if (!r.ok) return res.json({ title: 'a quiet pause' });
    const data = await r.json();
    const title = (data.content?.[0]?.text || '').trim().toLowerCase().replace(/[".]/g, '') || 'a quiet pause';
    res.json({ title });
  } catch {
    res.json({ title: 'a quiet pause' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Meditation server running → http://localhost:${PORT}`);
});
