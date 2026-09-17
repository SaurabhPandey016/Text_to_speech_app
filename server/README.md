# Echo Server

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
</div>

The server is the secure backend layer for Echo, responsible for authentication, validation, database access, and text-to-speech generation through the Inworld API.

## Responsibilities

- auth and session handling
- input validation with Zod
- rate limiting and security middleware
- Prisma integration for user and generation records
- provider-backed voice metadata resolution
- TTS generation orchestration

## Main endpoints

- `GET /health` — service status
- `GET /api/config` — platform config
- `GET /api/voices` — provider-backed voice list
- `GET /api/auth/me` — current user
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — sign in
- `POST /api/auth/logout` — sign out
- `GET /api/history` — recent generations
- `POST /api/speech` — generate audio output

## Local setup

```bash
npm install
npx prisma migrate deploy
npm run dev
```

## Environment variables

```env
PORT=10000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-secret
MAX_CHARACTERS=5000
INWORLD_API_KEY=your_key
INWORLD_TTS_URL=https://api.inworld.ai/tts/v1/voice
INWORLD_MODEL_ID=inworld-tts-2
```

## Security

- cookie-based auth using JWT
- CORS restricted to client domain
- request validation for all user payloads
- rate limiting on generation endpoints
- provider credentials stored only in env

## Development notes

This service is designed to behave like a production API: it validates provider responses, handles auth state, stores user data responsibly, and avoids hardcoded UI assumptions.

## Start command

```bash
npm run start
```

This launches the app in standard production mode.
