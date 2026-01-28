#!/usr/bin/env node

import { Command } from 'commander'
import { z } from 'zod'
import pkg from '../package.json' with { type: 'json' }
import { executePrompt } from '../src/index.js'
import { hasFlag } from '../src/utils/argv.js'
import { hasStdinData, readStdin } from '../src/utils/input.js'
import { loadPreset } from '../src/utils/preset.js'
import { buildPrompt } from '../src/utils/prompt.js'
import { findUndefinedVariables, promptForVariable, replaceVariables } from '../src/utils/variables.js'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const DEFAULT_CRAWLER = 'fetch'

const modelFlag = ['-m, --model <model>', 'AI model to use', process.env.HEYI_MODEL ?? DEFAULT_MODEL]
const formatFlag = ['-f, --format <format>', 'Output format: string, number, object, array', 'string']
const schemaFlag = [
  '-s, --schema <schema>',
  'Zod schema for object/array format (required when format is object or array)',
]
const crawlerFlag = [
  '-c, --crawler <crawler>',
  'Crawler to use for fetching URLs: fetch, chrome',
  process.env.HEYI_CRAWLER ?? DEFAULT_CRAWLER,
]
const fileFlag = [
  '--file <path>',
  'Read content from file and include as context (can be used multiple times)',
  (value, previous) => {
    return previous ? [...previous, value] : [value]
  },
]
const urlFlag = [
  '--url <url>',
  'Fetch content from URL and include as context (can be used multiple times)',
  (value, previous) => {
    return previous ? [...previous, value] : [value]
  },
]
const varFlag = [
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
]

const hasModelFlag = hasFlag(['--model', '-m'])
const hasFormatFlag = hasFlag(['--format', '-f'])
const hasSchemaFlag = hasFlag(['--schema', '-s'])
const hasCrawlerFlag = hasFlag(['--crawler', '-c'])

const program = new Command()

const helpText = `
Examples:
  # Prompts
  $ heyi prompt "What is the capital of France?"
  $ heyi prompt "What is quantum computing?" --model google/gemini-2.5-pro
  $ heyi help prompt

  # Presets
  $ heyi preset file.json
  $ heyi preset file.json --model google/gemini-2.5-pro
  $ heyi help preset
`

const promptHelpText = `
Examples:
  $ heyi prompt "What is the capital of France?"
  $ heyi prompt "What is quantum computing?" --model google/gemini-2.5-pro

  # Different output formats
  $ heyi prompt "List 5 programming languages" --format array --schema "z.string()"
  $ heyi prompt "Analyze this data" --format object --schema "z.object({revenue:z.number(),costs:z.number()})"
  $ heyi prompt "List 3 countries" --format array --schema "z.object({name:z.string(),capital:z.string()})"

  # Variable replacement
  $ heyi prompt "Preset in {{language}}" --var language="German"

  # Interactive variable prompting (will prompt for undefined variables)
  $ heyi prompt "Translate {{text}} to {{language}}"

  # Variable with description (shows during prompt)
  $ heyi prompt "Explain {{topic description='What to explain'}} in simple terms"

  # Environment variables
  $ HEYI_MODEL=perplexity/sonar heyi prompt "Explain AI"
  $ HEYI_API_KEY=your-key heyi prompt "Hello, AI!"

  # Attach context
  $ heyi prompt "Summarize this content" --file input.txt
  $ heyi prompt "Compare these files" --file a.txt --file b.txt
  $ heyi prompt "Summarize this article" --url https://example.com/article.html

  # Input from stdin
  $ cat prompt.txt | heyi prompt
`

const presetHelpText = `
Examples:
  $ heyi preset file.json
  $ heyi preset file.json --model google/gemini-2.5-pro

  # Overwrite options from preset
  $ heyi preset file.json --model openai/gpt-4
  $ heyi preset file.json --format array --schema "z.string()"

  # Variable replacement
  $ heyi preset file.json --var language=german

  # Interactive variable prompting (will prompt for undefined variables)
  $ heyi preset file.json
  # (prompts for any variables in preset not provided via --var)

  # Attach additional context
  $ heyi preset file.json --file additional.txt
  $ heyi preset file.json --url https://example.com/additional.html
`

