import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { launch } from 'puppeteer'
import sanitizeHtml from 'sanitize-html'

/**
 * Check if the crawler value is a path to a browser executable.
 * Paths must start with '/' (absolute) or './' or '../' (relative).
 *
 * @param {string} crawler - Crawler value to check
 * @returns {boolean} True if the value appears to be a file path
 */
const isBrowserPath = (crawler) => {
  // Ensure crawler is a non-empty string
  if (!crawler || typeof crawler !== 'string') {
    return false
  }
  return crawler.startsWith('/') || crawler.startsWith('./') || crawler.startsWith('../')
}

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
 * @param {string} crawler - Crawler value: 'chrome' or path to browser executable
 * @returns {Promise<string>} The URL content
 */
const fetchUrlContentWithChrome = async (url, crawler = 'chrome') => {
  validateUrl(url)
  const launchOptions = {
    headless: true,
    // These args are required for running in containerized environments (e.g., Docker, CI/CD)
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }

  // If crawler is a path to a browser executable, use it as executablePath
  // Note: Puppeteer will validate the executable when launch() is called.
  // If the path doesn't exist or isn't a valid browser, launch() will throw an error.
  if (isBrowserPath(crawler)) {
    launchOptions.executablePath = crawler
  }

  const browser = await launch(launchOptions)
  try {
    const page = await browser.newPage()
    // Wait for network to be idle, with a 30-second timeout to prevent indefinite waiting
    // networkidle0 is specifically used for JavaScript-heavy pages to ensure all dynamic content is loaded
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
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
 * @param {string} crawler - Crawler to use: 'fetch', 'chrome', or path to browser executable (default: 'fetch')
 * @returns {Promise<string>} The URL content
 */
export const fetchUrlContent = async (url, crawler = 'fetch') => {
  try {
    // Use Chrome crawler if 'chrome' is specified or if it's a path to a browser executable
    const shouldUseChrome = crawler === 'chrome' || isBrowserPath(crawler)
    return shouldUseChrome ? await fetchUrlContentWithChrome(url, crawler) : await fetchUrlContentWithFetch(url)
  } catch (error) {
    throw new Error(`Failed to fetch URL '${url}'`, { cause: error })
  }
}
