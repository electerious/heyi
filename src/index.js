import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { config } from 'dotenv'
import { getFormatSchema } from './utils/schema.js'

// Load environment variables from .env file
config()

/**
 * Execute an AI prompt with the specified model and format.
 *
 * @param {string} prompt - The user's prompt
 * @param {object} options - Configuration options
 * @param {string} options.model - The AI model to use
 * @param {string} options.format - The output format (string, number, object, array)
 * @param {string} options.schema - The Zod schema string for object/array format
 * @returns {Promise<string>} The formatted AI response
 */
export const executePrompt = async (prompt, options = {}) => {
  const { model, format = 'string', schema } = options

  const apiKey = process.env.HEYI_API_KEY
  if (!apiKey) {
    throw new Error('HEYI_API_KEY environment variable is required. Set it via environment or .env file.')
  }

  const openrouter = createOpenRouter({
    apiKey,
  })

  const zodSchema = getFormatSchema(format, schema)
  const { object } = await generateObject({
    model: openrouter(model),
    prompt,
    schema: zodSchema,
  })

  switch (format) {
    case 'string':
    case 'number': {
      return object.result
    }
    case 'object':
    case 'array': {
      return JSON.stringify(object.result, null, 2)
    }
    default: {
      throw new Error(`Can't format response for unknown format '${format}'`)
    }
  }
}
