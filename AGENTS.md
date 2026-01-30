# AGENTS.md

This file contains guidelines for agentic coding agents working in this SvelteKit project.

## Build/Lint/Test Commands

### Development

```bash
npm run dev                # Start development server
npm run dev -- --open      # Start dev server and open browser
```

### Building

```bash
npm run build              # Build for production
npm run preview            # Preview production build
```

### Code Quality

```bash
npm run check              # Type checking with svelte-check
npm run check:watch        # Type checking with watch mode
npm run format             # Format code with Prettier
npm run lint               # Run Prettier check + ESLint
```

### Testing

```bash
npm run test               # Run all tests (unit + e2e)
npm run test:unit          # Run unit tests with Vitest
npm run test:e2e           # Run e2e tests with Playwright
```

### Single Test Commands

```bash
# Run specific unit test file
npm run test:unit -- src/routes/page.svelte.test.ts

# Run single e2e test
npx playwright test e2e/demo.test.ts

# Run tests in watch mode for development
npm run test:unit -- --watch

# Run tests with coverage
npm run test:unit -- --coverage
```

## Project Structure

This is a **SvelteKit** project with:

- TypeScript configuration
- Tailwind CSS + DaisyUI
- Firebase integration
- Vitest for unit testing
- Playwright for e2e testing
- ESLint + Prettier for code quality

## Code Style Guidelines

### Import Style

- Use `$lib` alias for internal imports: `import Component from '$lib/Component.svelte'`
- Group imports: external libraries first, then internal imports
- Use named imports where possible: `import { writable } from 'svelte/store'`

### Formatting Rules (from .prettierrc)

- **Tabs**: Use tabs (not spaces)
- **Quotes**: Single quotes
- **Trailing commas**: None
- **Line width**: 100 characters
- **Svelte files**: Use svelte parser

### TypeScript Configuration

- Strict mode enabled
- ES modules with bundler resolution
- Source maps enabled
- Consistent casing enforced

### Naming Conventions

- **Components**: PascalCase (`UserProfile.svelte`, `DataTable.svelte`)
- **Files**: kebab-case for routes (`user-profile/+page.svelte`)
- **Variables/Functions**: camelCase (`getUserData`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Stores**: descriptive names (`userStore`, `cartItems`)

### Svelte Specific Patterns

- Use `<script lang="ts">` for TypeScript
- Export props with `export let propName: Type`
- Use `$:` for reactive statements
- Import Svelte stores with `import { writable, readable, derived } from 'svelte/store'`
- Use `{#if}`, `{#each}`, `{#await}` blocks for template logic

### CSS/Style Guidelines

- Use Tailwind CSS classes in components
- Avoid inline styles unless necessary
- Use DaisyUI components where available
- Keep component styles scoped with `<style>` blocks

### Error Handling

- Use try-catch blocks for async operations
- Provide user-friendly error messages
- Log errors appropriately with console.error
- Handle loading states with boolean flags

### Firebase Integration

- Firebase config is in `src/lib/firebase.ts`
- Export initialized services: `app`, `db`, `auth`, `storage`
- Use stores for reactive auth state: `user` store available
- Handle auth state changes with `onAuthStateChanged`

### Testing Guidelines

- Unit tests: `*.test.ts` or `*.spec.ts` alongside source files
- Use `@testing-library/svelte` for component testing
- E2E tests in `e2e/` directory with Playwright
- Test files should be co-located with components
- Use descriptive test names with "should" pattern

### File Organization

```
src/
├── lib/              # Shared components, utilities, services
├── routes/           # SvelteKit pages and API routes
│   ├── app/         # Protected/app routes
│   ├── (auth)/      # Auth routes (if any)
│   └── api/         # API endpoints
└── app.html         # Root template
```

### Environment Setup

- Node.js dependencies managed via npm
- Use `.env.local` for environment variables (not committed)
- Firebase keys should be environment variables in production

### Git Workflow

- Use conventional commit messages
- Run `npm run lint` before committing
- Ensure tests pass: `npm run test`
- Use `npm run check` to verify TypeScript types
