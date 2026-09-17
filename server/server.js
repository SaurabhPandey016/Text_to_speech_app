import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET || 'local-development-secret-change-me';
const maxCharacters = Number(process.env.MAX_CHARACTERS) || 5000;

const defaultVoiceCatalog = [
  { id: 'Riya', name: 'Riya', language: 'English', code: 'en-US', style: 'Professional and clean female voice' },
  { id: 'Graham', name: 'Graham', language: 'English', code: 'en-US', style: 'Authoritative British male voice' },
  { id: 'Simon', name: 'Simon', language: 'English', code: 'en-US', style: 'Articulate and corporate male voice' },
  { id: 'Nate', name: 'Nate', language: 'English', code: 'en-US', style: 'Conversational and friendly male voice' },
  { id: 'Anjali', name: 'Anjali', language: 'English', code: 'en-US', style: 'Confident Indian female voice' },
  { id: 'Ishaan', name: 'Ishaan', language: 'English', code: 'en-US', style: 'Natural Indian male voice' },
  { id: 'Nour', name: 'Nour', language: 'English', code: 'en-US', style: 'Friendly Arabic female voice' },
  { id: 'Matthias', name: 'Matthias', language: 'English', code: 'en-US', style: 'Resonant German male voice' },
  { id: 'Renata', name: 'Renata', language: 'English', code: 'en-US', style: 'Calm Brazilian female voice' },
  { id: 'Yulia', name: 'Yulia', language: 'English', code: 'en-US', style: 'Gentle Russian female voice' },
];

const defaultLanguageCode = 'en-US';
let voices = [...defaultVoiceCatalog];

function normalizeLanguageCode(language) {
  if (!language) return defaultLanguageCode;
  const normalized = String(language).trim();
  return normalized || defaultLanguageCode;
}

function normalizeVoiceItem(item) {
  if (!item || typeof item !== 'object') return null;

  const id = item.id || item.voiceId || item.voice_id || item.name || item.label || item.voice_name || item.voiceName;
  const name = item.name || item.label || item.voiceName || item.voice_name || item.voiceId || item.id || 'Voice';
  const languageName = item.language || item.locale || item.languageName || item.nativeLanguage || item.language_name || 'English';
  const code = item.code || item.locale || item.languageCode || item.lang || item.language || item.language_code || defaultLanguageCode;
  const style = item.style || item.description || item.voiceStyle || item.voice_style || 'Natural';

  if (!id) return null;

  return {
    id: String(id),
    name: String(name),
    language: String(languageName),
    code: String(code).replace(/_/g, '-'),
    style: String(style),
  };
}

function parseProviderVoiceList(payload) {
  if (!payload) return [];

  const source = Array.isArray(payload)
    ? payload
    : payload.voices || payload.items || payload.data || payload.result || payload.voiceList || payload.choices || [];

  const list = Array.isArray(source) ? source : (source && typeof source === 'object' ? [source] : []);
  return list.map(normalizeVoiceItem).filter(Boolean);
}

function buildInworldAuthHeaders() {
  const key = (process.env.INWORLD_API_KEY || '').trim();
  if (!key) return [{}];

  const encodedMajor = Buffer.from(key).toString('base64');
  const encodedBasic = Buffer.from(`${key}:`).toString('base64');

  return [
    { Authorization: `Bearer ${key}` },
    { Authorization: `Basic ${key}` },
    { Authorization: `Basic ${encodedBasic}` },
    { Authorization: `Basic ${encodedMajor}` },
    { 'x-api-key': key },
    { 'api-key': key },
  ];
}

async function loadDynamicVoices() {
  const configuredCatalog = process.env.INWORLD_VOICES || process.env.VOICE_CATALOG || process.env.INWORLD_VOICE_LIST;
  if (configuredCatalog) {
    try {
      const parsed = JSON.parse(configuredCatalog);
      const normalized = parseProviderVoiceList(parsed);
      if (normalized.length) {
        voices = normalized;
        return voices;
      }
    } catch (error) {
      console.warn('Failed to parse configured voice catalog:', error.message);
    }
  }

  const inworldUrl = process.env.INWORLD_TTS_URL || 'https://api.inworld.ai/tts/v1/voice';
  const baseCandidates = [
    inworldUrl.replace(/\/voice$/i, ''),
    inworldUrl.replace(/\/tts\/v1\/voice$/i, '/tts/v1'),
    'https://api.inworld.ai/tts/v1',
    'https://api.inworld.ai/tts',
    'https://api.inworld.ai',
  ];

  const endpointUrls = [...new Set(baseCandidates.flatMap((base) => [
    `${base.replace(/\/$/, '')}/voices`,
    `${base.replace(/\/$/, '')}/voice`,
    `${base.replace(/\/$/, '')}/v1/voices`,
    `${base.replace(/\/$/, '')}/v1/voice`,
    `${base.replace(/\/$/, '')}/tts/v1/voices`,
    `${base.replace(/\/$/, '')}/tts/v1/voice`,
  ]))];

  const headersPool = buildInworldAuthHeaders();

  for (const endpoint of endpointUrls) {
    for (const headers of headersPool) {
      try {
        const response = await fetch(endpoint, { method: 'GET', headers });
        if (!response.ok) continue;
        const data = await response.json();
        const normalized = parseProviderVoiceList(data);
        if (normalized.length) {
          voices = normalized;
          console.log(`[Inworld] loaded ${voices.length} supported voices from ${endpoint}`);
          return voices;
        }
      } catch (error) {
        continue;
      }
    }
  }

  voices = [...defaultVoiceCatalog];
  return voices;
}

