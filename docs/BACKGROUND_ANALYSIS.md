# Background analysis, email, and history

## User workflow

- Web analysis requests are queued so users can navigate away or close the tab while processing continues.
- Signed-in users can return to **History** to see queued, running, completed, and failed analyses, open a completed report, or delete an entry.
- A completion/failure email links to the analysis in the web app. History and report access are scoped to the authenticated account.
- Completed and failed entries are retained for seven days by default. Set `ANALYSIS_RETENTION_DAYS` to an integer from 1 to 30 to change the period. The worker deletes expired records once per day; active queued/running jobs are not deleted by retention cleanup.

## Production configuration

Set these environment variables on the API and worker services:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key. When present, mail is sent through Resend's HTTPS API. |
| `SMTP_FROM` | Verified sender, for example `ScopeGraph <verify@auth.scopegraph.top>`. The sender domain/address must be verified with Resend. |
| `WEB_APP_URL` | Public web origin used to construct the email's report link; defaults to `https://www.scopegraph.top`. |
| `ANALYSIS_RETENTION_DAYS` | Optional retention period from 1 to 30 days; defaults to `7`. |

SMTP is a fallback when `RESEND_API_KEY` is empty. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_USE_TLS` for that path. With Resend configured, SMTP login variables are not required for analysis notifications.

The worker also needs the same `DATABASE_URL` and `REDIS_URL` as the API. Run at least one worker process (`python -m app.jobs.worker` from `services/api`) so queued analyses execute and daily history cleanup runs. Redis/RQ is the durable queue path. If Redis is unavailable, the API uses an in-process background-thread fallback; it avoids holding the HTTP request open but an in-flight job cannot survive an API process restart.

The API container runs `alembic upgrade head` on startup. Verify the database reaches migration `ae20261103_analysis_history` before enabling the feature. Older client sessions are cleared when the new session-token flow is deployed; users must sign in again once.

## Production smoke check

1. Sign in with an account whose email can receive mail.
2. Start a repository analysis, then navigate away or close the tab.
3. Confirm the API returns a queued analysis and the worker logs the job start and completion.
4. Confirm an email arrives with a link to `/app/history?analysis_id=…`, and that the signed-in user can open the report from **History**.
5. Check worker logs for notification errors. If no Resend key is configured, the task logs that email delivery is unavailable; an analysis still completes.
6. Confirm the API and worker are using the same database and that the database migration is current.

Email delivery depends on Resend availability and sender verification. If delivery fails after analysis completion, the report remains available in History until deleted or expired.
