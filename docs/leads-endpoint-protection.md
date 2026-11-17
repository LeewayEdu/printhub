# /api/leads protection: what it does and its limits

`/api/leads` is public (the chat form, WhatsApp taps and pro-forma requests post to it), so it is a target for
spam. The app protects it in four ways:

| Protection | Behaviour |
|---|---|
| Honeypot | A hidden `website` field. If it is filled the request is accepted and thrown away (bots think they succeeded). |
| Rate limit | **5 requests per IP per hour**, then HTTP 429 with a `Retry-After` header. |
| Validation | Phone must be 10-15 digits (optional `+`); email format checked; source whitelisted; every text field length-limited; body capped at 60 KB. |
| No CAPTCHA | Deliberately none. |

## The rate-limit caveat (important)

The limiter (`src/lib/rate-limit.ts`) keeps its counters **in the memory of one running serverless function
instance**. On Vercel:

- several instances can run at once, each with its own counter, so one visitor can send **more than 5 per hour**
  in total;
- instances are recycled, which **resets the counter**;
- the IP comes from `x-forwarded-for`, so a visitor who rotates IP addresses is not limited.

It stops accidental repeats and casual spam. It is **not** a hard limit and will not stop a determined attacker.

## Recommended: add a Vercel Firewall rule

Put a firewall rule in front of the function so the limit is enforced for everyone, shared across instances:

1. Vercel dashboard -> the project -> **Firewall** -> **Add rule** (custom rule).
2. Condition: **Request Path** *equals* `/api/leads` and **Method** *equals* `POST`.
3. Action: **Rate limit**, for example **5 requests per hour per IP** (match the app), response **429 / Deny**.
   For stricter protection use a **Challenge** action for the same path.

Rate-limiting rules are a Vercel plan feature, so check what your plan includes before relying on it.
Keep the in-app limit as well: it still protects the endpoint if the firewall rule is ever removed.

## Exact (database) limit: optional upgrade

If you need a precise per-IP limit without Vercel's firewall, store a hashed IP on each lead and count rows from
the last hour before inserting. That needs a new column on `leads` (a database change, so it needs your approval).
