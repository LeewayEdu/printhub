# PrintHub — Project Context

## What this is
PrintHub is the print production ordering portal for C-Chu Media (cchumedia.com), live at printhub.cchumedia.com. It allows customers to place print production orders online.

## Tech stack
- Framework: Next.js
- Styling: Tailwind CSS
- Database — Supabase / Postgres 
- hosting — Vercel
- payments — Paystack? Confirm integration status]
-  NextAuth, Clerk, Supabase Auth]

## Brand & business context
- Parent company: C-Chu Media (print, media, book publishing, social media, web design, photography)
- Part of the wider C-Chu Global / Silas Umekwe portfolio
- Document/print aesthetic preference across the business: clean, professional, black-and-white, print-ready (Arial, no decorative styling) — relevant if PrintHub generates any print-facing assets or proofs

## Working style
- Silas (the owner/operator) directs priorities and reviews changes — he does not write code himself
- Always explain changes in plain language before/after making them
- Prefer small, reviewable changes with clear git diffs over large rewrites
- Do not touch live payment keys, environment variables, or production secrets without explicit confirmation
- No AI vendor names (e.g. specific LLM providers) should appear in any user-facing UI text or copy

## Current state (as of setup)
- PrintHub is built and operational but has low/no active order flow — the priority right now is getting it actively used, not adding new features, unless Silas directs otherwise
- [Fill in: any known bugs, pending features, or incomplete flows]

## What NOT to do
- Don't assume a feature is missing — check the actual codebase first
- Don't refactor broadly; scope changes tightly to what's asked
- Flag anything that looks like a security or payment risk before changing it
