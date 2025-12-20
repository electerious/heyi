# heyi

> CLI tool to execute AI prompts with flexible output formatting

Execute AI prompts directly from your terminal with support for multiple models and structured output formats using OpenRouter and the Vercel AI SDK.

## Install

```sh
npm install heyi -g
```

## Usage

### CLI

```sh
heyi [prompt] [options]
```

#### Options

- `-m, --model <model>` - AI model to use (default: `openai/gpt-4o-mini`)
- `-f, --format <format>` - Output format: `string`, `number`, `object`, `array` (default: `string`)
- `-s, --schema <schema>` - Zod schema for object/array format (required when format is `object` or `array`)
- `--file <path>` - Read content from file and include as context (can be used multiple times)
- `-h, --help` - Display help information
- `-V, --version` - Display version number

#### Environment Variables

- `API_KEY` - OpenRouter API key (required, can be set via environment or `.env` file)
- `MODEL` - Default AI model to use (optional, can be overridden with `--model` flag)

### Examples

```sh
# Simple text prompt
heyi "What is the capital of France?"

# Use a different model
heyi "Explain quantum computing" --model google/gemini-2.0-flash-exp

# Get structured output as array of strings
heyi "List 5 programming languages" --format array --schema "z.string()"

# Get structured output as array of objects
heyi "List 3 countries with their capitals" --format array --schema "z.object({name:z.string(),capital:z.string()})"

# Get structured output as single object
heyi "Analyze: revenue 100k, costs 60k" --format object --schema "z.object({revenue:z.number(),costs:z.number()})"

# Complex nested schema
heyi "Analyze top 3 tech companies" --format array --schema "z.object({name:z.string(),founded:z.number(),products:z.array(z.string())})"

# Set default model via environment variable
MODEL=perplexity/sonar heyi "Explain AI"

# Set API key via environment variable
API_KEY=your-key heyi "Hello, AI!"

# Input from file as context
heyi "Summarize this content" --file input.txt

# Input from multiple files as context
heyi "Compare these files" --file file1.txt --file file2.txt
heyi "Analyze all these documents" --file doc1.md --file doc2.md --file doc3.md

# Input from stdin
cat article.md | heyi "Extract all URLs mentioned"
echo "Analyze this text" | heyi
```

## Output Formats

- **string** (default): Plain text response from the AI model
- **number**: Numeric response from the AI model
- **object**: Single JSON object with structured data (requires `--schema` flag)
- **array**: JSON array with structured data (requires `--schema` flag)

The tool uses Zod schemas to ensure the AI model returns data in the requested format. When using `object` or `array` formats, you must provide a Zod schema string via the `--schema` flag.

### Schema Examples

- String array: `--format array --schema "z.string()"`
- URL array: `--format array --schema "z.url()"` (not supported by all models)
- Object array: `--format array --schema "z.object({name:z.string(),age:z.number()})"`
- Single object: `--format object --schema "z.object({total:z.number(),items:z.array(z.string())})"`

## Development

```sh
# Install dependencies
npm install

# Run tests
npm test

# Lint and format code
npm run format

# Run the CLI in development
npm start -- "Your prompt here"

# Or run directly
./bin/index.js "Your prompt here"
```

## Related

- [Vercel AI SDK](https://sdk.vercel.ai/) - Toolkit for building AI applications
- [OpenRouter](https://openrouter.ai/) - Unified API for LLMs
