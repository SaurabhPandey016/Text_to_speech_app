# Echo

Echo is a responsive text-to-speech studio built with Next.js, Express, Prisma, Supabase PostgreSQL, and Inworld TTS.

## Local setup

1. In `server`, create `.env` from `.env.example` and set your Supabase and Inworld values. PostgreSQL passwords containing `@` must use `%40` in the connection URL.
2. Run the database migration:

```powershell
cd server
npm install
npx prisma migrate deploy
```

3. Start the API:

```powershell
npm run dev
```

4. In a second terminal, create `client/.env.local` from `.env.example`, then start Next:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:3000`.

## Inworld TTS

The app uses Inworld's TTS API at `https://api.inworld.ai/tts/v1/voice`. Find the API key in the [Inworld Studio platform](https://platform.inworld.ai/), under your project API credentials. The key is used only by the Express server. `INWORLD_MODEL_ID` defaults to `inworld-tts-1.5-max`; keep it configurable because available models can change by account.

Echo validates the available voice/language list from the server, sends model/voice/audio configuration to Inworld, accepts the provider's base64 audio response, and returns it to the browser for playback or download.

## Deployment

For Render, deploy `server` as a Node web service with `npm install`, `npx prisma migrate deploy`, and `npm start`. Add the server variables from `server/.env.example`, using the Supabase pooled URL as `DATABASE_URL` and direct URL as `DIRECT_URL`.

For Vercel, deploy `client` as a Next.js project with `NEXT_PUBLIC_API_URL` set to the public Render API URL. Set `CLIENT_URL` on Render to the Vercel URL. Use a long random `JWT_SECRET`, enable HTTPS, and rotate provider/database credentials before production.

## Security notes

- Auth uses JWTs in `httpOnly`, `sameSite` cookies; no browser token or local-storage session is used.
- Speech generation is rate limited and input is validated with Zod.
- `.env` files are ignored by git. Never commit provider or database credentials.
