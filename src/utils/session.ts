import { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Env, SessionData } from '../types';
import { generateSecureToken, hmacSign, hmacVerify } from './crypto';

const SESSION_COOKIE_NAME = 'etulis_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get the session secret key from environment or fallback for dev.
 */
function getSecret(c: Context<{ Bindings: Env }>): string {
  return c.env.SESSION_SECRET || 'etulis-dev-secret-key-32-chars-long!';
}

/**
 * Parses and verifies the signed session cookie.
 */
export async function getSession(c: Context<{ Bindings: Env }>): Promise<SessionData> {
  const cookieValue = getCookie(c, SESSION_COOKIE_NAME);
  if (!cookieValue) {
    return initSession();
  }

  const parts = cookieValue.split('.');
  if (parts.length !== 2) {
    return initSession();
  }

  const [b64Data, signature] = parts;
  const secret = getSecret(c);
  const isValid = await hmacVerify(b64Data, signature, secret);
  if (!isValid) {
    return initSession();
  }

  try {
    const jsonStr = atob(b64Data);
    const session = JSON.parse(jsonStr) as SessionData;
    if (!session.csrfToken) {
      session.csrfToken = generateSecureToken(16);
    }
    return session;
  } catch {
    return initSession();
  }
}

/**
 * Initializes a clean new session with a secure CSRF token.
 */
export function initSession(): SessionData {
  return {
    csrfToken: generateSecureToken(16),
    unlockedNotes: [],
    manageTokens: {},
  };
}

/**
 * Saves and signs the session cookie on the response.
 */
export async function saveSession(c: Context<{ Bindings: Env }>, session: SessionData): Promise<void> {
  const secret = getSecret(c);
  if (!session.csrfToken) {
    session.csrfToken = generateSecureToken(16);
  }

  const jsonStr = JSON.stringify(session);
  const b64Data = btoa(jsonStr);
  const signature = await hmacSign(b64Data, secret);
  const cookieValue = `${b64Data}.${signature}`;

  const isSecure = c.req.url.startsWith('https://');

  setCookie(c, SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clears the session cookie.
 */
export function clearSession(c: Context<{ Bindings: Env }>): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  });
}

/**
 * Helper to validate CSRF token on POST/PUT/DELETE requests.
 */
export function validateCsrf(session: SessionData, submittedToken?: string | null): boolean {
  if (!session.csrfToken || !submittedToken) {
    return false;
  }
  return session.csrfToken === submittedToken;
}
