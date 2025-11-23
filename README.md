# Sandbooks

> A notes-first application for developers combining a simple UX with executable code snippets powered by cloud sandboxes.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

**Live Demo**: [sandbooks.space](https://sandbooks.space)

---

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Screenshots](#-screenshots)
- [Usage](#-usage)
- [Architecture](#-architecture)
- [Development](#-development)
- [Tech Stack](#-tech-stack)
- [Testing](#-testing)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## ✨ Features

### Core Capabilities

- 💻 **Executable Code Blocks**: Run Python, JavaScript, TypeScript, Bash, and Go directly in your notes
- 📝 **Rich Text Editing**: TipTap v3-based editor with comprehensive formatting, tables, media embeds, and more
  - **Text Formatting**: Bold, Italic, Strike, Underline, Highlight, Text Color, Font Family/Size, Superscript/Subscript
  - **Layout**: Text Alignment (Left/Center/Right/Justify), Tables with full editing, Multi-column layouts
  - **Media**: Images, YouTube embeds, Video, Audio, File attachments
  - **Interactive**: @Mentions, Character Count, BubbleMenu, FloatingMenu
  - **Smart Features**: Typography (smart quotes, dashes), TrailingNode, Gapcursor, Dropcursor
- 🔍 **Global Search**: Instant search with `/` or `Cmd+K` (keyboard navigable)
- ⌨️ **Keyboard Shortcuts**: 40+ shortcuts organized by category (press `?` to view all)
- 🌙 **Dark Mode**: Complete dark theme with system preference detection
- 📱 **Mobile Responsive**: Hamburger menu, slide-in sidebar, touch-optimized UI
- ♿ **Accessibility**: WCAG 2.1 AA compliant (keyboard navigation, screen reader support)
- 💾 **Local-First**: Notes stored in browser localStorage with export/import
- ☁️ **Cloud Execution**: Secure sandboxed execution via [Hopx SDK](https://hopx.ai)
- 🖥️ **Integrated Terminal**: Quake-style terminal with persistent sessions
- 🏷️ **Tag System**: Color-coded tags with search integration
- 🎨 **Glass Morphism**: Modern UI with backdrop blur effects

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher
- **Hopx API Key** (sign up at [hopx.ai](https://hopx.ai))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ahutanu/sandbooks.space.git
cd sandbooks

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Configure environment variables
cp .env.example .env
cp backend/.env.example backend/.env

# 4. Add your Hopx API key to backend/.env
# HOPX_API_KEY=your_actual_key_here
# (Optional) Lock down API access:
# API_ACCESS_TOKEN=change_me_for_production
# Adjust rate limiting if needed:
# RATE_LIMIT_WINDOW_MS=60000
# RATE_LIMIT_MAX_REQUESTS=120

# 5. Start both frontend and backend
npm start
```

**Access the application**:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

---

## 📸 Screenshot

![Sandbooks - Executable code in your notes](screenshot.png)

---

## 📖 Usage

### Creating Notes

1. Click **"+ New Note"** or press `c`
2. Start typing - the first line becomes the title automatically
3. Use the toolbar for formatting (bold, italic, headings, lists)

### Adding Code Blocks

1. Click **"</> Code"** button or type `/code`
2. Select language (Python, JavaScript, TypeScript, Bash, Go)
3. Write your code
4. Click **"▶ Run"** to execute (requires cloud execution enabled)

### Import & Export

1. **Import Markdown**: Click the Sync icon in the header -> "Import Markdown Note" to load existing `.md` files.
2. **Local Sync**: Click "Open Folder" in the sidebar to sync your notes directly with a folder on your computer.
3. **Export**: Click "Export Notes" in the Sync menu to download all notes as JSON.

### Keyboard Shortcuts

Press `?` to see all shortcuts, or use these common ones:

**Quick Actions** (when not typing):
- `c` - Create new note
- `/` - Search notes
- `?` - Show all shortcuts

**Power User**:
- `Cmd+Alt+N / Ctrl+Alt+N` - Create new note (Global)
- `Cmd+K / Ctrl+K` - Search (VS Code style) or Insert Link (in editor)
- `Cmd+\ / Ctrl+\` - Toggle sidebar
- `Ctrl+`` - Toggle terminal (Global)
- `Cmd+Enter / Ctrl+Enter` - Run code block
- `Cmd+B / Ctrl+B` - Bold
- `Cmd+I / Ctrl+I` - Italic
- `Cmd+U / Ctrl+U` - Underline
- `Cmd+Shift+C / Ctrl+Shift+C` - Text color
- `Cmd+Shift+X / Ctrl+Shift+X` - Highlight color
- `Cmd+Shift+T / Ctrl+Shift+T` - Insert table
- `Cmd+Shift+L/E/R/J / Ctrl+Shift+L/E/R/J` - Align left/center/right/justify
- `Cmd+. / Ctrl+.` - Superscript
- `Cmd+, / Ctrl+,` - Subscript

### Example Code

**Python**:
```python
print("Hello from Sandbooks!")
for i in range(5):
    print(f"Count: {i}")
```

**JavaScript**:
```javascript
console.log("JavaScript works too!");
const sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0);
console.log("Sum:", sum);
```

**TypeScript**:
```typescript
const greet = (name: string): string => {
  return `Hello, ${name}!`;
};
console.log(greet("Sandbooks"));
```

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │  HTTP   │   Backend   │   SDK   │    Hopx     │
│  (React UI) │ ──────> │  (Node.js)  │ ──────> │  Sandboxes  │
└─────────────┘         └─────────────┘         └─────────────┘
```

**Frontend**: React 18, TypeScript, TipTap, TailwindCSS v4, Zustand
**Backend**: Node.js 20+, Express, Hopx SDK, TypeScript
**Execution**: Isolated cloud sandboxes (Python, JS, TS, Bash, Go)

### Project Structure

```
sandbooks/
├── src/                 # Frontend React application
│   ├── components/     # React components
│   │   ├── Editor/    # TipTap editor + code blocks
│   │   ├── Sidebar/   # Note list + search
│   │   ├── Terminal/  # Terminal emulator
│   │   └── Tags/      # Tag system
│   ├── store/          # Zustand state management
│   ├── services/       # API services
│   └── utils/          # Helper utilities
├── backend/            # Node.js Express backend
│   └── src/
│       ├── routes/     # API endpoints
│       ├── services/   # Business logic
│       └── types/      # TypeScript types
├── tests/              # Playwright E2E tests
└── test-results/       # Playwright artifacts
```

---

## 🚀 Development

### Available Scripts

```bash
npm start              # Start both frontend and backend
npm run dev            # Same as start
npm run lint           # Lint frontend + backend
npm run backend:dev    # Backend only
npm run frontend:dev   # Frontend only (waits for backend)
npm run build          # Build frontend for production
npm run build:all      # Build both frontend and backend
npm test               # Run E2E tests (Playwright)
npm run test:ui        # Run tests with UI
npm run test:headed    # Run tests in headed mode (watch browser)
```

### Quality Gates

- `npm run lint` keeps frontend + backend aligned with the ESLint flat config.
- CI runs lint and build on every push/PR (see `.github/workflows/ci.yml`).

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_API_URL=http://localhost:3001
# Optional: if backend API_ACCESS_TOKEN is set
# VITE_API_TOKEN=change_me_for_production
```

**Backend** (`backend/.env`):
```bash
HOPX_API_KEY=your_key_here    # Required for code execution
PORT=3001                      # Backend server port
FRONTEND_URL=http://localhost:5173  # For CORS
NODE_ENV=development           # Environment
# Optional auth + rate limiting
# API_ACCESS_TOKEN=change_me_for_production
# RATE_LIMIT_WINDOW_MS=60000
# RATE_LIMIT_MAX_REQUESTS=120
```

---

## 📦 Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://reactjs.org/) | 18.3 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.6 | Type safety |
| [Vite](https://vitejs.dev/) | 6.0 | Build tool & dev server |
| [TipTap](https://tiptap.dev/) | 3.11+ | Rich text editor (ProseMirror) with full v3 features |
| [TailwindCSS](https://tailwindcss.com/) | 3.4 | Utility-first CSS |
| [Zustand](https://github.com/pmndrs/zustand) | 5.0 | State management |
| [xterm.js](https://xtermjs.org/) | 5.5 | Terminal emulator |
| [highlight.js](https://highlightjs.org/) | 11.11 | Syntax highlighting |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Node.js](https://nodejs.org/) | 20+ | Runtime |
| [Express](https://expressjs.com/) | 4.x | HTTP server |
| [Hopx SDK](https://hopx.ai) | 0.3.3 | Cloud sandbox execution |
| [TypeScript](https://www.typescriptlang.org/) | 5.6 | Type safety |
| [Winston](https://github.com/winstonjs/winston) | 3.x | Logging |

---

## 🧪 Testing

Sandbooks uses [Playwright](https://playwright.dev/) for end-to-end testing.

### Running Tests

```bash
# Run all tests
npm test

# Run with browser UI (interactive mode)
npm run test:ui

# Run in headed mode (watch browser execution)
npm run test:headed
```

### Test Coverage

- ✅ Code execution (all 5 languages)
- ✅ Rich text editing (formatting, lists, links, tables, media)
- ✅ Terminal sessions (state persistence)
- ✅ Tag system (creation, search, colors)
- ✅ Keyboard shortcuts (40+ shortcuts)
- ✅ Dark mode toggle
- ✅ Mobile responsive layout
- ✅ Search functionality
- ✅ TipTap v3 features (color, alignment, tables, media embeds)

---

## 🔒 Security

Sandbooks prioritizes security with multiple layers of protection:

### Code Execution Security

- **Sandboxed Execution**: All code runs in isolated Hopx containers; terminal sessions receive dedicated sandboxes so state (working directory, env vars) never crosses users.
- **No Local Execution**: Code never runs on your machine
- **Resource Limits**: CPU, memory, and time limits enforced per execution

### Application Security

- **Optional API Token**: Set `API_ACCESS_TOKEN` to require `Authorization: Bearer <token>` or `x-sandbooks-token` on every request.
- **Rate Limiting**: Configurable per-IP limits via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` (defaults 120 req/min).
- **CORS Protection**: Backend only accepts requests from configured origins.
- **XSS Prevention**: TipTap sanitizes all HTML output.
- **Environment Variables**: All secrets managed via environment variables; nothing hardcoded in the repo.

### Reporting Security Issues

If you discover a security vulnerability, please email: **alex@hutanu.net**. Please see [SECURITY.md](SECURITY.md) for the coordinated disclosure policy.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Quick Start for Contributors

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit** with [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, etc.
5. **Push** to your fork and submit a **Pull Request**

### Areas We'd Love Help With

- 🐛 **Bug fixes** - Check open issues
- ♿ **Accessibility improvements** - WCAG compliance enhancements
- 🌍 **Internationalization** (i18n) - Multi-language support
- 📱 **Mobile UX** - Touch interactions and responsive design
- 📚 **Documentation** - Guides, tutorials, examples
- ✨ **Everywhere* - So so many new features to build...

### Development Guidelines

Please read our comprehensive [CONTRIBUTING.md](CONTRIBUTING.md) guide which covers:

- Code style and conventions
- Testing requirements
- Commit message format
- Pull request process
- Code review guidelines

---

## 📜 License

**MIT License** - See [LICENSE](LICENSE) for full details.

**TL;DR**: Free to use for personal and commercial projects. No attribution required (but appreciated!).

```
Copyright (c) 2025 Alex Hutanu (http://hutanu.net/)
```

---

## 🙏 Acknowledgments

This project was made possible with the generous support of **[HopX.AI](https://hopx.ai)**, who provide instant ephemeral sandboxes for this project free of charge.

Special thanks to:

- **[Hopx](https://hopx.ai)** - Cloud sandbox execution platform (sponsor)

---

## 📧 Contact

**Creator**: [Alex Hutanu](http://hutanu.net/)

- **Email**: [alex@hutanu.net](mailto:alex@hutanu.net)
- **Website**: [hutanu.net](http://hutanu.net/)

**Project Links**:
- **Source Code**: https://github.com/ahutanu/sandbooks.space
- **Live Demo**: [sandbooks.space](https://sandbooks.space)
- **Issues & Discussions**: https://github.com/ahutanu/sandbooks.space/issues

---

**Star ⭐ this project if you find it useful!**

---

*Made with ❤️ for developers who love clean notes and executable code*
