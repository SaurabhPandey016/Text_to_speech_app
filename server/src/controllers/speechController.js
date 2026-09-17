import { z } from 'zod';

import { prisma } from '../services/prismaService.js';
import { env } from '../config/environment.js';
import { defaultLanguageCode, loadDynamicVoices, resolveVoiceForLanguage } from '../services/voiceService.js';

const speechSchema = z.object({
  text: z.string().trim().min(1, 'Enter some text first.').max(Number(process.env.MAX_CHARACTERS) || 5000),
  voice: z.string().min(1),
  language: z.string().min(1),
  format: z.enum(['MP3', 'WAV']).default('MP3'),
});

export async function getAvailableVoices(_req, res) {
  const currentVoices = await loadDynamicVoices();
  return res.json({
    voices: currentVoices,
    languages: [...new Map(currentVoices.map((voice) => [voice.code, { name: voice.language, code: voice.code }])).values()],
  });
}

export async function getGenerationHistory(req, res) {
  if (!req.user) return res.json({ generations: [] });

  const generations = await prisma.speechGeneration.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, text: true, language: true, voice: true, format: true, createdAt: true },
  });

  res.json({ generations });
}

export async function generateSpeech(req, res) {
  const parsed = speechSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid speech request.' });
  }

  const resolvedVoices = await loadDynamicVoices();
  const requestedVoice = resolveVoiceForLanguage(parsed.data.language, parsed.data.voice);
  const fallbackVoice = resolveVoiceForLanguage(defaultLanguageCode, 'Ashley');
  const voiceAttempts = [requestedVoice, fallbackVoice].filter((voice, index, list) => list.findIndex((candidate) => candidate.id === voice.id && candidate.code === voice.code) === index);

  if (!env.inworldApiKey) {
    return res.status(503).json({ error: 'TTS service is not configured. Add INWORLD_API_KEY to the server environment.' });
  }

  try {
    let providerResponse;
    let activeVoice = requestedVoice;
    let lastError = null;

    for (const voice of voiceAttempts) {
      const payload = {
        modelId: env.inworldModelId,
        text: parsed.data.text,
        voiceId: voice.id,
        language: voice.code,
        audioConfig: {
          audioEncoding: parsed.data.format === 'WAV' ? 'LINEAR16' : 'MP3',
          sampleRateHertz: 24000,
        },
      };

      providerResponse = await fetch(env.inworldTtsUrl, {
        method: 'POST',
        headers: { Authorization: `Basic ${env.inworldApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (providerResponse.ok) {
        activeVoice = voice;
        break;
      }

      const details = await providerResponse.text();
      lastError = { status: providerResponse.status, details: details.slice(0, 500) };
      console.error('Inworld error for voice', voice.id, providerResponse.status, details.slice(0, 500));
    }

    if (!providerResponse || !providerResponse.ok) {
      console.error('Speech provider rejected request:', lastError);
      return res.status(502).json({ error: 'The speech provider rejected the request. Check the provider key and voice configuration.' });
    }

    const contentType = providerResponse.headers.get('content-type') || '';
    let audio;

    if (contentType.includes('audio/')) {
      audio = Buffer.from(await providerResponse.arrayBuffer()).toString('base64');
    } else {
      const payload = await providerResponse.json();
      audio = payload.audioContent || payload.audio_content || payload.audio || payload.result?.audioContent;
    }

    if (!audio) {
      return res.status(502).json({ error: 'The speech provider returned no audio.' });
    }

    if (req.user) {
      await prisma.speechGeneration.create({
        data: {
          text: parsed.data.text,
          language: activeVoice.code,
          voice: activeVoice.name,
          format: parsed.data.format,
          userId: req.user.id,
        },
      });
    }

    return res.json({
      audio: `data:audio/${parsed.data.format === 'WAV' ? 'wav' : 'mpeg'};base64,${audio}`,
      format: parsed.data.format,
      voice: activeVoice.name,
      language: activeVoice.code,
    });
  } catch (error) {
    console.error('Speech error:', error);
    return res.status(502).json({ error: 'Speech generation failed. Please check your connection and try again.' });
  }
}
