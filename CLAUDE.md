# CLAUDE.md — maltipoo.sg

Singapore Maltipoo specialist site. Sister brand of Curious Tails (disclosed). Astro ^7 + Tailwind ^4 + Cloudflare Pages. Build #2 from the cavapoopuppy.sg template (`D:\Claude Code\Cavapoo SG`) — reuse architecture, never copy or design.

## Workflow & Orchestration

**Master file: [.claude/docs/RUN-THE-PROJECT.md](.claude/docs/RUN-THE-PROJECT.md)** — stages, 4 checkpoints (never skip), 8-step per-page pipeline, PAGE-BUILD BUG CHECKLIST, golden rules, portfolio doorway-risk constraints.

Key rules (full detail in RUN-THE-PROJECT.md):
- Brief-first, always: no page copy without `briefs/<slug>.json` from `/page-brief`.
- Never hand-write final copy — `/content-writer` (money/guide) or `/blog-writer` (blog).
- One keyword = one page; cannibalization check vs blueprint + ALL portfolio domains' GSC before every brief.
- Hand-built `.astro` pages under `src/pages/` — no content collections, no MDX.
- Zero copy or design reuse from curioustails.sg AND cavapoopuppy.sg (doorway risk). Third distinct palette/fonts/components.
- **Cross-site consistency:** never contradict cavapoopuppy.sg's published breed comparisons (Maltipoos = more attachment-dependent, more vocal, want daytime company). Brand angle: "the companion dog for homes with company."
- WORDS_TO_AVOID in all copy: `pedigree`, `DNA`, `Malay`.
- Answer capsule (question heading + 30–60 word self-contained answer) in the first 30% of every page.
- Skills are global (`~/.claude/skills/`) — never copy them into this project.

## Canonical Business Facts (never guess — full block in config/business-context.md)

- WhatsApp: **+65 8220 6408** (`wa.me/6582206408`). **8220 6480 is WRONG/stale.**
- AVS pet shop licence: **AS24J00046** (trust badges/schema). ACRA `202420075D` is NOT the licence.
- Address: 2 Balestier Road #01-701, Singapore 320002. Hours: weekdays 12–6pm, weekends 10–6pm.
- Maltipoo pricing: **$3,288–$5,988 all-in** (owner confirmed 2026-07-13; genuinely same range as cavapoo) — lead with "From $3,288, all-in". Toy-first, 2–4kg; 100+ placed; apricot colour mix.
- Vaccinations: weeks 6/8/12 (+optional 16); home ~week 9; annual booster from Year 1.

## Schema

See [.claude/docs/SCHEMA.md](.claude/docs/SCHEMA.md). Organization = Maltipoo.sg brand with `parentOrganization` → Curious Tails; distinct `@id`s (`https://maltipoo.sg/#organization`); `sameAs` → GBP + Instagram + Facebook + AVS registry. Byline + one site-wide Person `@id` on every content page. Use `src/lib/schema.ts` functions — don't invent schemas from scratch.

## SEO

- `/seo-audit-and-fix [page] "[keyword]"` on every page — 88+/100 before shipping.
- Money-page title: differentiated from listing sites' inventory angle — exact keyword front, no price hook.
- Slugs: lowercase, hyphens, keyword-first, ≤4 words, no stopwords/dates.
- Never delete/rename a published URL without a Cloudflare `_redirects` 301 + GSC inbound check.

## Design

Before ANY design/restyle work, invoke `premium-design-standard` via the Skill tool (re-invoke fresh each time).

**Portfolio design policy (owner decision 2026-07-13): shared bones, distinct skin.** Component architecture/layout/motion may be shared with cavapoopuppy.sg; palette + fonts + imagery must be this site's own. Forbidden skins: curioustails.sg cream/peach/coral + Fredoka/Nunito; cavapoopuppy.sg sky-blue #EAF3FE / #3D6BFF / #FFC53D + Grandstander/Outfit. design-system.md written at Checkpoint 3. kie.ai consistency string: `maltipoo-sg-<hex1>-<hex2>-<lighting>-v1`. Zero copy reuse stays the hard rule.

## Development

- Dev server: `astro dev --background` (manage with `astro dev stop/status/logs`); port **4323** (4321 flagship, 4322 cavapoopuppy).
- `.astro` files are CRLF on this machine — codemods must use `\r?\n` anchors; verify with build + grep of `dist/`.
- **Lockfile after ANY dependency change:** `npx -y npm@10.9.2 install --package-lock-only` before pushing (CF Pages builds on npm 10.9.2 / Node 22).
- Repo: `speester/maltipoo-sg` (private); Cloudflare Pages auto-builds `main`. `config/`, `research/`, `briefs/`, `.claude/` are gitignored — only `src/`, `public/`, build configs get pushed.
- Business values live in `src/data/site.ts` only (mirrors config/project-config.md) — no hardcoded values in pages. New GA4 property for this site (never `G-S1WGGDQKQ4`, never cavapoopuppy's ID).

## Documentation

Astro docs: https://docs.astro.build (routing, components, styling/Tailwind).
