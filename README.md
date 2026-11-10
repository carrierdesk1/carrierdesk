# CarrierDesk (Phase 1)
Free stack: GitHub (free) + Vercel Hobby (free). FMCSA webKey is free.

1. Get a free FMCSA webKey: register at https://mobile.fmcsa.dot.gov/QCDevsite/ (Login.gov account needed), then create a WebKey.
2. Upload this folder to a new GitHub repo.
3. On vercel.com: New Project -> import the repo -> Settings -> Environment Variables -> add FMCSA_WEBKEY = your key -> Deploy.
4. Open your Vercel link and search by MC, DOT or company name.

Leads are saved in your browser only (Phase 2 moves them to a free Supabase database with logins).
