// src/shared/utils/zodUtils.ts

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

/**
 * Creates a Zod preprocess function to handle inconsistent file path parameters from an LLM.
 * It corrects inputs where the LLM might send an array of paths (e.g., `filePaths: ["/path"]`)
 * or use a different key (e.g., `fileName: "/path"`), standardizing it to a single string
 * under the specified `targetKey`.
 *
 * @param targetKey The correct key name for the single path (e.g., 'path', 'filePath').
 * @returns A function compatible with z.preprocess.
 */
export function correctFilePathsToSinglePath(targetKey: string) {
    return (input: unknown) => {
        if (typeof input !== 'object' || input === null) {
            return input;
        }

        const rawInput = input as any;
        const potentialKeys = [
            targetKey,
            `${targetKey}s`, // e.g., 'paths'
            'file',
            'files',
            'fileName',
            'fileNames',
            'filePath',
            'filePaths',
            'directory',
            'directoryPath'
        ];

        for (const key of potentialKeys) {
            if (key in rawInput) {
                const value = rawInput[key];
                let singlePath: string | undefined;

                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                    singlePath = value[0];
                } else if (typeof value === 'string') {
                    singlePath = value;
                }

                if (singlePath) {
                    const correctedInput = { ...rawInput };
                    // Remove all potential keys to avoid conflicts
                    potentialKeys.forEach(k => delete correctedInput[k]);
                    correctedInput[targetKey] = singlePath;
                    return correctedInput;
                }
            }
        }

        return input;
    };
}