function resolveVoiceForLanguage(language, requestedVoiceId) {
  const normalizedLanguage = normalizeLanguageCode(language);
  const preferredVoice = voices.find((voice) => voice.code === normalizedLanguage && (voice.id === requestedVoiceId || voice.name === requestedVoiceId));
  if (preferredVoice) return preferredVoice;

  const sameLanguageVoice = voices.find((voice) => voice.code === normalizedLanguage);
  if (sameLanguageVoice) return sameLanguageVoice;

  return voices.find((voice) => voice.code === defaultLanguageCode) || voices[0];
}

const authPayload = (user) => ({ id: user.id, name: user.name, email: user.email });

function issueToken(user) {
  return jwt.sign(authPayload(user), jwtSecret, { expiresIn: '7d' });
}

function setAuthCookie(res, user) {
  res.cookie('echo_auth', issueToken(user), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function optionalUser(req, _res, next) {
  const token = req.cookies.echo_auth;
  if (token) {
    try { req.user = jwt.verify(token, jwtSecret); } catch { req.user = null; }
  }
  next();
}

const authSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().email().max(120).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

const speechSchema = z.object({
  text: z.string().trim().min(1, 'Enter some text first.').max(maxCharacters),
  voice: z.string().min(1),
  language: z.string().min(1),
  format: z.enum(['MP3', 'WAV']).default('MP3'),
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(optionalUser);

const speechLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many generations. Please wait a minute and try again.' } });

app.get('/health', (_req, res) => res.status(200).json({ success: true, message: 'Echo server is healthy', timestamp: new Date().toISOString() }));
app.get('/api/config', (_req, res) => res.json({ maxCharacters, formats: ['MP3', 'WAV'] }));
app.get('/api/voices', async (_req, res) => {
  const currentVoices = await loadDynamicVoices();
  return res.json({
    voices: currentVoices,
    languages: [...new Map(currentVoices.map((voice) => [voice.code, { name: voice.language, code: voice.code }])).values()],
  });
});

app.get('/api/auth/me', (req, res) => res.json({ user: req.user || null }));

app.post('/api/auth/register', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.name) return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required.' });
  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
    setAuthCookie(res, user);
    return res.status(201).json({ user: authPayload(user) });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Unable to create your account right now.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = authSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    setAuthCookie(res, user);
    return res.json({ user: authPayload(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

app.post('/api/auth/logout', (_req, res) => { res.clearCookie('echo_auth'); res.status(204).end(); });

app.get('/api/history', async (req, res) => {
  if (!req.user) return res.json({ generations: [] });
  const generations = await prisma.speechGeneration.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, text: true, language: true, voice: true, format: true, createdAt: true } });
  res.json({ generations });
});

app.post('/api/speech', speechLimiter, async (req, res) => {
  const parsed = speechSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid speech request.' });

  const resolvedVoices = await loadDynamicVoices();
  const requestedVoice = resolveVoiceForLanguage(parsed.data.language, parsed.data.voice);
  const fallbackVoice = resolveVoiceForLanguage(defaultLanguageCode, 'Ashley');
  const voiceAttempts = [requestedVoice, fallbackVoice].filter((voice, index, list) => list.findIndex((candidate) => candidate.id === voice.id && candidate.code === voice.code) === index);

  if (!process.env.INWORLD_API_KEY) return res.status(503).json({ error: 'TTS service is not configured. Add INWORLD_API_KEY to the server environment.' });

  try {
    let providerResponse;
    let activeVoice = requestedVoice;
    let lastError = null;

    for (const voice of voiceAttempts) {
      const payload = {
        modelId: process.env.INWORLD_MODEL_ID || 'inworld-tts-2',
        text: parsed.data.text,
        voiceId: voice.id,
        language: voice.code,
        audioConfig: {
          audioEncoding: parsed.data.format === 'WAV' ? 'LINEAR16' : 'MP3',
          sampleRateHertz: 24000,
        },
      };

      providerResponse = await fetch(process.env.INWORLD_TTS_URL || 'https://api.inworld.ai/tts/v1/voice', {
        method: 'POST',
        headers: { Authorization: `Basic ${process.env.INWORLD_API_KEY}`, 'Content-Type': 'application/json' },
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
    if (contentType.includes('audio/')) audio = Buffer.from(await providerResponse.arrayBuffer()).toString('base64');
    else {
      const payload = await providerResponse.json();
      audio = payload.audioContent || payload.audio_content || payload.audio || payload.result?.audioContent;
    }

    if (!audio) return res.status(502).json({ error: 'The speech provider returned no audio.' });
    if (req.user) await prisma.speechGeneration.create({ data: { text: parsed.data.text, language: activeVoice.code, voice: activeVoice.name, format: parsed.data.format, userId: req.user.id } });
    return res.json({ audio: `data:audio/${parsed.data.format === 'WAV' ? 'wav' : 'mpeg'};base64,${audio}`, format: parsed.data.format, voice: activeVoice.name, language: activeVoice.code });
  } catch (error) {
    console.error('Speech error:', error);
    return res.status(502).json({ error: 'Speech generation failed. Please check your connection and try again.' });
  }
});

app.use((error, _req, res, _next) => { console.error('Unhandled server error:', error); res.status(500).json({ error: 'Something went wrong on the server.' }); });

const server = app.listen(port, () => console.log(`Echo server listening on port ${port}`));
process.on('SIGTERM', async () => { server.close(); await prisma.$disconnect(); });