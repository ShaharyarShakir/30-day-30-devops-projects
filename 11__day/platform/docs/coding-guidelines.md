# Coding Guidelines and Standards

We enforce strict coding conventions across the entire platform repository.

## Language Standards

### TypeScript / JavaScript

- **Styling**: Prettier configurations (.prettierrc) override defaults.
- **Linter**: Flat ESLint configurations (eslint.config.js) using typescript-eslint.
- **Rules**:
  - Semi-colons required.
  - Single quotes.
  - Strict null check validation enabled.

### Kotlin

- **Linter / Formatter**: ktlint for code standards matching Kotlin code style.
- **Style Rules**:
  - Indent size 4 spaces.
  - No wildcard imports.

### Go

- **Formatter**: Native `gofmt` to format files on write.

### Python

- **Linter & Formatter**: Ruff + Black formatting rules.
- **Rules**:
  - Line length 88 (Black standard).
  - PEP 8 compliance.

## Git Workflow Standards

### Commit Messages

We follow Conventional Commits guidelines:

```text
feat(scope): add new feature description
fix(scope): fix bug details
docs: update documentation contents
refactor(scope): refactor files without functional updates
```

### Branch Names

- **Production**: `main`
- **Development Ingress**: `develop`
- **Features**: `feature/<service-name>-<feature-description>`
- **Bug Fixes**: `bugfix/<service-name>-<bug-description>`
