export function fixMojibake(str: string): string {
  if (typeof str !== 'string' || str.length === 0) return str;
  // Quick heuristic to avoid touching normal strings
  const looksBroken = /[ÐÑÃÂÒÓРС]/.test(str);
  if (!looksBroken) return str;
  try {
    // escape -> percent-encode as Latin-1; decodeURIComponent -> interpret as UTF-8
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repaired = decodeURIComponent((escape as any)(str));
    return repaired;
  } catch {
    return str;
  }
}

export function repairObjectStrings<T = unknown>(input: T): T {
  if (input == null) return input;
  if (typeof input === 'string') return fixMojibake(input) as unknown as T;
  if (Array.isArray(input)) return (input.map(repairObjectStrings) as unknown) as T;
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = repairObjectStrings(v);
    }
    return out as unknown as T;
  }
  return input;
}
