import dotenv from 'dotenv';

dotenv.config();

const normalizeAllowedOrigins = () => {
  const configured = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];

  return [...new Set([...configured, ...defaults])];
};

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  allowedOrigins: normalizeAllowedOrigins(),
  jwtSecret: process.env.JWT_SECRET || 'local-development-secret-change-me',
  maxCharacters: Number(process.env.MAX_CHARACTERS) || 5000,
  inworldApiKey: process.env.INWORLD_API_KEY || '',
  inworldTtsUrl: process.env.INWORLD_TTS_URL || 'https://api.inworld.ai/tts/v1/voice',
  inworldModelId: process.env.INWORLD_MODEL_ID || 'inworld-tts-2',
  nodeEnv: process.env.NODE_ENV || 'development',
};
