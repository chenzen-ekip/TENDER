import { z } from "zod";

// --- Configuration ---
const PISTE_TOKEN_URL = process.env.PISTE_TOKEN_URL || "https://sandbox-oauth.piste.gouv.fr/api/oauth/token";
const PISTE_CLIENT_ID = process.env.PISTE_CLIENT_ID!;
const PISTE_CLIENT_SECRET = process.env.PISTE_CLIENT_SECRET!;
const PISTE_SCOPE = "tncp.apidecp"; // As requested

// --- Types ---
interface TokenCache {
  accessToken: string;
  expiresAt: number; // Timestamp in ms
}

// Zod schema for runtime validation of the API response
const PisteTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.number(), // Seconds
  scope: z.string().optional(),
});

// --- Singleton State ---
let tokenCache: TokenCache | null = null;
const EXPIRATION_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry

/**
 * Retrieves a valid OAuth2 Access Token for API PISTE.
 * Automatically handles caching, expiration, and retries on failure.
 */
export async function getPisteToken(): Promise<string> {
  // 1. Check if we have a valid cached token
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + EXPIRATION_BUFFER_MS) {
    return tokenCache.accessToken;
  }

  // 2. If not, fetch a new one
  console.log("🔒 PISTE Auth: Token expired or missing. Fetching new token...");
  
  if (!PISTE_CLIENT_ID || !PISTE_CLIENT_SECRET) {
    throw new Error("❌ PISTE Auth Error: Missing PISTE_CLIENT_ID or PISTE_CLIENT_SECRET in environment variables.");
  }

  try {
    const newToken = await fetchWithRetry();
    
    // 3. Update Cache
    tokenCache = {
      accessToken: newToken.access_token,
      expiresAt: now + (newToken.expires_in * 1000),
    };

    console.log(`✅ PISTE Auth: New token acquired. Expires in ${newToken.expires_in}s.`);
    return tokenCache.accessToken;
  } catch (error) {
    console.error("❌ PISTE Auth Critical Failure:", error);
    throw error;
  }
}

/**
 * Helper to fetch token with retry logic for 5xx errors.
 */
async function fetchWithRetry(retries = 3, delay = 1000): Promise<z.infer<typeof PisteTokenResponseSchema>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // PISTE requires x-www-form-urlencoded body
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", PISTE_CLIENT_ID);
      params.append("client_secret", PISTE_CLIENT_SECRET);
      params.append("scope", PISTE_SCOPE);

      const response = await fetch(PISTE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        
        // Retry only on server errors (5xx)
        if (status >= 500 && attempt < retries) {
          console.warn(`⚠️ PISTE Auth: Request failed with ${status}. Retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2; // Exponential backoff
          continue;
        }

        // Fatal client error (4xx) or max retries reached
        throw new Error(`PISTE API Error [${status}]: ${errorText}`);
      }

      const data = await response.json();
      
      // Validate response shape
      const validated = PisteTokenResponseSchema.parse(data);
      return validated;

    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      // If it's a network error (fetch failed), we also retry
      console.warn(`⚠️ PISTE Auth: Network error. Retrying... (Attempt ${attempt}/${retries})`, error);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("PISTE Auth: Unknown error after retries.");
}
