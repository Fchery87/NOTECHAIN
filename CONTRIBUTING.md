# Contributing to NoteChain

Thank you for your interest in contributing to NoteChain! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/notechain.git
   cd notechain
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-org/notechain.git
   ```
4. **Follow the [Setup Guide](./docs/SETUP.md)** to configure your development environment

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-short-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clear, concise code
- Follow the [Code Style Guidelines](#code-style-guidelines)
- Add tests for new features
- Update documentation as needed

### 3. Keep Your Branch Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git rebase upstream/main
```

### 4. Run Validation

Before committing, ensure all checks pass:

```bash
bun run validate
```

This runs:

- Prettier formatting check
- ESLint
- TypeScript type checking
- All tests

### 5. Commit Your Changes

Follow the [Commit Conventions](#commit-conventions):

```bash
git add .
git commit -m "feat: add new feature description"
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Open a Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Fill out the PR template completely
- Link any related issues

## Code Style Guidelines

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Strict type checking** - avoid `any` types
- **Functional programming** - prefer pure functions
- **Named exports** over default exports
- **Async/await** over promises chains

### Formatting

We use **Prettier** for code formatting. Configuration is in `.prettierrc`.

```bash
# Check formatting
bun run format:check

# Fix formatting
bun run format
```

### Linting

We use **ESLint** with TypeScript support. Configuration is in `eslint.config.mjs`.

```bash
# Run linter
bun run lint

# Auto-fix issues
bun run lint:fix
```

### File Organization

```
src/
├── components/       # React components
│   ├── ComponentName/
│   │   ├── ComponentName.tsx
│   │   ├── ComponentName.test.tsx
│   │   └── index.ts
├── lib/             # Utility functions & helpers
├── hooks/           # Custom React hooks
├── services/        # API services & external integrations
├── types/           # TypeScript type definitions
└── __tests__/       # Test files (if not co-located)
```

### Component Guidelines

```tsx
// ✅ Good
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant, size = 'md', onClick, children }: ButtonProps) {
  return (
    <button className={cn(baseStyles, variantStyles[variant], sizeStyles[size])} onClick={onClick}>
      {children}
    </button>
  );
}
```

```tsx
// ❌ Bad
export default function Button(props: any) {
  return <button {...props} />;
}
```

### Naming Conventions

- **Components**: PascalCase (`MyComponent`)
- **Files**: PascalCase for components, camelCase for utils
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **CSS Classes**: kebab-case (Tailwind utilities)

## Testing Requirements

### Test Coverage

- **All new features** must include tests
- **Bug fixes** should include regression tests
- **Aim for 80%+ code coverage**

### Test Types

#### Unit Tests

Test individual functions and components:

```typescript
import { describe, test, expect } from 'bun:test';
import { encryptData } from './encryption';

describe('encryptData', () => {
  test('should encrypt data successfully', async () => {
    const data = { message: 'Hello' };
    const key = new Uint8Array(32);

    const encrypted = await encryptData(data, key);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
  });
});
```

#### Integration Tests

Test interactions between modules:

```typescript
describe('Note Creation Flow', () => {
  test('should create, encrypt, and sync note', async () => {
    // Test end-to-end flow
  });
});
```

#### Component Tests (React)

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/lib/encryption.test.ts

# Run with coverage
bun test --coverage
```

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements
- `ci:` - CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(auth): add Google OAuth integration"

# Bug fix
git commit -m "fix(sync): resolve race condition in CRDT merge"

# Documentation
git commit -m "docs: update API endpoint documentation"

# Multiple changes (use body)
git commit -m "refactor(crypto): improve key derivation

- Use PBKDF2 instead of scrypt
- Add salt generation
- Update tests"
```

### Scope

Optional, but recommended. Examples:

- `auth` - Authentication
- `crypto` - Cryptography
- `sync` - Synchronization
- `ui` - User Interface
- `api` - API changes
- `db` - Database

## Pull Request Process

### PR Title

Use the same format as commit messages:

```
feat(auth): add OAuth support
fix(sync): resolve conflict resolution bug
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?

Describe tests you ran

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Dependent changes merged

## Screenshots (if applicable)

Add screenshots for UI changes

## Related Issues

Closes #123
Related to #456
```

### Review Process

1. **Automated Checks**: CI must pass
   - Linting
   - Type checking
   - Tests
   - Build

2. **Code Review**: At least 1 approval required
   - Reviewers will check code quality
   - May request changes
   - Address feedback promptly

3. **Merge**: Once approved and checks pass
   - Squash and merge preferred
   - Rebase if necessary

## Reporting Bugs

### Before Reporting

1. **Check existing issues** to avoid duplicates
2. **Use latest version** to see if bug is fixed
3. **Test in clean environment** if possible

### Bug Report Template

```markdown
## Bug Description

Clear description of the bug

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. See error

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 0.1.0]

## Screenshots

Add screenshots if applicable

## Additional Context

Any other relevant information
```

## Feature Requests

### Before Requesting

1. **Check existing feature requests**
2. **Search discussions** for related ideas
3. **Consider scope** - is this aligned with project goals?

### Feature Request Template

```markdown
## Feature Description

Clear description of the feature

## Problem Statement

What problem does this solve?

## Proposed Solution

How should it work?

## Alternatives Considered

Other approaches you've thought about

## Additional Context

Mockups, examples, etc.
```

## Architecture Decisions

For significant architectural changes:

1. **Open a Discussion** first
2. **Create an ADR** (Architecture Decision Record) in `docs/adr/`
3. **Get consensus** before implementation

## Package-Specific Guidelines

### Core Crypto (`packages/core-crypto`)

- All crypto operations must use libsodium
- Never log keys or sensitive data
- Add security tests for new features

### Data Models (`packages/data-models`)

- Keep types minimal and focused
- Document complex types thoroughly
- Maintain backwards compatibility

### Sync Engine (`packages/sync-engine`)

- Follow CRDT principles
- Test conflict resolution thoroughly
- Consider offline-first scenarios

### AI Engine (`packages/ai-engine`)

- Optimize for performance
- Include fallbacks for model failures
- Document model requirements

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

## Questions?

- Check [GitHub Discussions](https://github.com/org/notechain/discussions)
- Review existing documentation in `docs/`
- Create an issue for clarification

Thank you for contributing to NoteChain! 🚀
