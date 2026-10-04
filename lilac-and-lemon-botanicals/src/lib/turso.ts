import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

if (!url || !token) {
  // Say what's missing, never what the values are.
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set on the server');
}

export const turso = createClient({
  url,
  authToken: token,
});
