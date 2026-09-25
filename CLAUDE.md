@AGENTS.md
@docs/ROADMAP.md

## Claude Code specifics
- Start each phase in plan mode; ask the owner via AskUserQuestion when a decision is theirs.
- Use the Supabase MCP for migrations (`apply_migration`), deploys, logs and `get_advisors`.
- End of phase: tick ROADMAP, append to the decision log, commit (`phase N: ...`), push.
