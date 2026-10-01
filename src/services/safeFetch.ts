/**
 * Universal safe JSON fetch helper to prevent "Unexpected token '<', <!DOCTYPE" crashes
 * when SPAs on Netlify or static hosts fall back to serving index.html on missing API routes.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    let errorDetail = `API Request failed with status ${response.status}`;
    try {
      if (contentType && contentType.includes('application/json')) {
        const errJson = await response.json();
        errorDetail =
          errJson?.error?.message ||
          errJson?.message ||
          errJson?.error ||
          errorDetail;
      } else {
        const textResponse = await response.text();
        console.error('Non-JSON API Error Response:', textResponse.slice(0, 300));
        if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html')) {
          errorDetail = `API Request failed with status ${response.status}. Received HTML instead of JSON. Check the API endpoint URL.`;
        } else if (textResponse && textResponse.length < 500) {
          errorDetail = `${errorDetail}: ${textResponse}`;
        }
      }
    } catch {
      // ignore parsing error in error handler
    }
    throw new Error(errorDetail);
  }

  if (!contentType || !contentType.includes('application/json')) {
    const textResponse = await response.text();
    console.error('Non-JSON API Response:', textResponse.slice(0, 300));
    throw new Error('Received HTML instead of JSON. Check the API endpoint URL.');
  }

  const data = await response.json();
  return data as T;
}
