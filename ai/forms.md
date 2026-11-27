# Form Validation Errors

How a form action's errors reach the screen, and what to put in a form's `messages` map. Getting this wrong shows raw codes like `TOO_SMALL` to the user (#180).

## What the action returns

`defineFormAction` from `@omer-x/next-form-actions` validates the form data with the action's Zod schema. When it fails, `bundleErrors` returns one entry per field, `{ [field]: code }`. The code comes from the Zod issue and is always **upper-cased**:

| Zod issue | Code |
|-----------|------|
| `custom` (`refine`, `ctx.addIssue`) | The issue's message, upper-cased: `refine(..., "service_name_required")` → `SERVICE_NAME_REQUIRED` |
| `too_small` / `too_big` | `TOO_SMALL` / `TOO_BIG`. The message given to `.min(1, "...")` or `.max(...)` is dropped |
| `invalid_format` | `INVALID_<FORMAT>`, e.g. `INVALID_EMAIL`, `INVALID_URL` |
| `invalid_type` with an undefined value (a missing field) | `REQUIRED` |
| Anything else, e.g. `invalid_value` from `z.enum` | `UNKNOWN_ERROR` |

- Only the first segment of the issue path is used, so every error inside a nested value lands on the top-level field.
- When a field has several issues, the last one wins.

Errors thrown with `displayMessage(type, code)` are different: they are returned as `{ "[error]": "setup_failed" }` (or `[warning]`, `[success]`), and the code is **not** changed.

## How `Form` shows them

`Form` (`src/components/ui/form.tsx`) wraps `BaseForm` from `@omer-x/tailwind-ui-kit/form`.

- A key that belongs to a registered field (a `BaseFormField` with that `name`) is shown under that field. The text is `field messages[code]`, else `form messages[code]`, else the raw code.
- Any other key, such as `[error]`, is shown as a message box at the top of the form, with `messages[code]` or the raw code. The `[...]` part of the key becomes `data-message-type`, which sets the box's color.

A missing key in `messages` is never an error, the user just sees the raw code. Nothing warns about it.

## Conventions

- Use `refine` for field-specific messages, not `.min(1, "...")`. `requiredString` in `src/actions/service.ts` is the example.
- In `messages`, map UPPER_CASE keys for schema errors (`SERVICE_NAME_REQUIRED`, `TOO_SMALL`) and the codes as written for `displayMessage` (`setup_failed`).
- A `jsonField` (`src/utils/jsonField.ts`) turns any error inside its JSON into one `custom` issue, so the field gets its single message, e.g. `INVALID_PORTS`.
- Check the exact codes in the action tests (`src/actions/*.test.ts`), e.g. `{ name: "SERVICE_NAME_REQUIRED" }` or `{ "[error]": "create_failed" }`, and map those codes in the form.
