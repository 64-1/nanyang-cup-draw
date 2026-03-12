# Nanyang Cup Group Draw

Standalone React + Vite app for group draw, reveal animation, and round-robin fixture generation.

## Local run

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

## Share on the same Wi-Fi / local network

Start Vite in host mode:

```bash
npm run dev:host
```

Vite will print a local network URL such as:

```bash
http://192.168.1.23:5173
```

Anyone on the same network can open that URL.

Notes:

- Your firewall may ask for permission the first time.
- This is for temporary sharing during testing.
- The app stops being accessible when your laptop sleeps or the dev server stops.

## Production build

Create the static production files:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Or preview it on your local network:

```bash
npm run preview:host
```

## Publish for public access

The easiest option is Vercel.

This project already includes [vercel.json](/Users/floraliu/Documents/Projects/WZRY/website/nanyang-cup-draw/vercel.json), so build settings are explicit.

### Option 1: Vercel dashboard

1. Push this folder to GitHub.
2. Go to Vercel and import the repository.
3. Set the project root to `nanyang-cup-draw` if the repo contains other folders.
4. Vercel will use the checked-in config automatically.
5. Deploy.

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

For production deployment:

```bash
vercel --prod
```

## Current stack

- React
- Vite
- Tailwind CSS v4
- Framer Motion
- Lucide React
- shadcn-style UI components
