import { createClient } from '@neondatabase/neon-js';
import { authAddress, readSignedInTokenFrom } from './data';

export const client = createClient({
  auth: { url: authAddress(), allowAnonymous: true },
  dataApi: { url: import.meta.env.VITE_NEON_DATA_API_URL },
});

readSignedInTokenFrom(client.auth);
