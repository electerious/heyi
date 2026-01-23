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
heyi prompt [prompt] [options]
heyi preset [file] [options]
```

#### Options

- `-m, --model <model>` - AI model to use (default: `openai/gpt-4o-mini`)
- `-f, --format <format>` - Output format: `string`, `number`, `object`, `array` (default: `string`)
- `-s, --schema <schema>` - Zod schema for object/array format (required when format is `object` or `array`)
- `-c, --crawler <crawler>` - Crawler to use for fetching URLs: `fetch`, `chrome`, or path to browser executable (default: `fetch`)
- `--file <path>` - Read content from file and include as context (can be used multiple times)
- `--url <url>` - Fetch content from URL and include as context (can be used multiple times)
- `--var <key=value>` - Define variables for replacement in prompt using `{{key}}` syntax (can be used multiple times)
- `-h, --help` - Display help information
- `-V, --version` - Display version number

#### Environment Variables

- `HEYI_API_KEY` - OpenRouter API key (required, can be set via environment or `.env` file)
- `HEYI_MODEL` - Default AI model to use (optional, can be overridden with `--model` flag)
- `HEYI_CRAWLER` - Default crawler to use for fetching URLs: `fetch`, `chrome`, or path to browser executable (optional, can be overridden with `--crawler` flag)

### Examples

```sh
# Simple text prompt
heyi prompt "What is the capital of France?"

# Use a different model
heyi prompt "Explain quantum computing" --model google/gemini-2.0-flash-exp

# Get structured output as array of strings
heyi prompt "List 5 programming languages" --format array --schema "z.string()"

# Get structured output as array of objects
heyi prompt "List 3 countries with their capitals" --format array --schema "z.object({name:z.string(),capital:z.string()})"

# Get structured output as single object
heyi prompt "Analyze: revenue 100k, costs 60k" --format object --schema "z.object({revenue:z.number(),costs:z.number()})"

# Complex nested schema
heyi prompt "Analyze top 3 tech companies" --format array --schema "z.object({name:z.string(),founded:z.number(),products:z.array(z.string())})"

# Variable replacement in prompts
heyi prompt "Preset in {{language}}" --var language="German"
heyi prompt "Preset in {{input}} and output in {{output}}" --var input="German" --var output="English"

# Variable replacement with stdin
echo "Translate to {{language}}" | heyi prompt --var language="Spanish"

# Set default model via environment variable
HEYI_MODEL=perplexity/sonar heyi prompt "Explain AI"

# Set API key via environment variable
HEYI_API_KEY=your-key heyi prompt "Hello, AI!"

# Input from file as context
heyi prompt "Summarize this content" --file input.txt

# Input from multiple files as context
heyi prompt "Compare these files" --file file1.txt --file file2.txt
heyi prompt "Analyze all these documents" --file doc1.md --file doc2.md --file doc3.md

# Input from URL as context
heyi prompt "Summarize this article" --url https://example.com/article.html

# Input from multiple URLs as context
heyi prompt "Compare these articles" --url https://example.com/article1.html --url https://example.com/article2.html

# Use Chrome crawler for JavaScript-heavy pages
heyi prompt "Summarize this SPA" --url https://example.com/spa --crawler chrome
HEYI_CRAWLER=chrome heyi prompt "Get content from dynamic page" --url https://example.com/dynamic

# Use custom browser executable
heyi prompt "Fetch page with custom Chrome" --url https://example.com --crawler /usr/bin/chromium
HEYI_CRAWLER=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome heyi prompt "Get content" --url https://example.com

# Mix files and URLs as context
heyi prompt "Compare local and remote content" --file local.txt --url https://example.com/remote.txt

# Input from stdin
cat article.md | heyi prompt "Extract all URLs mentioned"
echo "Analyze this text" | heyi prompt

