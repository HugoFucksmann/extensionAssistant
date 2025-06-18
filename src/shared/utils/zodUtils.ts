// src/shared/utils/zodUtils.ts

// ... (contenido existente)

/**
 * Creates a Zod preprocess function to rename a key in an object.
 * Useful for correcting common LLM mistakes where it uses a synonym for a parameter name.
 *
 * @param from The incorrect key name to look for (e.g., 'pattern').
 * @param to The correct key name to rename to (e.g., 'query').
 * @returns A function compatible with z.preprocess.
 */
export function renameInputKey(from: string, to: string) {
    return (input: unknown) => {
        if (typeof input === 'object' && input !== null) {
            const rawInput = input as any;
            if (from in rawInput && !(to in rawInput)) {
                const correctedInput = { ...rawInput };
                correctedInput[to] = correctedInput[from];
                delete correctedInput[from];
                return correctedInput;
            }
        }
        return input;
    };
}