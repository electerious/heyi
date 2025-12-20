Instructions for heyi

## Project Overview

`heyi` is a CLI tool that executes AI prompts via OpenRouter with structured output using the Vercel AI SDK. The tool wraps all responses in Zod schemas to ensure type-safe, formatted outputs (string, number, object, or array).

## Architecture

- **[bin/index.js](../bin/index.js)** - CLI entry point using Commander.js for argument parsing and user-facing error handling
- **[src/index.js](../src/index.js)** - Core `executePrompt()` function that interfaces with OpenRouter via Vercel AI SDK's `generateObject()`
- **[src/utils/schema.js](../src/utils/schema.js)** - Schema factory that wraps user-provided Zod schemas or creates basic schemas for simple formats

## Key Patterns

### Schema Wrapping Pattern

All AI responses are wrapped in `z.object({ result: <user_schema> })` format. The `executePrompt()` function unwraps this to return only the result value. This pattern enables the Vercel AI SDK's `generateObject()` to enforce structured outputs for all format types.

### Dynamic Schema Evaluation

User-provided schemas (via `--schema` flag) are evaluated using `eval()` in the context of imported Zod (`z`). Example: `"z.object({name:z.string()})"` becomes an actual Zod schema. The eval is intentional and documented (see [src/utils/schema.js](../src/utils/schema.js)).

## Development Workflow

- **No traditional tests**: `npm test` runs linters only (`npm run lint`)
- **Formatting**: Auto-fix with `npm run format` (runs ESLint fix + Prettier write)
- **Testing prompts**: Use `npm start -- "Your prompt"` or `./bin/index.js "Your prompt"` directly
- **API Key**: Set `API_KEY` in `.env` file or environment variable (required for all operations)

## Configuration

- Uses `@electerious/eslint-config` and `@electerious/prettier-config` (standard presets)
- ES modules only (`"type": "module"` in package.json)
- Node >=22 required (uses JSON import attributes: `with { type: 'json' }`)

## Dependencies

- **@openrouter/ai-sdk-provider** - OpenRouter provider for Vercel AI SDK
- **ai** - Vercel AI SDK, specifically `generateObject()` for structured outputs
- **commander** - CLI framework
- **zod** - Schema validation for structured outputs
- **dotenv** - Environment variable loading from `.env`

## Common Modifications

When adding new output formats:

1. Add case to `getFormatSchema()` in [src/utils/schema.js](../src/utils/schema.js)
2. Add corresponding unwrapping logic in `executePrompt()` switch statement in [src/index.js](../src/index.js)
3. Update help text in [bin/index.js](../bin/index.js) and [README.md](../README.md)

When changing CLI options, update:

- [bin/index.js](../bin/index.js) - Commander.js options and help text
- [README.md](../README.md) - Usage documentation and examples

When changing anything related to how the user interacts or uses the tool, update:

- [README.md](../README.md) - Ensure documentation reflects changes
- [CHANGELOG.md](../CHANGELOG.md) - Add relevant changelog entry
