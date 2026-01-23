import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { launch } from 'puppeteer'
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
 * Validate that a URL uses http or https protocol.
 *
 * @param {string} url - URL to validate
 * @throws {Error} If URL is invalid or uses a dangerous protocol
 */
const validateUrl = (url) => {
  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol '${parsedUrl.protocol}'. Only http and https are supported.`)
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL format: ${url}`)
    }
    throw error
  }
}

/**
 * Fetch content from a URL using fetch API.
 *
 * @param {string} url - URL to fetch content from
 * @returns {Promise<string>} The URL content
 */
const fetchUrlContentWithFetch = async (url) => {
  validateUrl(url)
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
}

/**
 * Fetch content from a URL using Chrome/Puppeteer.
 *
 * @param {string} url - URL to fetch content from
 * @returns {Promise<string>} The URL content
 */
const fetchUrlContentWithChrome = async (url) => {
  validateUrl(url)

  const browser = await launch({
    headless: true,
    // These args are required for running in containerized environments (e.g., Docker, CI/CD)
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    // Wait for network to be idle, with a 10-second timeout to prevent indefinite waiting.
    // If timeout occurs, continue with whatever content is available.
    // Wait for navigation in case there are client-side redirects.
    try {
      await Promise.all([
        page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 }),
        page.waitForNavigation({ timeout: 10000 }),
      ])
    } catch (error) {
      // If it's a timeout error, continue with the content that's already loaded
      // For other errors (e.g., network errors), rethrow
      if (!error.message.includes('timeout') && !error.message.includes('Navigation timeout')) {
        throw error
      }
    }

    const html = await page.content()

    // Sanitize HTML to extract only text content and avoid large data
    const cleanText = sanitizeHtml(html, {
      allowedTags: [],
      allowedAttributes: {},
      allowedSchemes: [],
      allowedSchemesAppliedToAttributes: [],
    })
    return cleanText.trim()
  } finally {
    await browser.close()
  }
}

/**
 * Fetch content from a URL.
 *
 * @param {string} url - URL to fetch content from
 * @param {string} crawler - Crawler to use: 'fetch' or 'chrome' (default: 'fetch')
 * @returns {Promise<string>} The URL content
 */
export const fetchUrlContent = async (url, crawler = 'fetch') => {
  try {
    return crawler === 'chrome' ? await fetchUrlContentWithChrome(url) : await fetchUrlContentWithFetch(url)
  } catch (error) {
    throw new Error(`Failed to fetch URL '${url}'`, { cause: error })
  }
}
