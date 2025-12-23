/**
 * Check if any of the specified flag names exist in process.argv.
 *
 * @param {string[]} flagNames - Array of flag names to check for (e.g., ['--model', '-m'])
 * @returns {boolean} True if any flag is found in process.argv
 */
export const hasFlag = (flagNames) => {
  return process.argv.some((arg) => {
    return flagNames.includes(arg) || flagNames.some((name) => arg.startsWith(`${name}=`))
  })
}
