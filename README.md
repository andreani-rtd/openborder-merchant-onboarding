# OpenBorder Merchant Onboarding (Netlify)

Merchants on the onboarding roster fill in their details. When they click **Submit to OpenBorder**, a Netlify Function emails the submission to operations@openborder.com **from ops-onboarding-bot@openborder.com**. That email triggers the Ops onboarding bot.

The email includes a readable summary plus two attachments:
- `onboarding.json`: the full submission (markets, routing, shipping zones, contacts, bot tasks)
- `intake-prefill.json`: paste into the TAM/CSM intake form with **Load merchant submission**

Reply-To is set to the merchant's signer (or first contact), so Ops can reply to them directly.

## Setup

Same as the intake form site, as a separate Netlify project (this one stays public so merchants can open it):

1. Upload this folder's contents to a new private GitHub repo, e.g. `openborder-merchant-onboarding`.
2. Netlify: **Add new project** > **Import an existing project** > GitHub > pick the repo > **Deploy**.
3. **Project configuration** > **Environment variables**, add:

   | Name | Value |
   |---|---|
   | `BOT_SMTP_USER` | Same sending account as the intake site |
   | `BOT_SMTP_PASSWORD` | Same App Password (mark as secret) |
   | `ONBOARDING_ACCESS_CODE` | Optional but recommended. Any code, e.g. `ob-2026-onboard` |
   | `ONBOARDING_TO` | Optional. Defaults to `operations@openborder.com` |

4. **Deploys** > **Trigger deploy** > **Deploy site**.

## Sharing with merchants

- If you set `ONBOARDING_ACCESS_CODE`, send merchants the link with the code: `https://YOUR-SITE.netlify.app/?code=ob-2026-onboard`. Submissions without the right code are rejected, which keeps spam out.
- Don't turn on Netlify password protection for this site; merchants need to open it.

## Test

Open the link with the code, fill the form with test data, submit, and check operations@ for "Merchant onboarding: [company]" from ops-onboarding-bot@. Errors show in Netlify > Logs > Functions > submit-onboarding.
