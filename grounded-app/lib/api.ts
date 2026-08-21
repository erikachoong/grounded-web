import * as FileSystem from 'expo-file-system/legacy';
import { Voice } from './types';

export const BASE = 'https://grounded-web-production.up.railway.app';

export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(`${BASE}/api/voices`);
  const data = await res.json();
  return data.voices ?? [];
}

// XHR-based streaming — React Native's fetch doesn't reliably support body.getReader()
export async function streamMeditation(
  request: string,
  personality: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let offset = 0;

    xhr.open('POST', `${BASE}/api/meditate`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    const onAbort = () => {
      xhr.abort();
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };
    signal.addEventListener('abort', onAbort);

    xhr.onprogress = () => {
      const newText = xhr.responseText.slice(offset);
      offset = xhr.responseText.length;
      const lines = newText.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const msg = JSON.parse(raw);
          if (msg.error) { reject(new Error(msg.error)); return; }
          if (msg.chunk) onChunk(msg.chunk);
        } catch (e) {
          if (!(e instanceof SyntaxError)) { reject(e); return; }
        }
      }
    };

    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      if (xhr.status >= 400) reject(new Error(`Server error: ${xhr.status}`));
      else resolve();
    };

    xhr.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error('Network error'));
    };

    xhr.send(JSON.stringify({ request, personality }));
  });
}

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
