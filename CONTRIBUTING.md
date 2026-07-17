# Contributing

## Development flow

1. Read `AGENTS.md` and the relevant domain documentation.
2. Make a focused change.
3. Add or update tests.
4. Run `make check`, `make test`, and the relevant build command.
5. Update the relevant ADR, runbook, or compliance record.

## Commit format

Use imperative, scoped commits:

```text
feat(fe): add registration flow
fix(be): rotate refresh sessions
feat(ai): add retrieval provider contract
chore(infra): add production health checks
docs(compliance): record dependency license review
```

## Dependency policy

Prefer MIT, BSD, Apache-2.0, and ISC dependencies. Preserve notices for copied
source. Do not use a repository without an explicit license.