const optionsSchema = z
  .object({
    model: z.string(),
    format: z.enum(['string', 'number', 'object', 'array']),
    schema: z.string().optional(),
    crawler: z.enum(['fetch', 'chrome']),
    files: z.array(z.string()).default([]),
    urls: z.array(z.string()).default([]),
    vars: z.record(z.string(), z.string()).default({}),
  })
  .refine((data) => !['object', 'array'].includes(data.format) || data.schema, {
    message: '--schema or -s is required when format is object or array',
    path: ['schema'],
  })

const flagsToOptions = (flags) => {
  return optionsSchema.parse({
    model: flags.model,
    format: flags.format,
    schema: flags.schema,
    crawler: flags.crawler,
    files: flags.file,
    urls: flags.url,
    vars: flags.var,
  })
}

const mergeOptionsWithPreset = (options, presetContent) => {
  return optionsSchema.parse({
    // Overwrite model, format, schema, crawler only if not provided via flags
    model: hasModelFlag ? options.model : (presetContent.model ?? options.model),
    format: hasFormatFlag ? options.format : (presetContent.format ?? options.format),
    schema: hasSchemaFlag ? options.schema : (presetContent.schema ?? options.schema),
    crawler: hasCrawlerFlag ? options.crawler : (presetContent.crawler ?? options.crawler),
    // Merge files
    files: [...presetContent.files, ...options.files],
    // Merge URLs
    urls: [...presetContent.urls, ...options.urls],
    // Keep vars as is
    vars: options.vars,
  })
}

const executePromptAction = async (prompt, flags) => {
  try {
    // Handle stdin input
    let stdinContent = null
    if (hasStdinData()) {
      stdinContent = await readStdin()
    }

    // Validate that we have a prompt
    if (!prompt && !stdinContent) {
      throw new Error('A prompt is required either as an argument or via stdin')
    }

    // Build options from flags
    const options = flagsToOptions(flags)

    // Get the user prompt (prefer argument over stdin)
    const rawPrompt = prompt ?? stdinContent

    // Find undefined variables in the prompt
    const undefinedVars = findUndefinedVariables(rawPrompt, options.vars)

    // Prompt user for each undefined variable
    for (const varInfo of undefinedVars) {
      const value = await promptForVariable(varInfo.name, varInfo.description)
      options.vars[varInfo.name] = value
    }

    // Build the prompt with all variables replaced
    const userPrompt = replaceVariables(rawPrompt, options.vars)
    const finalPrompt = await buildPrompt(userPrompt, options.files, options.urls, options.crawler)

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

const executePresetAction = async (preset, flags) => {
  try {
    // Validate that preset file is provided
    if (!preset) {
      throw new Error('Preset file path is required when using "preset" command')
    }

    // Load preset and use prompt from it
    const presetContent = await loadPreset(preset)
    const prompt = presetContent.prompt

    // Build options from flags and merge with preset
    const options = mergeOptionsWithPreset(flagsToOptions(flags), presetContent)

    // Find undefined variables in the prompt
    const undefinedVars = findUndefinedVariables(prompt, options.vars)

    // Prompt user for each undefined variable
    for (const varInfo of undefinedVars) {
      const value = await promptForVariable(varInfo.name, varInfo.description)
      options.vars[varInfo.name] = value
    }

    // Build the prompt with all variables replaced
    const userPrompt = replaceVariables(prompt, options.vars)
    const finalPrompt = await buildPrompt(userPrompt, options.files, options.urls, options.crawler)

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

program.name(pkg.name).description(pkg.description).version(pkg.version).addHelpText('after', helpText)

program
  .command('prompt')
  .argument('[prompt]', 'The AI prompt to execute (optional when using stdin)')
  .option(...modelFlag)
  .option(...formatFlag)
  .option(...schemaFlag)
  .option(...crawlerFlag)
  .option(...fileFlag)
  .option(...urlFlag)
  .option(...varFlag)
  .addHelpText('after', promptHelpText)
  .action(executePromptAction)

program
  .command('preset')
  .argument('[file]', 'Path to preset JSON file')
  .option(...modelFlag)
  .option(...formatFlag)
  .option(...schemaFlag)
  .option(...crawlerFlag)
  .option(...fileFlag)
  .option(...urlFlag)
  .option(...varFlag)
  .addHelpText('after', presetHelpText)
  .action(executePresetAction)

program.parse()
