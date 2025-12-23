import { readFile } from 'node:fs/promises'

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

    // Validate preset structure
    if (typeof preset !== 'object' || preset === null) {
      throw new Error('Preset file must contain a JSON object')
    }

    // Normalize arrays
    if (preset.files && !Array.isArray(preset.files)) {
      throw new Error('Preset "files" field must be an array')
    }
    if (preset.urls && !Array.isArray(preset.urls)) {
      throw new Error('Preset "urls" field must be an array')
    }

    return {
      prompt: preset.prompt ?? null,
      model: preset.model ?? null,
      files: preset.files ?? [],
      urls: preset.urls ?? [],
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Preset file not found: '${filePath}'`)
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in preset file '${filePath}': ${error.message}`)
    }
    throw error
  }
}
