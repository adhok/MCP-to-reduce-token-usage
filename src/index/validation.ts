export function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return value;
}

export function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value, name);
}

export function boundedInteger(
  value: unknown,
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  const candidate = value === undefined ? defaultValue : value;
  if (typeof candidate !== "number" || !Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return candidate;
}

export function validRegex(value: string, name: string): string {
  try {
    new RegExp(value, "i");
  } catch {
    throw new Error(`${name} must be a valid regular expression.`);
  }
  return value;
}
