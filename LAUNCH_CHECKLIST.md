# RevTray Launch Checklist 🚀

Follow these steps to successfully release RevTray and start monetizing.

## 1. Whop Configuration
- [ ] **Create Whop App**: Go to [Whop Dashboard](https://whop.com/dash/apps) and create a new app.
- [ ] **Set Redirect URI**: Set the redirect URI to `https://your-domain.com/api/auth/callback/whop`.
- [ ] **Configure Webhooks**: Set the webhook URL to `https://your-domain.com/api/whop/webhook`.
- [ ] **Copy Secrets**: Copy your `WHOP_API_KEY` and `WHOP_WEBHOOK_SECRET` to your production environment variables.
- [ ] **Set Product IDs**: Create your plans (Starter, Growth, Scale) and add-ons in Whop, then copy their Product IDs to your environment variables.

## 2. Email Infrastructure (Resend)
- [ ] **Get API Key**: Create a [Resend](https://resend.com) account and get your API key.
- [ ] **Verify Domain**: Add your sending domain in Resend and follow the DNS verification steps.
- [ ] **Update Env**: Add `RESEND_API_KEY` to your production environment.

## 3. Database & Auth
- [ ] **Production DB**: Set up a production PostgreSQL database (e.g., on Supabase, Neon, or Railway).
- [ ] **Run Migrations**: Run `npx prisma migrate deploy` against your production database.
- [ ] **NextAuth Secret**: Generate a strong random string for `NEXTAUTH_SECRET`.

## 4. Legal & Compliance
- [ ] **Review Terms**: Review the generated `app/terms/page.tsx` and ensure it meets your legal requirements.
- [ ] **Review Privacy**: Review `app/privacy/page.tsx` regarding data handling.
- [ ] **Physical Address**: Ensure you have a physical address set in your Workspace settings (required for CAN-SPAM compliance in email footers).

## 5. Final Polish
- [ ] **Favicon**: Verify the `app/icon.svg` looks good in the browser.
- [ ] **SEO**: Check `app/layout.tsx` metadata and ensure `robots` is set to `index: true`.
- [ ] **Test Flow**: Perform a test purchase on Whop to ensure the webhook correctly updates the user's plan in RevTray.

## 6. Environment Variables Summary
Ensure these are set in your production host (Vercel, Railway, etc.):
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production domain)
- `WHOP_API_KEY`
- `WHOP_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `WHOP_STARTER_PRODUCT_ID`
- `WHOP_GROWTH_PRODUCT_ID`
- `WHOP_SCALE_PRODUCT_ID`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GEMINI_API_KEY`
