# RevTray Staging Environment Guide 🚀

The Staging environment is a mirror of production. It's where we test "scary" changes (like database migrations or new Whop webhooks) before they reach real users.

## 1. Environment Setup
Create a second project in your hosting provider (e.g., Vercel, Railway, or Google Cloud) named `revtray-staging`.

### Required Environment Variables
Ensure these are different from production:
*   `DATABASE_URL`: A dedicated staging database (Clone of production without PII).
*   `NEXTAUTH_URL`: `https://staging.revtray.com`
*   `WHOP_WEBHOOK_SECRET`: A different secret from Whop (Point Whop staging webhooks here).
*   `NEXT_PUBLIC_POSTHOG_KEY`: Use a "Staging" project in PostHog.
*   `STAGING_MODE`: `true`

## 2. Whop Staging Webhooks
1. In Whop Dashboard, create a second webhook endpoint.
2. Point it to `https://staging.revtray.com/api/whop/webhook`.
3. This allows you to test purchase flows using Whop's "Test Payload" feature without affecting production revenue.

## 3. Deployment Flow
1. **Feature Branch**: Create a branch `feat/new-automation`.
2. **PR to Develop**: Merge to `develop` branch.
3. **Auto-Deploy to Staging**: Your CI/CD should automatically deploy the `develop` branch to the Staging environment.
4. **Smoke Test**: Run `npm run test:smoke` against the staging URL.
5. **Merge to Main**: Once verified, merge `develop` into `main` to deploy to production.

## 4. Database Safety
Never run `prisma migrate dev` directly against production. 
1. Run it on Staging first.
2. Verify all data is intact.
3. Use `prisma migrate deploy` in your production build script.
