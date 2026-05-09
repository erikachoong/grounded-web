import * as FileSystem from 'expo-file-system/legacy';
import { Voice } from './types';

// ── CONFIG ──────────────────────────────────────────────────────────────────
// During dev with iPhone on Expo Go: change this to your Mac's local IP
// Find your IP: System Preferences → Network, or run `ipconfig getifaddr en0`
// Example: 'http://192.168.1.42:3003'
// For iOS Simulator: 'http://localhost:3003'
export const BASE = 'http://localhost:3003';

// ── VOICES ──────────────────────────────────────────────────────────────────
export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(`${BASE}/api/voices`);
  const data = await res.json();
  return data.voices ?? [];
}

// ── MEDITATION STREAMING ────────────────────────────────────────────────────
export async function streamMeditation(
  request: string,
  personality: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}/api/meditate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request, personality }),
    signal,
  });

  if (!res.ok) throw new Error('Server error: ' + res.statusText);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Streaming not supported');

  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const msg = JSON.parse(raw);
        if (msg.error) throw new Error(msg.error);
        if (msg.chunk) onChunk(msg.chunk);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

// ── AUDIO ────────────────────────────────────────────────────────────────────
export async function generateAudio(
  text: string,
  voiceId: string,
  speed: number,
  pauseLevel: number,
): Promise<string> {
  const res = await fetch(`${BASE}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, speed, pauseLevel }),
  });

  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || res.statusText);
  }

  const buffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  // Convert to base64 in chunks to avoid stack overflow
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);

  const uri = FileSystem.cacheDirectory + 'grounded_' + Date.now() + '.mp3';
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return uri;
}
