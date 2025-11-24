# CLAUDE.md

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
- Dual execution modes:
  - **Cloud Mode (REPL)**: Hopx sandbox, SSE streaming, command-line buffering
  - **Local Mode (PTY)**: Native shell via node-pty, WebSocket streaming, raw terminal
- Terminal Emulator: xterm.js with GPU acceleration (WebGL)
- Advanced Features:
  - Unicode 11 support (emoji, CJK, RTL)
  - Inline images (sixel, iTerm2 protocol)
  - OSC sequence handlers (shell integration ready)
  - Session health checks and reconnection
  - Terminal size validation (10x2 to 1000x1000)

**Local Terminal** (`localTerminal.service.ts`):
- PTY process spawning via node-pty
- Shell detection (zsh, bash, fish, PowerShell, cmd)
- Login shell mode (-l -i) for proper profile loading
- Environment variable whitelisting (security)
- Session management with 30min timeout
- WebSocket streaming for low latency
- Health check endpoint for session validation
- Graceful shutdown (SIGTERM → SIGKILL)

**Cloud Terminal** (`terminalSessionManager.ts`):
- Isolated Hopx sandbox per session
- SSE for real-time streaming
- Heartbeat: 30s
- Tracks: working dir + env vars
- Uses `sandbox.commands.run()` with `workingDir`
- Uses `sandbox.env.update()` for persistence

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

**Code Execution:**
- `POST /api/execute` - Execute code
- `GET /api/sandbox/health` - Health check
- `POST /api/sandbox/recreate` - Force recreate
- `POST /api/sandbox/destroy` - Destroy sandbox

**Cloud Terminal:**
- `POST /api/terminal/sessions` - Create session
- `GET /api/terminal/sessions/:id` - Get session
- `DELETE /api/terminal/sessions/:id` - Delete session
- `POST /api/terminal/sessions/:id/execute` - Execute command
- `GET /api/terminal/sessions/:id/stream` - SSE stream

**Local Terminal:**
- `WS /api/terminal/local/ws/:sessionId?` - WebSocket connection (creates or reconnects)
- `GET /api/terminal/local/health` - Check if local terminal is available
- `GET /api/terminal/local/sessions/:sessionId/health` - Check specific session health

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

### Progressive Web App (PWA)
- **Installability**: App can be installed on desktop browsers (Chrome, Edge, Safari)
- **Offline Support**: 
  - Notes can be viewed and edited offline (stored in localStorage)
  - Code execution requests are queued when offline
  - Queued executions automatically process when connection is restored
- **Service Worker**: 
  - Auto-updates with notification
  - Caches static assets (cache-first)
  - Caches API health checks (network-first with fallback)
  - Code execution endpoints use network-only (queue when offline)
- **Install Prompt**: 
  - Non-intrusive glass morphism modal
  - Appears when app is installable
  - Dismissible with localStorage persistence
- **Offline Indicator**: 
  - Shows when app is offline
  - Displays count of queued executions
  - Positioned top-right (non-intrusive)
- **Manifest**: 
  - Generated automatically by vite-plugin-pwa
  - Icons auto-generated from favicon.svg
  - Theme colors match dark mode (stone-900)
  - Standalone display mode for desktop app experience


## Contributing

1. Fork repository
2. Create feature branch
3. Make changes + test
4. Run `npm run lint` and `npm test`
5. Commit with conventional format
6. Submit PR

See CONTRIBUTING.md for detailed guidelines.

# Design

Remember - You must focus on a design puts the human and their task first: interfaces must be immediately understandable, with simple layouts, obvious actions, and no extra clutter.   Visually, it uses strong hierarchy (clear titles, grouped sections, disciplined spacing and type) and restrained color so that content stands out while chrome stays quiet.   It uses layers, motion, and depth to explain where things are and what just happened, so transitions and animations teach structure instead of being decoration.   Underneath, it’s about consistency and respect: familiar patterns across devices, fast and precise feedback, strong accessibility, and always leaving the user in control of what happens.

- remember to always run lint -> build -> test:coverage (with code coverage >=80%)
-> npm test. no code modification should exist wihout full lint -> build -> test:coverage -> test before claiming completion. if anything fails in this phases, such as test requiring updates, it is not enough to only rerun tests, but you need to rerun linting first, then build all, then test all with the expected test coverage threshold (>=80%)%
- each visual change MUST be visually inspected using an MCP tool provided (e.g, playwright, browseros, or similar - feel free to reconfigure as needed) for both UX and UI. Each element must be perfectly integrated, fit, composed, designed, aligned, colored, smoothly placed and beautifully aligned with our product vision and end users. After achieving perfect results, you must update the playwright tests (npm test) to end-to-end test the introduced now stable changes to foster repetability and maintainability of visual changes.
