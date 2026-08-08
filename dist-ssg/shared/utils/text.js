export function fixMojibake(str) {
    if (typeof str !== 'string' || str.length === 0)
        return str;
    const looksBroken = /[ÐÑÃÂÒÓРС]/.test(str);
    if (!looksBroken)
        return str;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const repaired = decodeURIComponent(escape(str));
        return repaired;
    }
    catch {
        return str;
    }
}
export function repairObjectStrings(input) {
    if (input == null)
        return input;
    if (typeof input === 'string')
        return fixMojibake(input);
    if (Array.isArray(input))
        return input.map(repairObjectStrings);
    if (typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
            out[k] = repairObjectStrings(v);
        }
        return out;
    }
    return input;
}
