import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';

// Returns the Clerk user id from a *verified* session token, or null.
// The user id is never read from the query string or request body.
export async function getUserId(req: VercelRequest): Promise<string | null> {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) return null;

  const token = authorization.slice('Bearer '.length).trim();
  if (!token || !process.env.CLERK_SECRET_KEY) return null;

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return verified.sub || null;
  } catch {
    return null;
  }
}
