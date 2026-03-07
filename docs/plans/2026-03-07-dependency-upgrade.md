# Dependency Upgrade Plan - March 2026

> **Goal:** Upgrade core dependencies to latest stable versions

## Current vs Target Versions

| Package    | Current | Target (March 2026) | Priority |
| ---------- | ------- | ------------------- | -------- |
| Next.js    | 15.1.6  | **16.1.6**          | P0       |
| React      | 19.0.0  | **19.2.4**          | P0       |
| React DOM  | 19.0.0  | **19.2.4**          | P0       |
| TypeScript | 5.7.3   | **6.0**             | P1       |
| ESLint     | 9.27.0  | Latest              | P2       |
| Vitest     | 4.0.18  | Latest              | P2       |

## Key Changes in Next.js 16

### Breaking Changes

- **Turbopack is now default bundler** (replaces Webpack in dev)
- **Minimum Node.js**: 20.9.0 required
- **React Compiler**: Stable support
- **Cache Components**: New caching primitives

### Migration Tasks

1. Update `next.config.js` for Turbopack compatibility
2. Review custom webpack config (if any)
3. Test all API routes (Edge runtime changes)
4. Verify middleware behavior

## Key Changes in React 19.2

### New Features

- **`<Activity>` API**: New debugging tool
- **`useEffectEvent`**: Stable release
- **`cacheSignal`**: Enhanced Suspense
- **Owner Stack**: Better component tracing

### Migration Tasks

1. Review Suspense usage
2. Test error boundaries
3. Update React DevTools

## Key Changes in TypeScript 6.0

### Important Notes

- **Last version on old compiler** ("Strada")
- **TypeScript 7.0** coming mid-2026 with Go-based compiler ("Corsa")
- May have breaking type changes

### Migration Tasks

1. Run type checker after upgrade
2. Fix any new type errors
3. Review `tsconfig.json` for deprecated options

## Implementation Plan

### Phase 1: Next.js + React Upgrade (P0)

```bash
# Update packages
cd apps/web
npm install next@16.1.6 react@19.2.4 react-dom@19.2.4

# Run type check
npx tsc --noEmit

# Run tests
npm test

# Run build
npm run build
```

### Phase 2: TypeScript Upgrade (P1)

```bash
npm install typescript@6.0 --save-dev
npx tsc --noEmit
```

### Phase 3: Dev Dependencies (P2)

```bash
npm install eslint@latest vitest@latest --save-dev
```

## Testing Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Build succeeds without errors
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Manual smoke test (critical user flows)
- [ ] API routes work correctly
- [ ] Middleware functions properly
- [ ] Redis rate limiting works (if REDIS_URL set)

## Rollback Plan

If issues are found:

```bash
# Revert to previous versions
git revert HEAD
npm install
```

## Timeline

- **Day 1**: Next.js + React upgrade
- **Day 2**: TypeScript upgrade
- **Day 3**: Dev dependencies + testing
- **Day 4**: Bug fixes + stabilization
- **Day 5**: Production deployment

## Risks

| Risk                                   | Mitigation                      |
| -------------------------------------- | ------------------------------- |
| Turbopack breaks custom webpack config | Keep webpack config as fallback |
| Edge runtime changes break middleware  | Test all middleware thoroughly  |
| TypeScript 6.0 has breaking changes    | Fix type errors incrementally   |
| React 19.2 Suspense changes            | Test all Suspense boundaries    |

## Success Criteria

- All tests passing
- Build successful
- No console errors in production
- Performance metrics maintained or improved
- Security fixes still functional

---

**Created:** March 7, 2026  
**Status:** Ready for implementation  
**Priority:** P0 (Next.js + React), P1 (TypeScript), P2 (Dev deps)
