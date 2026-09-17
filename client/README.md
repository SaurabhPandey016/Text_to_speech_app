# Echo Client

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.4-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
</div>

The frontend experience for Echo is a premium audio studio interface designed for rapid text-to-speech generation, clean controls, and polished user flow.

## What the client does

- Renders the immersive voice studio UI
- Lets users enter or paste text for conversion
- Shows provider-backed language and voice options
- Allows format selection and audio generation
- Displays generated audio playback controls
- Supports sign-in and account handling through the shared backend

## Core files

- `src/app/page.tsx` — main voice studio UI
- `src/app/globals.css` — full visual system and premium styling
- `src/app/layout.tsx` — app shell and page metadata

## Running locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:10000
```

## Notes

The client is intentionally designed to feel polished and product-like, with structured sections, premium dark visuals, and a minimal friction workflow.

## Build

```bash
npm run build
```

This ensures the Next.js app is production-ready before deployment.