# Preset files
heyi preset file.json
heyi preset file.json --var language=german
heyi preset file.json --model openai/gpt-4o
heyi preset file.json --file additional.txt --url https://example.com
```

## Preset Files

Preset files allow you to define reusable configurations with prompts, models, files, and URLs. Create a JSON file with the following structure:

```json
{
  "prompt": "Your prompt with {{variables}}",
  "model": "openai/gpt-4o-mini",
  "format": "array",
  "schema": "z.string()",
  "crawler": "fetch",
  "files": ["path/to/file1.txt", "path/to/file2.txt"],
  "urls": ["https://example.com/page.html"]
}
```

### Preset Configuration

- **prompt**: The AI prompt to execute. Supports variable replacement using `{{variable}}` syntax.
- **model** (optional): AI model to use (e.g., `openai/gpt-4o-mini`, `google/gemini-2.0-flash-exp`).
- **format** (optional): Output format: `string`, `number`, `object`, `array` (default: `string`).
- **schema** (optional): Zod schema for object/array format (required when format is `object` or `array`).
- **crawler** (optional): Crawler to use for fetching URLs: `fetch`, `chrome`, or path to browser executable (default: `fetch`).
- **files** (optional): Array of file paths to include as context.
- **urls** (optional): Array of URLs to fetch and include as context.

### Preset Examples

**Basic preset with variables:**

```json
{
  "prompt": "Explain {{topic}} in {{language}}"
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

**Preset with structured output:**

```json
{
  "prompt": "List programming languages mentioned in these files",
  "format": "array",
  "schema": "z.string()",
  "files": ["code1.js", "code2.py"]
}
```

```sh
heyi preset languages.json
```

### CLI Override Behavior

- **Model override**: Using `--model` flag overrides the model specified in the preset file.
- **Format override**: Using `--format` flag overrides the format specified in the preset file.
- **Schema override**: Using `--schema` flag overrides the schema specified in the preset file.
- **Crawler override**: Using `--crawler` flag overrides the crawler specified in the preset file.
- **Files and URLs append**: Using `--file` or `--url` flags adds additional context to the preset's files and URLs.
- **Variables**: Use `--var` to replace variables in the preset's prompt.

```sh
# Override model from preset
heyi preset file.json --model openai/gpt-4o

# Override format from preset
heyi preset file.json --format object --schema "z.object({name:z.string()})"

# Override crawler from preset
heyi preset file.json --crawler chrome

# Add additional files to preset's files
heyi preset file.json --file extra.txt

# Replace variables in preset prompt
heyi preset file.json --var name="Alice" --var role="developer"
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

## Crawlers

The tool supports different crawlers for fetching content from URLs:

- **fetch** (default): Uses the native `fetch` API to retrieve HTML content. Fast and lightweight, but may not work well with JavaScript-heavy or dynamically rendered pages.
- **chrome**: Uses Puppeteer to launch a headless Chrome browser and retrieve content after the page has fully loaded. Ideal for single-page applications (SPAs) and JavaScript-heavy websites, but slower and requires more resources.
- **custom path**: You can specify a path to a custom browser executable (e.g., `/usr/bin/chromium`, `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). The path must start with `/` (absolute path), `./` or `../` (relative path). This allows you to use a specific browser installation already on your system.

### When to Use Chrome Crawler

Use the `chrome` crawler or custom browser path when:

- The target website relies heavily on JavaScript for rendering content
- Content is loaded dynamically after the initial page load
- You need to interact with a single-page application (SPA)
- The `fetch` crawler returns incomplete or missing content
- You want to use a specific browser version or installation on your system

### Crawler Examples

```sh
# Use default fetch crawler
heyi prompt "Summarize this page" --url https://example.com

# Use Chrome crawler for JS-heavy page
heyi prompt "Extract data from SPA" --url https://app.example.com --crawler chrome

# Set Chrome as default crawler via environment
HEYI_CRAWLER=chrome heyi prompt "Get content" --url https://dynamic-site.com

# Use custom browser executable (Linux)
heyi prompt "Fetch with Chromium" --url https://example.com --crawler /usr/bin/chromium

# Use custom browser executable (macOS)
heyi prompt "Fetch with Chrome" --url https://example.com --crawler /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome

# Set custom browser as default via environment
HEYI_CRAWLER=/usr/bin/chromium-browser heyi prompt "Get content" --url https://example.com
```

## Development

```sh
# Install dependencies
npm install

# Run tests
npm test

# Lint and format code
npm run format

# Run the CLI in development
npm start -- prompt "Your prompt here"

# Or run directly
./bin/index.js prompt "Your prompt here"
```

## Related

- [Vercel AI SDK](https://sdk.vercel.ai/) - Toolkit for building AI applications
- [OpenRouter](https://openrouter.ai/) - Unified API for LLMs
