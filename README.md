# Echo — AI Voice Studio

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.4-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Inworld-TTS-FFD95A?style=for-the-badge" alt="Inworld" />
</div>

A premium text-to-speech product experience for creators, students, teams, and brands who need fast, polished voice generation from written content.

Echo combines a modern Next.js frontend, a secure Express API, Prisma-powered persistence, and a provider-driven TTS layer to deliver a smooth, production-style audio generation workflow.

## Why this project matters

- Converts written text into natural-sounding voice output
- Keeps the UX focused on speed, clarity, and premium presentation
- Uses provider-verified voice metadata instead of hardcoded fake language lists
- Includes auth, history tracking, and safe generation workflows
- Built to showcase a real-world AI product architecture for interviews and portfolio review

## Product highlights

- Responsive SaaS-style interface
- Voice + language tuning controls
- Audio preview and MP3 export
- User auth with session cookies
- Recent generation history support
- Rate-limited speech generation endpoint
- Provider-driven voice catalog loading

## Stack

- Frontend: Next.js 16, React 19, TypeScript
- Backend: Express.js, Node.js
- Database: PostgreSQL via Prisma + Supabase
- TTS provider: Inworld AI
- Security: JWT cookies, Helmet, CORS, Zod validation, rate limiting

## Architecture

```text
Client (Next.js)
   └── POST /api/speech
          │
          ▼
Server (Express)
   ├── validates request
   ├── resolves provider voice/language metadata
   ├── calls Inworld TTS API
   ├── stores generation history (if authenticated)
   └── returns audio data URL to browser
```

## Local setup

### 1) Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2) Configure environment variables

Create a `.env` inside the `server` folder with values like:

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

Then create `client/.env.local` if required:

```env
NEXT_PUBLIC_API_URL=http://localhost:10000
```

### 3) Run database migrations

```bash
cd server
npx prisma migrate deploy
```

### 4) Start both apps

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

Open http://localhost:3000

## Important provider behavior

This app is designed to respect the actual provider capability list instead of hardcoding fake language options.

- The server fetches or normalizes provider voice metadata
- The UI only shows language options that the TTS provider exposes
- The selected voice and selected language are matched carefully to avoid mismatches
- The current live Inworld account is validated at runtime, so the app follows the real catalog rather than assumptions

## Production notes

- JWT-authenticated sessions are cookie-based and protected from browser storage misuse
- Input is validated with Zod before generation
- Generated requests are protected with rate limiting
- Provider credentials and DB secrets should never be committed to Git

## Deployment guidance

### Backend deployment

Deploy the server as a Node.js service with:

- `npm install`
- `npx prisma migrate deploy`
- `npm start`

### Frontend deployment

Deploy the Next.js app to Vercel or a similar platform and set:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain
```

Set the backend `CLIENT_URL` to the deployed frontend origin.

## Security checklist

- Keep `.env` files local and ignored by Git
- Rotate keys regularly
- Use a strong `JWT_SECRET`
- Restrict database access and validation rules
- Use HTTPS in production

## Roadmap

- multilingual provider expansion and dynamic voice mapping
- better audio history UX
- user profile improvements
- workspace and team-level TTS usage tracking
- polished admin analytics dashboard

## License

This project is currently for portfolio, demonstration, and internal product exploration.

---

Built with focus on product polish, AI UX, and real-world system thinking.
