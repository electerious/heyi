import { z } from 'zod'

/**
 * Get the appropriate Zod schema for the requested format.
 *
 * @param {string} format - The output format
 * @param {string} schemaString - The Zod schema string for object/array format
 * @returns {z.ZodType} The Zod schema for the format
 */
export const getFormatSchema = (format, schemaString) => {
  switch (format) {
    case 'string': {
      return z.object({
        result: z.string(),
      })
    }
    case 'number': {
      return z.object({
        result: z.number(),
      })
    }
    case 'object': {
      // Parse the schema string (e.g., "z.object({name:z.string()})")
      // We need to evaluate it in the context of zod
      // eslint-disable-next-line no-eval
      const parsedSchema = eval(schemaString)
      return z.object({
        result: parsedSchema,
      })
    }
    case 'array': {
      // Parse the schema string (e.g., "z.string()" or "z.object({name:z.string()})")
      // We need to evaluate it in the context of zod
      // eslint-disable-next-line no-eval
      const parsedSchema = eval(schemaString)
      return z.object({
        result: z.array(parsedSchema),
      })
    }
    default: {
      throw new Error(`Can't create schema for unknown format '${format}'`)
    }
  }
}
