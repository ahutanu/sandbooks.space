// Timeout configuration
// Production note: Azure App Service can have cold starts (5-10s)
// so we use a longer timeout for production reliability
const FETCH_TIMEOUT_MS = 15000; // 15 seconds max per request

/**
 * Fetch with timeout - aborts request after specified duration
 * Throws error if request takes longer than timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - backend may be unavailable');
    }
    throw error;
  }
}
