#!/usr/bin/env node

import { Command } from 'commander'
import pkg from '../package.json' with { type: 'json' }
import { executePrompt } from '../src/index.js'
import { fetchUrlContent, hasStdinData, readFileContent, readStdin } from '../src/utils/input.js'
import { replaceVariables } from '../src/utils/variables.js'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

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
  $ heyi "preset in {{language}}" --var language="German"
  $ heyi "preset in {{input}} and output in {{output}}" --var input="German" --var output="English"
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
`

const action = async (prompt, options) => {
  try {
    // Validate that schema is provided for object/array formats
    if ((options.format === 'object' || options.format === 'array') && !options.schema) {
      throw new Error(`--schema or -s is required when format is '${options.format}'`)
    }

    // Handle file content as context
    const fileContents = []
    if (options.file) {
      for (const filePath of options.file) {
        const content = await readFileContent(filePath)
        fileContents.push({ path: filePath, content })
      }
    }

    // Handle URL content as context
    const urlContents = []
    if (options.url) {
      for (const url of options.url) {
        const content = await fetchUrlContent(url)
        urlContents.push({ path: url, content })
      }
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

    // Build the final prompt
    let finalPrompt = prompt ?? stdinContent

    // Replace variables in the prompt
    if (options.var) {
      finalPrompt = replaceVariables(finalPrompt, options.var)
    }

    // Combine file and URL contexts
    const allContexts = [...fileContents, ...urlContents]
    if (allContexts.length > 0) {
      const contextItems = allContexts.map(({ path, content }) => `Source: ${path}\n${content}`).join('\n\n---\n\n')
      const contextLabel = allContexts.length === 1 ? 'Context from source:' : 'Context from sources:'
      finalPrompt = `${finalPrompt}\n\n${contextLabel}\n${contextItems}`
    }

    const result = await executePrompt(finalPrompt, {
      model: options.model,
      format: options.format,
      schema: options.schema,
    })

    console.log(result)
  } catch (error) {
    const relevantFields = Object.keys(error).filter((key) => ['stack', 'isRetryable', 'data'].includes(key) === false)
    const relevantError = Object.fromEntries(relevantFields.map((key) => [key, error[key]]))
    console.error(relevantError)

    process.exit(1)
  }
}

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .argument('[prompt]', 'The AI prompt to execute (optional when using stdin)')
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
    '--var <key=value>',
    'Define variables for replacement in prompt using {{key}} syntax (can be used multiple times)',
    (value, previous) => {
      const [key, ...valueParts] = value.split('=')
      const variableValue = valueParts.join('=') // Handle values with = in them
      if (!key || variableValue === undefined) {
        throw new Error(`Invalid --var format: '${value}'. Expected format: key=value`)
      }
      return { ...previous, [key]: variableValue }
    },
    {},
  )
  .addHelpText('after', helpText)
  .action(action)
  .parse()
