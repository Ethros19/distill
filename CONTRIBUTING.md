# Contributing to Distill

Thanks for your interest in contributing to Distill! This guide covers everything you need to get started.

## Development Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/Ethros19/distill.git
   cd distill
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required variables — see [`.env.example`](.env.example) for descriptions.

4. **Push database schema**

   ```bash
   npm run db:push
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Running Tests

```bash
# Run all tests
npx vitest run

# Run a specific test file
npx vitest run tests/specific.test.ts

# Run tests in watch mode
npx vitest
```

## Code Conventions

- **TypeScript strict mode** — all code is TypeScript with strict checks enabled
- **No hardcoded secrets** — all configuration via environment variables
- **Drizzle ORM** — database access through Drizzle, schema in `src/lib/schema.ts`
- **Zod validation** — all external input validated with Zod schemas
- **Provider-agnostic** — core logic never imports a specific LLM provider directly; use `getLLMProvider()` from the factory

## Adding a New LLM Provider

Distill's LLM layer is designed to be swappable. To add a new provider:

### 1. Implement the `LLMProvider` interface

Create `src/lib/providers/<name>.ts`:

```typescript
import type { LLMProvider } from '../llm/provider'
import type { RawInput, StructuredInput, SynthesisInput, LLMSignal } from '../llm/types'
import { StructuredInputSchema, SynthesisResultSchema } from '../llm/types'
import { LLMError } from '../llm/errors'

export class YourProvider implements LLMProvider {
  constructor(/* your config */) {}

  async structure(input: RawInput): Promise<StructuredInput> {
    // Call your LLM with the structuring prompt
    // Parse the response as JSON
    // Validate with: StructuredInputSchema.parse(parsed)
    // Return the validated result
  }

  async synthesize(inputs: SynthesisInput[]): Promise<LLMSignal[]> {
    // Call your LLM with the synthesis prompt
    // Parse the response as JSON
    // Validate with: SynthesisResultSchema.parse(parsed)
    // Return result.signals
  }
}
```

### 2. Register in the provider factory

Add a case to `src/lib/llm/provider-factory.ts`:

```typescript
case 'your-provider':
  return new YourProvider(process.env.YOUR_PROVIDER_API_KEY!)
```

### 3. Add environment variables

Add the required env vars to `.env.example` with comments explaining purpose, defaults, and whether they are required or optional.

### 4. Key requirements

- **Both methods required**: `structure()` and `synthesize()` must both be implemented
- **Validate with Zod**: Always parse LLM output through `StructuredInputSchema` and `SynthesisResultSchema`
- **Use `LLMError`**: Wrap provider-specific errors in `LLMError` from `src/lib/llm/errors.ts`
- **Model configurability**: Read model names from environment variables with sensible defaults

## Commit Format

```
{type}({scope}): {description}
```

**Types**: `feat`, `fix`, `test`, `refactor`, `perf`, `docs`, `style`, `chore`

**Examples**:
- `feat(providers): add OpenAI provider adapter`
- `fix(cron): handle empty input batch in daily structuring`
- `docs(readme): update quickstart for Vercel deploy`

## Pull Request Process

1. Fork the repo and create a feature branch
2. Make your changes with tests where applicable
3. Ensure `npx vitest run` passes
4. Ensure `npm run build` succeeds
5. Open a PR with a clear description of what changed and why

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
