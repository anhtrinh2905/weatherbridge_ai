# Claude Code Project Guide

Read `AGENTS.md` first. Use the domain files below when the task matches them:

- Frontend and Open Design: `.claude/skills/frontend/SKILL.md`
- FastAPI and auth: `.claude/skills/backend/SKILL.md`
- AI and model lifecycle: `.claude/skills/ai-engineering/SKILL.md`
- Operations and deployment: `.claude/skills/devops/SKILL.md`
- Testing, privacy, and licenses: `.claude/skills/quality-compliance/SKILL.md`

Delegate work to the smallest relevant subagent under `.claude/agents/`.
Keep changes within the declared ownership boundary and report commands run,
tests passed, and unresolved risks.
