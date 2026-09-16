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

const voices = [
  { id: 'Ashley', name: 'Ashley', language: 'English', code: 'en-US', style: 'Warm and clear' },
  { id: 'Dennis', name: 'Dennis', language: 'English', code: 'en-US', style: 'Confident and steady' },
  { id: 'Luna', name: 'Luna', language: 'Spanish', code: 'es-ES', style: 'Expressive and bright' },
  { id: 'Priya', name: 'Priya', language: 'Hindi', code: 'hi-IN', style: 'Natural and friendly' },
  { id: 'Neel', name: 'Neel', language: 'Gujarati', code: 'gu-IN', style: 'Warm and conversational' },
  { id: 'Ananya', name: 'Ananya', language: 'Marathi', code: 'mr-IN', style: 'Smooth and articulate' },
  { id: 'Claire', name: 'Claire', language: 'French', code: 'fr-FR', style: 'Elegant and precise' },
  { id: 'Greta', name: 'Greta', language: 'German', code: 'de-DE', style: 'Balanced and composed' },
];

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
app.get('/api/voices', (_req, res) => res.json({ voices, languages: [...new Map(voices.map((voice) => [voice.code, { name: voice.language, code: voice.code }])).values()] }));

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
  const selectedVoice = voices.find((voice) => voice.id === parsed.data.voice && voice.code === parsed.data.language);
  if (!selectedVoice) return res.status(400).json({ error: 'That voice is not available for the selected language.' });
  if (!process.env.INWORLD_API_KEY) return res.status(503).json({ error: 'TTS service is not configured. Add INWORLD_API_KEY to the server environment.' });
  try {
    const response = await fetch(process.env.INWORLD_TTS_URL || 'https://api.inworld.ai/tts/v1/voice', { method: 'POST', headers: { Authorization: `Basic ${process.env.INWORLD_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: process.env.INWORLD_MODEL_ID || 'inworld-tts-1.5-max', text: parsed.data.text, voiceId: selectedVoice.id, audioConfig: { audioEncoding: parsed.data.format, sampleRateHertz: 24000 } }) });
    if (!response.ok) {
      const details = await response.text();
      console.error('Inworld error:', response.status, details.slice(0, 500));
      return res.status(502).json({ error: 'The speech provider rejected the request. Check the provider key and voice configuration.' });
    }
    const contentType = response.headers.get('content-type') || '';
    let audio;
    if (contentType.includes('audio/')) audio = Buffer.from(await response.arrayBuffer()).toString('base64');
    else {
      const payload = await response.json();
      audio = payload.audioContent || payload.audio_content || payload.audio || payload.result?.audioContent;
    }
    if (!audio) return res.status(502).json({ error: 'The speech provider returned no audio.' });
    if (req.user) await prisma.speechGeneration.create({ data: { text: parsed.data.text, language: parsed.data.language, voice: selectedVoice.name, format: parsed.data.format, userId: req.user.id } });
    return res.json({ audio: `data:audio/${parsed.data.format === 'WAV' ? 'wav' : 'mpeg'};base64,${audio}`, format: parsed.data.format, voice: selectedVoice.name });
  } catch (error) {
    console.error('Speech error:', error);
    return res.status(502).json({ error: 'Speech generation failed. Please check your connection and try again.' });
  }
});

app.use((error, _req, res, _next) => { console.error('Unhandled server error:', error); res.status(500).json({ error: 'Something went wrong on the server.' }); });

const server = app.listen(port, () => console.log(`Echo server listening on port ${port}`));
process.on('SIGTERM', async () => { server.close(); await prisma.$disconnect(); });