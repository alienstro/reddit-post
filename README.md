# Reddit Post Frontend

Next.js frontend for reading Reddit hot posts and top comments through the local Django backend. It also includes an in-browser WebLLM summarizer that can summarize the selected post and comments using the user's device.

## What It Does

- Loads hot posts from a subreddit.
- Shows the selected post, image preview when available, top comments, and nested replies.
- Supports pinned communities for logged-in Django users.
- Uses the old Reddit JSON flow through the Django backend instead of Reddit OAuth.
- Runs local AI summaries in the browser with `@mlc-ai/web-llm` and WebGPU.
- Lets users choose compatible MLC models, cache models in the browser, clear cache, and tune summary generation settings.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- `@mlc-ai/web-llm`

## Project Structure

```text
app/
  api/                 Next.js API proxy routes to Django
  application/         Pure app/use-case logic
  components/          UI components
  domain/              TypeScript domain types
  infrastructure/      Django fetch/proxy adapters
  page.tsx             Thin route wrapper
```

## Requirements

- Node.js compatible with Next.js 16
- The Django backend running locally, usually at `http://localhost:8000`
- Chrome, Edge, or another browser with WebGPU support for local AI summaries

## Setup

Install dependencies:

```bash
npm install
```

Optional environment variable:

```bash
DJANGO_API_BASE_URL=http://localhost:8000
```

If this variable is not set, the frontend defaults to `http://localhost:8000`.

## Start Development Server

Start the Django backend first, then run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build And Run Production

```bash
npm run build
npm run start
```

## Useful Commands

```bash
npm run lint
npm run build
```

## Local AI Summary Notes

The AI summary feature runs in the browser using WebLLM. The first model load downloads model files into browser storage. Later loads can reuse the browser cache.

If WebGPU fails:

- Use Chrome or Edge first.
- Enable browser hardware acceleration.
- Check `chrome://gpu` or `brave://gpu`.
- Prefer smaller `q0f32` or `q4f32` MLC models.
- Use `Check WebGPU` in the AI panel to inspect browser support.

Changing the context size requires loading the model again because WebLLM applies context settings during model initialization.

## Backend Dependency

The frontend expects these backend routes:

- `GET /api/reddit/hot/`
- `GET /api/reddit/comments/`
- `GET /api/auth/me/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/reddit/pins/`
- `POST /api/reddit/pins/`
- `DELETE /api/reddit/pins/<id>/`

