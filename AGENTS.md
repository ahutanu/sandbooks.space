# AGENTS.md

Guidance for Claude Code and AI agents working with this repository.

## Project Overview

Sandbooks is a notes-first application combining a simple, clean UX with executable code snippets powered by cloud sandboxes. Monorepo with React frontend (Vite + TipTap) and Node.js backend (Express + Hopx SDK).

**Live Demo**: https://sandbooks.space

## Project Structure

**Frontend** (`src/`):
- `components/` - React components (Editor, Sidebar, Terminal, Tags, UI)
- `store/` - Zustand state management (`notesStore.ts`)
- `services/` - API services (`hopx.ts`, `terminal.ts`, `storage.ts`)
- `utils/` - Helper utilities
- `types/` - TypeScript type definitions

**Backend** (`backend/src/`):
- `routes/` - Express route handlers
- `controllers/` - Request handlers
- `services/` - Business logic (`hopx.service.ts`, `terminalSessionManager.ts`)
- `middleware/` - Auth, logging, validation, SSE
- `config/` - CORS, environment config

**Tests** (`tests/`):
- Playwright E2E tests (`*.spec.ts`)
- Test artifacts in `test-results/`, `playwright-report/`

**Config Files**:
- `vite.config.ts`, `playwright.config.ts`, `tailwind.config.js`
- `eslint.config.js`, `tsconfig*.json`
- `.env.example`, `backend/.env.example`

## Common Commands

```bash
# Development
npm start              # Start backend (3001) + frontend (5173)
npm run frontend:dev   # Frontend only (waits for backend)
npm run backend:dev    # Backend only (ts-node)
npm run lint           # ESLint frontend + backend
npm run format         # Auto-fix lint issues

# Building
npm run build          # Build frontend
npm run build:all      # Build frontend + backend

# Testing
npm test               # Playwright E2E (headless)
npm run test:ui        # Playwright UI runner
npm run test:headed    # Playwright visible browser
```

Install dependencies: `npm install && cd backend && npm install`

## Architecture

### State Management (Zustand)

Single global store (`src/store/notesStore.ts`):
- Notes: localStorage-backed (auto-save on mutation)
- Tags: Derived from notes
- Terminal: GLOBAL session model (one per app)
- Sandbox: Ephemeral (not persisted)
- UI: Dark mode, search, shortcuts

### Editor (TipTap 2.11+)

- Custom `ExecutableCodeBlock` node (`src/components/Editor/executableCodeBlockExtension.ts`)
- CodeMirror 6 embedded via `prosemirror-codemirror-block`
- Slash commands: `/code`, `/terminal`, etc.
- React NodeViewRenderer for code blocks

### Code Execution Flow

1. User clicks "Run" button
2. Store calls `executeCodeBlock(noteId, blockId)`
3. Auto-heal sandbox if needed
4. POST to `/api/execute` via `hopx.ts`
5. Backend executes in Hopx sandbox
6. Results stream back to frontend
7. Store updates code block

### Terminal Architecture

- Quake-style overlay (toggle: `Cmd+\``)
- GLOBAL session (single session per app)
- Initialized on mount (`initializeGlobalTerminalSession()`)
- Backend: Isolated sandbox per session
- SSE for real-time streaming
- Persists: working directory + env vars

### Backend Services

**Hopx Service** (`hopx.service.ts`):
- Singleton managing shared sandbox for code execution
- Health check caching (30s)
- Auto-recovery: 2-level retry (2s → 5s delay)
- Error classification: transient, corruption, network, timeout, auth, expired
- Proactive refresh (5 min before TTL)
- Sandbox TTL: 1 hour

**Terminal Sessions** (`terminalSessionManager.ts`):
- Isolated sandbox per session
- Session timeout: 30 min inactivity
- Cleanup: every 5 min
- Heartbeat: 30s
- Tracks: working dir + env vars
- Uses `sandbox.commands.run()` with `workingDir`
- Uses `sandbox.env.update()` for persistence

### API Routes

- `POST /api/execute` - Execute code
- `GET /api/sandbox/health` - Health check
- `POST /api/sandbox/recreate` - Force recreate
- `POST /api/sandbox/destroy` - Destroy sandbox
- `POST /api/terminal/sessions` - Create session
- `GET /api/terminal/sessions/:id` - Get session
- `DELETE /api/terminal/sessions/:id` - Delete session
- `POST /api/terminal/sessions/:id/execute` - Execute command
- `GET /api/terminal/sessions/:id/stream` - SSE stream

## Environment Variables

**Frontend** (`.env`):
```bash
VITE_API_URL=http://localhost:3001
# Optional: VITE_API_TOKEN=change_me_for_production
```

**Backend** (`backend/.env`):
```bash
HOPX_API_KEY=your_key_here              # Required
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
# Optional: API_ACCESS_TOKEN=change_me_for_production
# Optional: RATE_LIMIT_WINDOW_MS=60000
# Optional: RATE_LIMIT_MAX_REQUESTS=120
```

## Tech Stack

**Frontend**: React 18.3, TypeScript 5.6, Vite 6.0, TipTap 2.11+, TailwindCSS 3.4, Zustand 5.0, xterm.js 5.5, CodeMirror 6

**Backend**: Node.js 20+, TypeScript 5.6, Express 4.x, Hopx SDK 0.3.3+, Winston 3.x, Zod 3.x

## Coding Standards

### TypeScript
- Strict mode enabled (no `any`)
- Prefer interfaces over types
- Explicit types for all functions
- 2-space indentation, single quotes

### React
- Functional components only
- Hooks pattern
- Small, focused components
- Zustand for shared state
- `PascalCase.tsx` for components
- `camelCase.ts` for utilities
- `useThing.ts` for hooks
- `UPPER_SNAKE_CASE` for constants

### Styling
- TailwindCSS utility classes only
- Dark mode required (`dark:` classes)
- Mobile-first responsive design
- Avoid custom CSS

### Testing
- E2E tests in `tests/*.spec.ts`
- Descriptive test names
- Use Playwright fixtures
- Run `npm test` before PRs
- Add regression tests for bugs

## Commit Guidelines

Use Conventional Commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructure
- `test:` - Tests
- `chore:` - Maintenance

Example: `feat(editor): add syntax highlighting toggle`

## Before Committing

1. `npm run lint` - Must pass (max-warnings=0)
2. `npm run build:all` - Must succeed
3. `npm test` - All tests pass
4. TypeScript compiles with no errors

## Security

- Never commit secrets
- Copy `.env.example` → `.env`
- Keep API keys in env vars only
- CORS configured in `backend/src/config/cors.ts`
- Optional API token auth via `API_ACCESS_TOKEN`
- Rate limiting configurable

## Important Notes

### Code Execution
- TypeScript compiled to JavaScript (no TS runtime)
- Languages: Python, JavaScript, TypeScript, Bash, Go
- Timeout: 30 seconds
- Auto-recreates on errors

### Terminal Sessions
- Isolated sandbox per session
- Working dir persists via session state
- `export VAR=value` persists via `sandbox.env.update()`
- `cd` updates session state
- 30-min inactivity timeout

### State Persistence
- Notes: localStorage (auto-save)
- Tags: Derived, Zustand global
- Terminal: Ephemeral sessions
- Sandbox: Not persisted

### Error Handling
- Backend classifies errors
- Auto-retry: exponential backoff
- Auto-recreate: corruption/auth/expiry
- User-friendly toasts

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes + test
4. Run `npm run lint` and `npm test`
5. Commit with conventional format
6. Submit PR

See CONTRIBUTING.md for detailed guidelines.
