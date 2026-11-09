# ArchiTech — premium homepage redesign

Scope: **homepage only**. Existing SiteHeader, SiteFooter, routing, SEO metadata, copy translations, API endpoints, player data, and original Minecraft screenshots remain untouched.

## Design approach
- Minecraft-first: use the actual ArchiTech server screenshots, existing captions, player-built environments and project copy.
- Editorial layout instead of a four-card grid: full-width showcase, quieter typographic bridge, four long-form screenshot chapters, community roster, leaderboard, FAQ, final launcher CTA.
- Dark industrial palette: carbon `#10110f`, warm ivory `#f0ece5`, brass `#c3a77e`. No purple/blue glow, fake glass, animated spotlights or spinning decorative gears.
- Optical hierarchy: large cropped photographic stages, restrained content widths, sharp and consistent corners, hairline borders, whitespace and varied section cadence.
- Existing copy is rendered from `homeTranslations`; no rewritten marketing paragraphs.

## Motion rules
- Scroll-linked background atmosphere uses two independent full-screen layers; gallery slide transitions do not drive them.
- Individual story images move a short distance with scroll, while text reveals once when it becomes visible.
- Slide crossfades ease over ~0.9 seconds; major text reveals target ~0.8 seconds; control feedback is typically ~0.25–0.35 seconds.
- Animate transforms and opacity primarily. Avoid scroll event handlers reading layout every frame.
- Reduce/disable parallax on mobile and when `prefers-reduced-motion` is active. CSS also honors `prefers-reduced-data`.
- Keep original gallery interactions, swipe support, localized labels, status check, copy IP, leaderboard and FAQ.

## Research & design rationale
- [Apple Human Interface Guidelines — Motion](https://developer.apple.com/design/human-interface-guidelines/motion): animation should clarify relationships and provide feedback, not dominate content.
- [Motion — useScroll](https://motion.dev/docs/react-use-scroll): scroll-linked animation, independent progress values and parallax.
- [W3C WCAG — Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html): UI boundaries and state indicators should remain distinguishable, including in dark themes.
- [VisiblePage — How to Make AI-Generated Pages Look Less Generic](https://visiblepage.com/insights/websites/make-ai-pages-look-less-generic/): avoid repeated rounded cards, generic purple-blue gradients and interchangeable centered heroes; choose a specific identity and coherent type/spacing system.
- [Firewatch](https://www.firewatchgame.com/): layered landscape depth as a parallax reference; the implementation uses existing Minecraft screenshots instead.
- [Wynncraft](https://wynncraft.com/fruma/): game-world storytelling as an editorial pacing reference.

## Changed files
- `src/pages/public/HomePage.tsx` — homepage layout and parallax components. The old hidden online-history chart code is removed from the landing bundle; the live leaderboard and status still work.
- `src/pages/public/HomePage.premium.css` — standalone scoped premium theme. No global CSS, SiteHeader or SiteFooter edits.

## Local validation steps
```bash
git fetch origin
git switch design/premium-steampunk-home
npm ci
npm run build
npm run dev
```

Review /, then inspect desktop and mobile widths (e.g. 1440px / 768px / 390px). Confirm all eight slides and arrow/thumb navigation, swipe navigation, copy-IP, server status, team member links, leaderboard endpoint, FAQ controls and download links. Test reduced motion and high scroll depth. Compare the page against `main` in a separate tab before merging.

**Validation note:** static source and GitHub commit checks were performed. A full local Vite build/browser test was not available in the authoring environment, so it is important to run `npm ci && npm run build` and a browser pass after checking out the branch.
