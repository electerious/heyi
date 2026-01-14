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
 * Fetch content from a URL using fetch API.
 *
 * @param {string} url - URL to fetch content from
 * @returns {Promise<string>} The URL content
 */
const fetchUrlContentWithFetch = async (url) => {
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
  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0' })
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
