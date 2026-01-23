import { fetchUrlContent, readFileContent } from './input.js'

/**
 * Build a prompt with context by combining prompt with file and URL contexts.
 *
 * @param {string} prompt - The prompt
 * @param {string[]} filePaths - Array of file paths to include as context
 * @param {string[]} urls - Array of URLs to include as context
 * @param {string} crawler - Crawler to use for fetching URLs: 'fetch', 'chrome', or path to browser executable (default: 'fetch')
 * @returns {Promise<string>} The final prompt with all contexts combined
 */
export const buildPrompt = async (prompt, filePaths = [], urls = [], crawler = 'fetch') => {
  // Handle file content as context
  const fileContents = []
  for (const filePath of filePaths) {
    const content = await readFileContent(filePath)
    fileContents.push({ path: filePath, content })
  }

  // Handle URL content as context
  const urlContents = []
  for (const url of urls) {
    const content = await fetchUrlContent(url, crawler)
    urlContents.push({ path: url, content })
  }

  // Combine file and URL contexts
  const allContexts = [...fileContents, ...urlContents]
  if (allContexts.length > 0) {
    const contextItems = allContexts.map(({ path, content }) => `Source: ${path}\n${content}`).join('\n\n---\n\n')
    const contextLabel = allContexts.length === 1 ? 'Context from source:' : 'Context from sources:'

    return `${prompt}\n\n${contextLabel}\n${contextItems}`
  }

  return prompt
}
