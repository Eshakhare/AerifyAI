# Aerify AI: deployment pricing and budget notes


Checked October 2026. Currency USD; this is a **planning estimate**, not a quote. Region, billing eligibility, machine sizes, token lengths, traffic and taxes determine the actual bill. Pricing is here rather than in the architecture or role prompts.


## Assumed demo


- One Firebase Hosting React site, one FastAPI Cloud Run API, one private Cloud Run worker with `min instances = 0`.
- One small single-zone Cloud SQL PostgreSQL instance running continuously with roughly 10 GB data/backup; one Cloud Tasks queue; limited Cloud Storage for one demo clip.
- A few thousand map loads per month; no paid vision processing, large videos or Earth Engine for MVP. BigQuery is disabled in the base budget and evaluated separately as an optional asynchronous analytics/AI mirror.
- One generated/cached Gemini narrative per changed hotspot, recommendation or outcome, **not** per sensor reading or public page view.


| Service | Budgetary range | Cost driver |
| --- | --- | --- |
| Cloud SQL | ~$12–40/month for a small single-zone instance plus modest storage/backup, subject to region/tier | Continuous instance uptime; larger/HA tier much more |
| Cloud Run API + worker | ~$0–15/month at low traffic, depending on free-tier eligibility and region | Requests, CPU/memory runtime, network and logs |
| Maps JavaScript API | Often $0 at demo traffic | Global 10,000 free Dynamic Maps loads monthly; eligible India-pricing accounts show 70,000 free India Dynamic Maps loads; other Maps SKUs differ |
| Gemini 2.5 Flash on Vertex/Agent Platform | ~1.85at1,000or~18.50 at 10,000 example calls | Example: 2,000 input + 500 output/reasoning tokens per call; listed $0.30/1M input and $2.50/1M output tokens |
| Cloud Tasks, Firebase Hosting, Cloud Storage | Often $0–10/month for this small demo | Task volume, hosting transfer, media and storage |
| Optional BigQuery analytics | Likely negligible query/storage spend at the 172,800-row demo scale, but verify against the current free tier and region | Bytes stored/scanned, scheduled-query frequency and retained analytical history |
| Optional BigQuery AI functions | No fixed estimate; budget separately from ordinary SQL | BigQuery processing plus the remote Gemini/Agent Platform model calls and their tokens |


**Whole demo:** plan **$20–80 for a 30-day deployment**, or approximately **$5–30 for the build/demo window**, before credits/taxes. These broad ranges assume low traffic and a small database; a larger Cloud SQL instance, high Gemini output, public usage, image/video inference or always-on Cloud Run can exceed them. Before enabling services, build a region-specific quote in the [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator). Because all development and CI now use Cloud SQL, create isolated `aerify_dev`, `aerify_ci` and `aerify_demo` databases on one small non-HA hackathon instance instead of paying for local plus multiple managed database stacks. Keep the demo database stable, expire CI schemas automatically and delete or stop billable resources after judging. Use a separate Cloud SQL instance before a real production launch.


Enabling the BigQuery mirror should not replace Cloud SQL in this estimate. Export only compact operational/derived tables asynchronously, partition them by event date and set maximum bytes billed or equivalent query controls. Run `AI.GENERATE` only over reduced, reviewable rows such as one hotspot/checkpoint summary—not every sensor observation. Google documents that BigQuery AI over remote models can incur both BigQuery processing and Agent Platform model charges, so add it only after a concrete batch use case and a small cost test.


## Google AI Pro and billing


Google AI Pro increases AI Studio and Antigravity build usage. Google's current India plan comparison lists **$10 monthly Google Cloud credits** for the Pro plan through the Google Developer Programme premium; confirm that your subscription/account actually activates those credits and that they apply to this Cloud billing account. Do not assume a subscription covers public app use, Maps, Cloud SQL or Vertex inference.


Use a separate Aerify AI Cloud project for clean usage reporting. Set a project-wide alerts-only budget with several email thresholds. Google now documents **enforced spend cap budgets for eligible Gemini API/Vertex and Cloud Run**, one project and one service per spend cap; Cloud SQL and Maps are not in that currently documented eligibility list. Caps can take time to enforce and may incur some overage. Add explicit Maps API quotas, restrict API keys, impose a Gemini daily token/call allowance in backend code, and set Cloud Run max instances. Check charges daily during the hackathon; delete the Cloud SQL instance when the demo no longer needs it.


## Primary pricing references


- Cloud SQL: https://cloud.google.com/sql/pricing
- Cloud Run: https://cloud.google.com/run/pricing
- Cloud Tasks: https://cloud.google.com/tasks/pricing
- Firebase Hosting: https://firebase.google.com/docs/hosting/usage-quotas-pricing
- Maps global / India: https://developers.google.com/maps/billing-and-pricing/pricing and https://developers.google.com/maps/billing-and-pricing/pricing-india
- Vertex/Agent Platform Gemini: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
- AI Pro benefits: https://one.google.com/intl/en_in/about/google-ai-plans/
- Spend-cap eligible services and limits: https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery generative AI and cost tracking: https://cloud.google.com/bigquery/docs/generative-ai-overview



