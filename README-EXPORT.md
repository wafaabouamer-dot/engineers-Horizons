# Afaq Engineers

Exported from Anela. This is the project source, plus a description of what
it is and what did not come with it.

Run it:

    pnpm install    # or: npm install
    pnpm dev        # or: npm run dev

Production build:

    pnpm build      # writes dist/

## What is here besides the code

- `anela-export.json`: the framework, the entry point, the routes we
  could find, the NAMES of the environment variables the code reads, and the
  services this project used.
- `db/schema.sql`: the schema of your neon database, as
  DDL. 20 tables. No rows.

## What did NOT come across

- Your database ROWS. The schema is here; the data stays where it is.
- Secret values. Keys saved in Anela (Files, Assets, Secrets) are never in
  project files.
  Only `VITE_` values stay in `.env`, since Vite builds them into the site anyway.
  A key typed into any other file is not removed, so keep this zip private.
  The code reads: DEV, VITE_DATA_API_URL, VITE_NEON_AUTH_PATH, VITE_NEON_AUTH_URL, VITE_NEON_DATA_API_URL.
- User accounts, and anything stored against them.
- Custom domains and DNS.
- Regenerable or machine-local directories: .git/, .next/, .pnpm-store/, .turbo/, .vite/, .wb/, .wb-checkpoint-control/, .wb-checkpoint-staging/, build/, coverage/, dist/, node_modules/, and 2 directories the Anela workspace uses for itself. The two
  install and build commands above recreate everything in them.
- Big original uploads in attachments/large/ (videos and other large files sent in the chat). They stay in the project in Anela; download them from Files.

## Changed on the way out

These files were written for the Anela editor and were adjusted so they
make sense on your own machine:

- `.gitignore`
- `scripts/verify.mjs`
- `vite.config.ts`

If you want the BUILT site instead of the source, use Publish → "zip" in the
builder.
