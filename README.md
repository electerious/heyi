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
- `--url <url>` - Fetch content from URL and include as context (can be used multiple times)
- `--var <key=value>` - Define variables for replacement in prompt using `{{key}}` syntax (can be used multiple times)
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

# Variable replacement in prompts
heyi "Preset in {{language}}" --var language="German"
heyi "Preset in {{input}} and output in {{output}}" --var input="German" --var output="English"

# Variable replacement with stdin
echo "Translate to {{lang}}" | heyi --var lang="Spanish"

# Set default model via environment variable
MODEL=perplexity/sonar heyi "Explain AI"

# Set API key via environment variable
API_KEY=your-key heyi "Hello, AI!"

# Input from file as context
heyi "Summarize this content" --file input.txt

# Input from multiple files as context
heyi "Compare these files" --file file1.txt --file file2.txt
heyi "Analyze all these documents" --file doc1.md --file doc2.md --file doc3.md

# Input from URL as context
heyi "Summarize this article" --url https://example.com/article.html

# Input from multiple URLs as context
heyi "Compare these articles" --url https://example.com/article1.html --url https://example.com/article2.html

# Mix files and URLs as context
heyi "Compare local and remote content" --file local.txt --url https://example.com/remote.txt

# Input from stdin
cat article.md | heyi "Extract all URLs mentioned"
echo "Analyze this text" | heyi

# Preset files
heyi preset config.json
heyi preset config.json --var language=german
heyi preset config.json --model openai/gpt-4o
heyi preset config.json --file additional.txt --url https://example.com
```

## Preset Files

Preset files allow you to define reusable configurations with prompts, models, files, and URLs. Create a JSON file with the following structure:

```json
{
  "prompt": "Your prompt with {{variables}}",
  "model": "openai/gpt-4o-mini",
  "files": ["path/to/file1.txt", "path/to/file2.txt"],
  "urls": ["https://example.com/page.html"]
}
```

### Preset Configuration

- **prompt** (optional): The AI prompt to execute. Supports variable replacement using `{{variable}}` syntax.
- **model** (optional): AI model to use (e.g., `openai/gpt-4o-mini`, `google/gemini-2.0-flash-exp`).
- **files** (optional): Array of file paths to include as context.
- **urls** (optional): Array of URLs to fetch and include as context.

### Preset Examples

**Basic preset with variables:**

```json
{
  "prompt": "Explain {{topic}} in {{language}}",
  "model": "openai/gpt-4o-mini"
}
```

```sh
heyi preset explain.json --var topic="quantum computing" --var language="simple terms"
```

**Preset with files and URLs:**

```json
{
  "prompt": "Analyze and compare the following documents",
  "model": "google/gemini-2.0-flash-exp",
  "files": ["report1.txt", "report2.txt"],
  "urls": ["https://example.com/data.html"]
}
```

```sh
heyi preset analyze.json
```

### CLI Override Behavior

- **Model override**: Using `--model` flag overrides the model specified in the preset file.
- **Files and URLs append**: Using `--file` or `--url` flags adds additional context to the preset's files and URLs.
- **Variables**: Use `--var` to replace variables in the preset's prompt.

```sh
# Override model from preset
heyi preset config.json --model openai/gpt-4o

# Add additional files to preset's files
heyi preset config.json --file extra.txt

# Replace variables in preset prompt
heyi preset config.json --var name="Alice" --var role="developer"
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
