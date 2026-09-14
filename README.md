# Swastik Supermarket

React, Express, and SQLite application served by one Node.js process.

## Run Locally

**Prerequisites:** Node.js and npm. Node.js 24 with npm 11 is known to work.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Optionally copy `.env.example` to `.env`. No environment variable is required for the default local setup. Keep `NODE_ENV=development` and leave `VITE_API_URL` empty so API requests remain same-origin and the browser can return the HttpOnly session cookie.

3. Validate the included SQLite database and start the application:

   ```bash
   npm run db:validate
   npm run dev
   ```

4. Open <http://localhost:3000>.

## Production build

Set `NODE_ENV=production`, then build before starting the server:

```bash
npm run build
npm start
```

The default database is `swastik_local_final.db`. Set `DATABASE_PATH` only when a different SQLite database is intentionally required. Optional provider variables for Maps, Cloudflare R2, Cashfree, Meta WhatsApp, and Twilio are documented in `.env.example`.
