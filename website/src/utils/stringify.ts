/**
 * Converts a JS value to a sensible string representation.
 */
export default function stringify(value: unknown): string | undefined {
  switch (typeof value) {
    case 'function': {
      const functionSource = value.toString();
      const signature = functionSource.match(/function[^(]*\([^)]*\)/);
      return signature ? signature[0] : functionSource;
    }
    case 'object':
      return value ? JSON.stringify(value, (_key, nestedValue) => stringify(nestedValue)) : 'null';
    case 'undefined':
      return 'undefined';
    case 'number':
    case 'bigint':
      return Number.isNaN(value) ? 'NaN' : String(value);
    default:
      return JSON.stringify(value);
  }
}
