# YouTube AI Studio

AI-powered tools to help you create, optimize, and grow on YouTube.

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

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

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- ESLint + Prettier

## Project Structure

```
src/
  app/            # App Router routes and layouts
  components/
    layout/       # Layout components (header, footer)
    ui/           # shadcn/ui components
  config/         # Site configuration
  features/       # Feature-based modules (future)
  hooks/          # Shared React hooks (future)
  lib/            # Utilities and constants
  types/          # Shared TypeScript types (future)
```
