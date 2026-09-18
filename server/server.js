import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

import { env } from './src/config/environment.js';
import router from './src/routes/index.js';

const app = express();

const allowlist = new Set(env.allowedOrigins);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowlist.has(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use((req, _res, next) => {
  const token = req.cookies?.echo_auth;
  if (token) {
    try {
      req.user = jwt.verify(token, env.jwtSecret);
    } catch {
      req.user = null;
    }
  }
  next();
});

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many generations. Please wait a minute and try again.' },
}));

app.use(router);

app.use((error, _req, res, _next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const server = app.listen(env.port, () => {
  console.log(`Echo server listening on port ${env.port}`);
});

process.on('SIGTERM', async () => {
  server.close();
  process.exit(0);
});