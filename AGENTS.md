# Agent Guidelines

> **Responsibility Notice:** The responsibility of this file belongs to the agent. The agent should update this file with every new piece of information it learns in the development process by incrementing the "Revision" number. Keep in mind that project-specific instructions cannot take any place in this file because it is portable and may be copied directly to other projects. Always put project-specific rules in `./ai/*.md`.

**Revision:** 4

## Token Budget & Collaboration

1. **Tight Token Budget**:
   - Keep actions targeted and minimal.
   - Do not search the codebase broadly (e.g. running wide grep/find commands or scanning multiple directories) without asking.
   - Avoid executing redundant commands or reading unnecessary files.

2. **Ask the User First**:
   - Always collaborate with the user and ask questions directly before searching for:
     - Utility or helper functions.
     - Environment variables or configuration values.
     - Business logic, domain rules, or operational schedules.

3. **Efficiency & Communication**:
   - Keep tool usage focused strictly on the files directly involved in the task.
   - Communicate clearly and concisely.

## Commit Convention

All commits must follow the **Conventional Commits** format:

```
<type>: <short description>
```

Common types:

| Type | When to use |
|------|-------------|
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `docs` | Documentation changes only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, or dependency updates |

### Atomic Commits

- Keep commits granular and atomic; do not pile up many changes before committing.
- Commit frequently as each independent unit of work or logical step is completed.
- Never bundle unrelated changes (such as documentation, agent guidelines, new UI components, and page refactors) into a single commit.

### AI Co-authorship

All commits made or assisted by AI agents must include a co-author trailer matching the AI model in use:

- **Claude**: `Co-authored-by: Claude <noreply@anthropic.com>`
- **Gemini**: `Co-authored-by: Gemini <gemini@google.com>`
- **ChatGPT / OpenAI**: `Co-authored-by: ChatGPT <chatgpt@openai.com>`

Example:

```
feat: add product name suggestion page

Co-authored-by: Claude <noreply@anthropic.com>
```

### Issue Linking

When a commit addresses or resolves an issue, include the issue reference in the commit body (e.g., `Fixes #<issue-number>`). Do not close issues manually via API tools; let GitHub link and manage their resolution through commit descriptions.

Example:

```
ci: add alpha prerelease branch to releaserc

Fixes #46

Co-authored-by: Gemini <gemini@google.com>
```

## Project-Specific Documentation

For architecture, domain context, data models, or workflows specific to this repository, refer to the guides in `./ai/*.md`.
