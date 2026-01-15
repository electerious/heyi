import { readFile } from 'node:fs/promises'
import { z } from 'zod'

const presetSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  format: z.enum(['string', 'number', 'object', 'array']).optional(),
  schema: z.string().optional(),
  crawler: z.enum(['fetch', 'chrome']).optional(),
  files: z.array(z.string()).default([]),
  urls: z.array(z.string()).default([]),
})

/**
 * Load and parse a preset JSON file.
 *
 * @param {string} filePath - Path to the preset JSON file
 * @returns {Promise<object>} The parsed preset configuration
 */
export const loadPreset = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf8')
    const preset = JSON.parse(content)

    return presetSchema.parse(preset)
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Preset file '${filePath}' not found`, { cause: error })
    }

    throw new Error(`Error while parsing preset file '${filePath}'`, { cause: error })
  }
}
