# YouTube AI Studio

AI-powered tools to help you create, optimize, and grow on YouTube.

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables and set AUTH_SECRET
cp .env.example .env

# Generate a secure auth secret (or set it manually in .env)
npx auth secret

# Create the SQLite database from the Prisma schema
npm run db:push

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start the development server     |
| `npm run build`        | Build the project for production |
| `npm run start`        | Start the production server      |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format code with Prettier        |
| `npm run format:check` | Check formatting with Prettier   |
| `npm run typecheck`    | Run the TypeScript type checker  |
| `npm run db:push`      | Sync the Prisma schema to the DB |
| `npm run db:studio`    | Open Prisma Studio               |

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [NextAuth.js (Auth.js)](https://authjs.dev) — credentials-based authentication
- [Prisma](https://prisma.io) + SQLite — user storage
- ESLint + Prettier

## Authentication

Email/password sign up and sign in with NextAuth.js (JWT sessions) and a
Prisma-backed `User` model. The `/dashboard` area is protected via
`src/middleware.ts`; unauthenticated visitors are redirected to `/login`.

- `/signup` — create an account
- `/login` — sign in
- `/dashboard` — protected workspace (logout available in the header)

Environment configuration lives in `.env` (see `.env.example`).

## Project Structure

```
src/
  app/            # App Router routes and layouts
  components/
    auth/         # Login, signup, and logout components
    layout/       # Layout components (header, footer, dashboard nav)
    ui/           # shadcn/ui components
  config/         # Site configuration
  features/       # Feature-based modules (auth actions live under features/auth)
  hooks/          # Shared React hooks (future)
  lib/            # Utilities, validations, and Prisma client
  types/          # Shared TypeScript types
prisma/
  schema.prisma   # User model
```
