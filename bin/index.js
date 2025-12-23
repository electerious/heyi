#!/usr/bin/env node

import { Command } from 'commander'
import { z } from 'zod'
import pkg from '../package.json' with { type: 'json' }
import { executePrompt } from '../src/index.js'
import { hasFlag } from '../src/utils/argv.js'
import { hasStdinData, readStdin } from '../src/utils/input.js'
import { loadPreset } from '../src/utils/preset.js'
import { buildPrompt } from '../src/utils/prompt.js'
import { replaceVariables } from '../src/utils/variables.js'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

const hasModelFlag = hasFlag(['--model', '-m'])
const hasFormatFlag = hasFlag(['--format', '-f'])
const hasSchemaFlag = hasFlag(['--schema', '-s'])

const program = new Command()

const helpText = `
Examples:
  $ heyi "What is the capital of France?"
  $ heyi "What is quantum computing?" --model google/gemini-2.5-pro

  # Different output formats
  $ heyi "List 5 programming languages" --format array --schema "z.string()"
  $ heyi "Analyze this data" --format object --schema "z.object({revenue:z.number(),costs:z.number()})"
  $ heyi "List 3 countries" --format array --schema "z.object({name:z.string(),capital:z.string()})"

  # Variable replacement
  $ heyi "Preset in {{language}}" --var language="German"
  $ heyi "Preset in {{input}} and output in {{output}}" --var input="German" --var output="English"
  $ echo "Translate to {{lang}}" | heyi --var lang="Spanish"

  # Environment variables
  $ MODEL=perplexity/sonar heyi "Explain AI"
  $ API_KEY=your-key heyi "Hello, AI!"

  # Input from stdin, files, or URLs
  $ heyi "Summarize this content" --file input.txt
  $ heyi "Compare these files" --file a.txt --file b.txt
  $ heyi "Summarize this article" --url https://example.com/article.html
  $ heyi "Compare these sources" --file local.txt --url https://example.com/remote.txt
  $ cat prompt.txt | heyi

  # Preset files
  $ heyi preset file.json
  $ heyi preset file.json --var language=german
  $ heyi preset file.json --model model2
  $ heyi preset file.json --file additional.txt
`

const optionsSchema = z
  .object({
    model: z.string(),
    format: z.enum(['string', 'number', 'object', 'array']),
    schema: z.string().optional(),
    files: z.array(z.string()).default([]),
    urls: z.array(z.string()).default([]),
    vars: z.record(z.string(), z.string()).default({}),
  })
  .refine((data) => !['object', 'array'].includes(data.format) || data.schema, {
    message: '--schema or -s is required when format is object or array',
    path: ['schema'],
  })

const action = async (prompt, presetFile, flags) => {
  try {
    // Build options from flags
    let options = optionsSchema.parse({
      model: flags.model,
      format: flags.format,
      schema: flags.schema,
      files: flags.file,
      urls: flags.url,
      vars: flags.var,
    })

    // Validate that preset file is provided when using preset mode
    if (prompt === 'preset' && !presetFile) {
      throw new Error('Preset file path is required when using "preset" command')
    }

    // Check if using preset mode
    if (prompt === 'preset') {
      const preset = await loadPreset(presetFile)

      // Use prompt from preset
      prompt = preset.prompt

      // Update options with preset values
      options = optionsSchema.parse({
        // Overwrite model, format, schema only if not provided via flags
        model: hasModelFlag ? options.model : (preset.model ?? options.model),
        format: hasFormatFlag ? options.format : (preset.format ?? options.format),
        schema: hasSchemaFlag ? options.schema : (preset.schema ?? options.schema),
        // Merge files
        files: [...preset.files, ...options.files],
        // Merge URLs
        urls: [...preset.urls, ...options.urls],
        // Keep vars as is
        vars: options.vars,
      })
    }

    // Handle stdin input
    let stdinContent = null
    if (hasStdinData()) {
      stdinContent = await readStdin()
    }

    // Validate that we have a prompt
    if (!prompt && !stdinContent) {
      throw new Error('A prompt is required. Provide it as an argument or via stdin.')
    }

    // Build the prompt and prefer the argument over stdin
    const userPrompt = replaceVariables(prompt ?? stdinContent, options.vars)
    const finalPrompt = await buildPrompt(userPrompt, options.files, options.urls)

    const result = await executePrompt(finalPrompt, {
      model: options.model,
      format: options.format,
      schema: options.schema,
    })

    console.log(result)
  } catch (error) {
    console.error(error)

    process.exit(1)
  }
}

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .argument('[prompt]', 'The AI prompt to execute, or "preset" to load from a preset file (optional when using stdin)')
  .argument('[presetFile]', 'Path to preset JSON file (required when first argument is "preset")')
  .option('-m, --model <model>', 'AI model to use', process.env.MODEL ?? DEFAULT_MODEL)
  .option('-f, --format <format>', 'Output format: string, number, object, array', 'string')
  .option('-s, --schema <schema>', 'Zod schema for object/array format (required when format is object or array)')
  .option(
    '--file <path>',
    'Read content from file and include as context (can be used multiple times)',
    (value, previous) => {
      return previous ? [...previous, value] : [value]
    },
  )
  .option(
    '--url <url>',
    'Fetch content from URL and include as context (can be used multiple times)',
    (value, previous) => {
      return previous ? [...previous, value] : [value]
    },
  )
  .option(
    '--var <variable=value>',
    'Define variables for replacement in prompt using {{variable}} syntax (can be used multiple times)',
    (value, previous) => {
      const [variable, ...variableValueParts] = value.split('=')
      const variableValue = variableValueParts.join('=') // Handle values with = in them

      if (!variable) {
        throw new Error(`Invalid --var format: '${value}'. Expected format: variable=value`)
      }

      return { ...previous, [variable]: variableValue }
    },
  )
  .addHelpText('after', helpText)
  .action(action)
  .parse()
