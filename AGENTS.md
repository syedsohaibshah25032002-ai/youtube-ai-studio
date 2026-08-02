# Project

YouTube AI Studio — AI-powered tools for YouTube creators.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui
- ESLint (flat config) + Prettier

## Commands

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type check
- `npm run format` — Prettier write
- `npm run format:check` — Prettier check

## Conventions

- App Router under `src/app`, components under `src/components`
- Path alias `@/*` maps to `src/*`
- Prefer server components; use `"use client"` only when interactivity is required
