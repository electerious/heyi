import readline from 'node:readline'

/**
 * Extract all variables from a prompt string, including their metadata.
 * Supports both {{variable}} and {{variable name="Description"}} syntax.
 *
 * @param {string} prompt - The prompt with variables
 * @returns {Array<{name: string, description: string|null}>} Array of variable metadata
 */
export const extractVariables = (prompt) => {
  // Match {{variable}} or {{variable name="description"}}
  const pattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:name\s*=\s*"([^"]*)")?\s*\}\}/g
  const variables = []
  const seen = new Set()

  let match
  while ((match = pattern.exec(prompt)) !== null) {
    const variableName = match[1]
    const description = match[2] || null

    // Only add each variable once (first occurrence)
    if (!seen.has(variableName)) {
      seen.add(variableName)
      variables.push({
        name: variableName,
        description,
      })
    }
  }

  return variables
}

/**
 * Find variables that are used in the prompt but not provided in the variables object.
 *
 * @param {string} prompt - The prompt with variables
 * @param {object} variables - Object with variable names as keys
 * @returns {Array<{name: string, description: string|null}>} Array of undefined variable metadata
 */
export const findUndefinedVariables = (prompt, variables = {}) => {
  const allVariables = extractVariables(prompt)
  return allVariables.filter((v) => !(v.name in variables))
}

/**
 * Prompt user for a variable value interactively.
 *
 * @param {string} variableName - Name of the variable
 * @param {string|null} description - Optional description for the variable
 * @returns {Promise<string>} The value entered by the user
 */
export const promptForVariable = (variableName, description = null) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const prompt = description ? `${description} (${variableName}): ` : `${variableName}: `

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

/**
 * Replace variables in a prompt string.
 * Handles both {{variable}} and {{variable name="Description"}} syntax.
 *
 * @param {string} prompt - The prompt with variables
 * @param {object} variables - Object with variable names as keys and replacement values as values
 * @returns {string} The prompt with variables replaced
 */
export const replaceVariables = (prompt, variables = {}) => {
  let result = prompt

  for (const [variable, value] of Object.entries(variables)) {
    // Match both {{variable}} and {{variable name="..."}}
    const pattern = new RegExp(`\\{\\{\\s*${variable}\\s*(?:name\\s*=\\s*"[^"]*")?\\s*\\}\\}`, 'g')
    result = result.replace(pattern, value)
  }

  return result
}
