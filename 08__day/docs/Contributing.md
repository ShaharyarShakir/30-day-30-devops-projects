# Developer Contribution Guidelines

Welcome to the ChainDeploy repository! This guide details how to develop, test, and contribute changes.

## Workflow Actions
1. **Branching Model**: Create feature branches starting from `main` (e.g. `feature/multi-tenancy`).
2. **Linting and Styling**:
   - Node API: `pnpm run lint`
   - Rust: `cargo clippy -- -D warnings`
3. **Tests**:
   - Ensure all cargo tests pass: `cargo test`
   - Ensure NestJS API tests pass: `pnpm run test`

## Docker Verification
Before submitting a pull request, build images locally to ensure there are no multi-stage compile errors:
```bash
docker compose build
```
Ensure dependencies are cached and compilation time is optimized.
