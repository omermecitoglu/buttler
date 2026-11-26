# GitHub

## Who writes

- Issues, pull requests, comments, labels and every other GitHub write go through the `github` MCP server, which acts as `lord-pullington[bot]`. Never write to GitHub as the owner.
- Code is pushed with plain `git push`.
- The owner's `gh` is used for reads, and for one write only: issue blockers ("blocked by" relationships). The MCP server can't read or set them.

## Blockers

- Read: `gh api repos/omermecitoglu/buttler/issues/<number>/dependencies/blocked_by` (or `/blocking`).
- Set: `gh api -X POST repos/omermecitoglu/buttler/issues/<number>/dependencies/blocked_by -F issue_id=<id>`. `issue_id` is the ID of the blocking issue, not its number.
