# Kaluta Society — Website & App Build Plan

## Objective
Build an aesthetic, elegant, production-grade website + app (React/TypeScript) for **Kaluta Society** — an AI-powered global social operating system — based on the uploaded 16-page comprehensive blueprint (3,580 lines).

## Key blueprint recommendations that MUST be fully implemented
1. **Newsfeed conflict resolved** → separate feed modes: Following (reverse-chron), For You (AI-ranked), Circles, Friends, Local, Country, Global, Topics, Trending, New + "Why am I seeing this?", "Show less like this", "Change my algorithm".
2. **Algorithm Marketplace** — user-selectable feed algorithms (Chronological, Friends First, Family First, Local News, etc.).
3. **Ad commission** → an ad purchase is Kinjy revenue in full: the advertiser's sponsor takes the standard 20%, Kinjy Leaders 5%.
4. **Self-service account deletion** — Settings → Account → Deactivate/Delete, identity confirmation, optional cooling period, no justification required.
5. **Passkeys instead of central biometrics** — device-level biometric unlock, no central fingerprint/face database.
6. **Family Tree** — graph-based relationship engine (edges: parent_of etc.) as backend truth; Kaluta "Level" model as UI presentation layer; 3-confirmation deceased verification; disputes workflow; no AI inference of religion/paternity.
7. **Digital Graveyard 2.0** — memorials, QR codes, flowers/candles, guest book, location, reminders, 3 admins + succession.
8. **Agency pricing** — 20% markup on top of the seller's price; the commission is calculated on the markup, never on the seller's money.
9. **Creator revenue** — creator 40%, then sponsor 20% and Kinjy Leaders 5% of what Kinjy retains.
10. **Subscriptions** — Free / Basic $3.99/mo ($39/yr) / Premium $9.99/mo ($99/yr); one-off purchases at 2–4× unit cost.
11. **Ad pricing** — auction floors (CPM $0.50, premium video CPM $1.00, CPC $0.05, CPV $0.005, etc.), AI-adjusted.
12. **AI Gateway** — provider-independent model router (Kimi, DeepSeek, others) by task/cost/language/latency/privacy.
13. **Translation system** — provider-independent language gateway: detection, one-click translate, dubbing, lip-sync.
14. **Cloud display mode** — signature visual identity: soft translucent panels, floating cards, rounded surfaces + Light/Dark/System.
15. **Safety** — layered moderation, child/teen/adult modes, appeals, transparency.
16. **Kinjy Leaders** — 5% of monthly revenue to the top 10,000 by commission earned; monthly snapshot, fraud review, batch.

## Landing page animation
Hero animation representing the **main differentiator**: Kaluta Society as a *global social operating system* — an animated living network: people nodes connecting into Circles, Family Trees growing across generations, multilingual messages auto-translating across a globe, content morphing one-to-many (article→video→audio→newsletter). Canvas/SVG-based, elegant, low-saturation warm palette, reduced-motion fallback.

## Kaluta Assistant (AI agent) — mandatory feature
- Floating agent icon, **dynamically positioned** near the user's active location/module (moves to bottom-right on Home, near composer on Create, beside memorial actions on Graveyard, etc.).
- **Role-aware**: answers based on user vs admin access.
- **Input**: text chat + voice (Web Speech API).
- **Output**: (a) written answer embedded with illustrative images, (b) demo video-clip format (scripted/animated walkthrough player).
- **Language**: replies in the language the user used.
- **Self-updating knowledge**: knowledge base versioned with codebase; change-log ingestion simulation; admin "advisory" feed monitoring AI industry developments with recommendation + reason + codebase patch option ("Apply" button that stages the update).
- Knowledge base covers all modules: feeds, circles, communities, forums, family tree, graveyard, earnings, ads, subscriptions, privacy, KYC.

## Stage plan
- **Stage 1 — Skills & setup**: Load `vibecoding-webapp-swarm` + `webapp-building-swarm` (+ `swarm-workspace` if needed). Scaffold React+Vite+TS+Tailwind+shadcn project.
- **Stage 2 — Design**: Design brief (visual identity, Cloud mode, palette, typography, animation concept, page inventory, component architecture). Gate: review before build.
- **Stage 3 — Build (swarm, parallel subagents)**:
  - Agent A: Landing page + hero animation + global shell (nav, mobile bottom bar, Cloud/Light/Dark themes, language switcher).
  - Agent B: App core — Feeds (all modes + algorithm marketplace + Why-am-I-seeing-this), Composer, Profiles, Circles, Communities, Forums, Messenger mock.
  - Agent C: Family Tree (interactive levels/graph UI, relationship path, closeness engine demo) + Digital Graveyard (memorials, QR, flowers, reminders).
  - Agent D: Economy — Creator earnings, direct commission (one level), Kinjy Leaders, Subscriptions, One-off purchases, Ad platform + floor pricing, Marketplace margin model, Settings (passkeys, self-service deletion, privacy center).
  - Agent E: Kaluta Assistant (chat UI, voice, dynamic positioning, role-aware KB, image+video responses, admin advisory + self-update).
- **Stage 4 — Integrate & QA**: Merge, build, fix, reviewer pass.
- **Stage 5 — Deliver**: `website_version_manager` build_version (type: static). Output dir: /mnt/agents/output.

## Deliverable
Browser-openable React app saved as a website version (preview via version card).
