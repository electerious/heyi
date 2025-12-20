import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import sanitizeHtml from 'sanitize-html'

/**
 * Read content from a file.
 *
 * @param {string} filePath - Path to the file to read
 * @returns {Promise<string>} The file content
 */
export const readFileContent = async (filePath) => {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    throw new Error(`Failed to read file '${filePath}'`, { cause: error })
  }
}

/**
 * Read content from stdin.
 *
 * @returns {Promise<string>} The stdin content
 */
export const readStdin = () => {
  const { promise, resolve, reject } = Promise.withResolvers()

  let data = ''

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on('line', (line) => {
    data += line + '\n'
  })

  rl.on('close', () => {
    resolve(data.trim())
  })

  rl.on('error', (error) => {
    reject(new Error(`Failed to read stdin`, { cause: error }))
  })

  return promise
}

/**
 * Check if stdin has data available.
 *
 * @returns {boolean} True if stdin has data
 */
export const hasStdinData = () => {
  return !process.stdin.isTTY
}

/**
 * Fetch content from a URL.
 *
 * @param {string} url - URL to fetch content from
 * @returns {Promise<string>} The URL content
 */
export const fetchUrlContent = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const html = await response.text()
    // Sanitize HTML to extract only text content and avoid large data
    const cleanText = sanitizeHtml(html, {
      allowedTags: [],
      allowedAttributes: {},
      allowedSchemes: [],
      allowedSchemesAppliedToAttributes: [],
    })
    return cleanText.trim()
  } catch (error) {
    throw new Error(`Failed to fetch URL '${url}'`, { cause: error })
  }
}
