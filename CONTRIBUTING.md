# Contributing to Sandbooks

Thank you for considering contributing to Sandbooks! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

Please review and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We welcome contributions from everyone regardless of experience level.

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 9.x or higher
- **Hopx API Key**: Required for code execution features

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ahutanu/sandbooks.space.git
   cd sandbooks
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Configure environment variables**:
   ```bash
   # Frontend (.env)
   cp .env.example .env

   # Backend (backend/.env)
   cp backend/.env.example backend/.env
   ```

4. **Add your Hopx API key** to `backend/.env`:
   ```
   HOPX_API_KEY=your_key_here
   ```

5. **Start development servers**:
   ```bash
   npm start
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Project Structure

```
sandbooks/
├── src/                      # Frontend React application
│   ├── components/          # React components
│   │   ├── Editor/         # TipTap editor components
│   │   ├── Sidebar/        # Note list sidebar
│   │   ├── Terminal/       # Terminal emulator
│   │   ├── Tags/           # Tag system components
│   │   └── ui/             # Shared UI components
│   ├── store/              # Zustand state management
│   ├── services/           # API services
│   ├── types/              # TypeScript types
│   └── utils/              # Helper utilities
├── backend/                 # Node.js Express backend
│   └── src/
│       ├── routes/         # API route handlers
│       ├── services/       # Business logic
│       └── types/          # TypeScript types
└── tests/                   # Playwright E2E tests
```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Workflow Steps

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with frequent commits

3. **Test thoroughly**:
   ```bash
   npm run build        # Frontend build
   npm run lint         # Lint frontend + backend
   npm test             # Run E2E tests
   ```

4. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- **Strict mode**: All TypeScript must compile with `strict: true`
- **No `any` types**: Use proper types or `unknown` with type guards
- **Interfaces over types**: Prefer `interface` for object shapes

**Example**:
```typescript
// ✅ Good
interface Note {
  id: string;
  title: string;
  content: JSONContent;
  tags: Tag[];
}

// ❌ Bad
type Note = {
  id: any;  // Never use 'any'
  title: string;
  content: object;  // Too generic
};
```

### React Components

- **Functional components**: Use hooks, no class components
- **TypeScript for props**: All props must be typed
- **Descriptive names**: `ExecutableCodeBlock`, not `ECB`

**Example**:
```tsx
// ✅ Good
interface CodeBlockProps {
  language: string;
  code: string;
  onExecute: (code: string) => Promise<void>;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, onExecute }) => {
  // Implementation
};
```

### CSS/Styling

- **TailwindCSS**: Use utility classes, avoid custom CSS
- **Dark mode**: Always add dark mode classes (`dark:bg-stone-900`)
- **Responsive**: Mobile-first (`md:`, `lg:` breakpoints)

**Example**:
```tsx
<div className="bg-white dark:bg-stone-900 px-4 md:px-8">
  {/* Mobile: 16px padding, Desktop: 32px */}
</div>
```

### Naming Conventions

- **Files**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Functions**: `camelCase` (verb-first: `handleClick`, `fetchData`)
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (describe the shape: `NoteStore`, `CodeBlockProps`)

## Commit Guidelines

Follow **Conventional Commits** specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)

### Examples

```bash
# Feature
feat(editor): add syntax highlighting for Rust

# Bug fix
fix(terminal): resolve scroll sync issue in code blocks

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(store): simplify note state management
```

### Commit Message Best Practices

- **Subject line**: Max 72 characters, imperative mood ("add", not "added")
- **Body**: Explain *what* and *why*, not *how* (code shows how)
- **Footer**: Reference issues (`Fixes #123`, `Closes #456`)

**Example**:
```
feat(tags): add color customization with picker

Implement color picker popover allowing users to change tag colors.
Color changes apply globally to all notes with that tag.

Fixes #45
```

## Pull Request Process

### Before Submitting

1. ✅ **Build succeeds**: `npm run build:all`
2. ✅ **Tests pass**: `npm test`
3. ✅ **TypeScript compiles**: Zero errors
4. ✅ **Self-review**: Check your own diff
5. ✅ **Update docs**: If adding features

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes

## Screenshots
If UI changes, include before/after screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my code
- [ ] Commented complex logic
- [ ] Updated documentation
- [ ] Tests pass locally
- [ ] Build succeeds
```

### Review Process

1. **Automated checks** run (build, lint, tests)
2. **Maintainer review** (1-2 business days)
3. **Address feedback** with new commits
4. **Approval** from maintainer
5. **Squash and merge** to main

## Testing

### Running Tests

```bash
# Run all E2E tests
npm test

# Run with UI
npm run test:ui

# Run in headed mode (watch browser)
npm run test:headed
```

### Writing Tests

**Test Location**: `tests/*.spec.ts`

**Example Test**:
```typescript
import { test, expect } from '@playwright/test';

test('code block execution works', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Click "+ New Note"
  await page.click('button:has-text("+ New Note")');

  // Add code block
  await page.click('button:has-text("</> Code")');

  // Type code
  await page.fill('.code-editing', 'print("Hello World")');

  // Execute
  await page.click('button:has-text("▶ Run")');

  // Verify output
  await expect(page.locator('.code-output')).toContainText('Hello World');
});
```

### Test Coverage Goals

- **Critical paths**: 100% (code execution, data persistence)
- **UI interactions**: 80%+
- **Edge cases**: Document if not testable

## Documentation

### What to Document

1. **New features**: Add to README.md
2. **API changes**: Update inline JSDoc comments
3. **Architecture changes**: Update `docs/ARCHITECTURE.md`
4. **Breaking changes**: Highlight in PR and CHANGELOG

### Documentation Style

- **Clear and concise**: No fluff, no buzzwords
- **Code examples**: Show real usage
- **Accessibility**: WCAG 2.1 AA compliance notes
- **Cross-platform**: Note Mac/Windows/Mobile differences

**Example**:
```markdown
## Feature: Global Search

Open search with `Cmd+K` (Mac) or `Ctrl+K` (Windows).

**Keyboard Navigation**:
- `↑↓`: Navigate results
- `Enter`: Open note
- `Esc`: Close search

**Mobile**: Tap search icon in header (magnifying glass).
```

## Areas for Contribution

### High Priority

- 🐛 **Bug fixes**: Check [Issues](https://github.com/ahutanu/sandbooks.space/issues)
- ♿ **Accessibility**: Improve WCAG compliance
- 📱 **Mobile UX**: Enhance touch interactions
- 🌍 **Internationalization**: Add i18n support

### Medium Priority

- ✨ **New features**: Note folders, markdown export
- ⚡ **Performance**: Optimize large note handling
- 🎨 **Themes**: Custom color schemes
- 📝 **Templates**: Note templates system

### Low Priority

- 🧪 **Test coverage**: Increase E2E tests
- 📚 **Documentation**: Video tutorials, guides
- 🛠️ **Developer tools**: Better debugging

## Questions?

- **Issues**: [GitHub Issues](https://github.com/ahutanu/sandbooks.space/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ahutanu/sandbooks.space/discussions)
- **Email**: [alex@hutanu.net](mailto:alex@hutanu.net)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Project credits

Thank you for contributing to Sandbooks! 🚀
