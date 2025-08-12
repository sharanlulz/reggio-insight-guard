# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1e93690c-29bf-4dec-bce8-d2b50437fb8d2b50437fb8b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1e93690c-29bf-4dec-bce8-d2b50437fb8b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1e93690c-29bf-4dec-bce8-d2b50437fb8b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

## Dev & Deploy (Reggio MVP)

1) Create a local env file for local testing (Lovable uses Supabase Secrets in deploys):

```
# .env.local (local only)
NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role>  # Edge functions only
GROQ_API_KEY=<groq key>
GROQ_MODEL=llama-3.1-70b-versatile
```

2) Seed database (org + regulation):

```
# Already automated by migrations, but if needed:
supabase db remote commit --file supabase/seed/reggio_seed.sql
```

3) Deploy Edge Function (JWT disabled in dev):

```
supabase functions deploy reggio-ingest --no-verify-jwt
```

4) Test ingestion in Postman:

```
POST https://<PROJECT_REF>.functions.supabase.co/reggio-ingest
Authorization: Bearer <ANON_KEY>
Content-Type: application/json
{
  "regulationId": "<UUID>",
  "source_url": "https://...",
  "document": { "versionLabel": "v1", "docType": "Regulation", "language": "en", "source_url": "https://...", "published_at": "2024-01-01T00:00:00Z" }
}
```

Edge Function logs:
- https://supabase.com/dashboard/project/plktjrbfnzyelwkyyssz/functions/reggio-ingest/logs
