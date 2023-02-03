// Hacky solution for building configs. See comment below for why this function is necessary.
export function buildConfigWithDefaults<T>(config: T, defaults: Partial<T>): T {
    // Filter out undefined and null values so that it doesn't override defaults with an actual value
    const filtered = Object.fromEntries(
        Object.entries(config || {}).filter(([key, value]) => value !== undefined && value !== null)
    );
    const combined = { ...(defaults as T), ...filtered };

    return combined;
}
