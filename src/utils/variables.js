/**
 * Replace variables in a prompt string.
 *
 * @param {string} prompt - The prompt with variables in {{variable}} format
 * @param {object} variables - Object with variable names as keys and replacement values as values
 * @returns {string} The prompt with variables replaced
 */
export const replaceVariables = (prompt, variables = {}) => {
  let result = prompt

  for (const [variable, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${variable}\\s*}}`, 'g')
    result = result.replace(pattern, value)
  }

  return result
}
