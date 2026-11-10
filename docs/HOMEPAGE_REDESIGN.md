# ArchiTech — premium homepage / Atelier visual system

## Scope and non-negotiables
This is an **in-place refinement of `design/premium-steampunk-home`**.
- Homepage only. Existing header, footer, other pages, API integration, routes and localized hand-written copy remain intact.
- Existing screenshot order, all eight gallery files and four scene photographs remain from the original server assets. No generated artwork.
- Preserve the current successful composition: immersive hero, editorial bridge, four full-bleed story chapters, team, leaderboard, FAQ and last download CTA.
- No neon, artificial glow, purple gradients, glass cards, unnecessary moving gears or copy rewritten by an assistant.
- The logo is deliberately NOT used as a color source. The interface is a restrained charcoal-and-brass supporting environment.

## Typography / all Cyrillic capable
- **Onest 600**: large editorial chapter headings, section titles, important CTA labels. Tighter tracking for the large display scale.
- **Golos Text 400–600**: all paragraphs, navigation-like labels, UI controls, metainformation, FAQ, rankings. Designed for long Cyrillic passages and legible mixed Latin/Cyrillic.
- **Bona Nova 400**: one deliberately limited serif application, the intro's original hand-written server description. This is the old-world/steampunk note, not a second UI font.
- Loaded via Google Fonts CSS with local fallback families, `display=swap`. No Apple SF font copied or bundled.
- Design sizes: roughly 16–19px for primary copy, 11–13px for metadata, 38–98px for headings depending on viewport. Intro editorial quote scales 27–49px.

## Palette / restrained industrial
| Token | Color | Role |
| --- | --- | --- |
| `--at-bg` | `#171816` | base graphite |
| `--at-bg-deep` | `#121310` | dark anchoring |
| `--at-bg-raised` | `#20211e` | alternate surface |
| `--at-ink` | `#f2efe9` | primary type |
| `--at-ink-secondary` | `#c9c4b9` | supporting type |
| `--at-ink-muted` | `#b0aa9d` | tertiary type |
| `--at-brass` | `#c5aa84` | sparse labels / identity accents |
| `--at-control` | `#e6ddcf` | main CTA fill |
| `--at-control-ink` | `#25231f` | button label |

Measured color ratios on `#171816`:
- `#f2efe9`: ~15.5:1
- `#c9c4b9`: ~10.3:1
- `#c5aa84`: ~8:1

Actual contrast over photographs still needs browser testing with different screenshots and viewport crops.

## Controls
- Primary CTA is a warm stone control with 11px corner radius and visible hover, active, focus-visible states; no glow.
- Secondary GitHub control matches CTA height, only outlined.
- IP copy control is a restrained integrated control with clear boundaries, minimum practical hit size.
- Gallery arrows and thumbnails share the same interaction language. Mobile controls target at least 44px.
- Chapter actions stay as underlined text links with a subtle spacing movement, keeping the photograph primary.

## Motion direction
- Hero gallery: 1.28s opacity-dominant synchronized crossfade, a nearly imperceptible 1.018→1 image scale, no horizontal slide or bounce.
- Auto rotation: 7.3s between image changes; pause on hover and keyboard focus.
- Preload **only the next** responsive AVIF photograph, selected according to screen size and pixel density.
- Each long chapter: scroll-linked image displacement up to 72px, spring-filtered at `stiffness:65, damping:29, mass:.75`. Text enters once on reveal, 0.95s easing.
- Each long photograph has a top and bottom soft mask into **the same** `#171816` charcoal surface. Neighboring photographs meet via a stable neutral interval; no hard abrupt edge.
- Independent rear and front atmospheric layers remain beneath scenes. They do not change with the hero's gallery.
- Transitions/hover primarily animate `transform` and `opacity`, with color/background used only for UI feedback.
- On mobile, parallax is switched off. `prefers-reduced-motion: reduce` also removes nonessential movement. `prefers-reduced-data` suppresses the second atmospheric layer.
- No forced smooth-scroll hijacking.

## Reference sources
- [Apple design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/) — simplicity, hierarchy, intentional craftsmanship.
- [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons/) — distinct primary action, feedback, good touch areas.
- [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion) — movement supports experience, does not compete.
- [Motion useScroll](https://motion.dev/docs/react-use-scroll) and [useSpring](https://motion.dev/docs/react-use-spring) — progress-linked transforms and spring interpolation.
- [Chrome Parallax Scroll Effects](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/parallax-scroll-effects) — compositor properties and accessible motion.
- [WCAG motion preferences](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) and [contrast](https://www.w3.org/TR/WCAG21/#contrast-minimum).
- [Create Harmony](https://akatashi.eu/en/) and [CreateCraft](https://createcraft.store/) — genuine Create-mod screenshot and content presentation.
- [IBM Plex](https://www.ibm.com/design/language/typography/typeface/), [Golos Text](https://www.figma.com/fonts/golos-text/), [Onest](https://fontsource.org/fonts/onest/about), [Bona Nova](https://www.figma.com/fonts/bona-nova/) — script coverage and typographic rationale.

## Files touched
- `src/pages/public/HomePage.tsx` — photo fade timing, preloading and scroll spring refinements; **no rewritten translations**.
- `src/pages/public/HomePage.premium.css` — complete replacement of the homepage-only design rules, not appended emergency overrides.
- `docs/HOMEPAGE_REDESIGN.md` — this specification.

## Pull and verify
```bash
git switch design/premium-steampunk-home
git pull origin design/premium-steampunk-home
npm ci
npm run build
npm run dev
```

Manual review:
1. Desktop 1440×900 and 1920×1080: legibility of intro, image brightness, hero controls and thumbnail focus.
2. Tablet ~768px and phone ~390px: no unintended horizontal scrolling, no clipped action buttons, thumbs can scroll.
3. Scroll through all four photographed chapters in both directions: no abrupt boundary flashes, no scroll jank.
4. Change gallery slides by arrows, thumbnails and swipe; let auto rotation run; check that it pauses on interaction.
5. Test online status, IP copying, team profile links, ranking and every original FAQ interaction.
6. Reduce motion in OS accessibility settings and reload.
7. Compare current page with the earlier commit in a separate tab to check typography and photo treatment.

**Verification status:** GitHub source and static structure checks were performed. This environment does not have the repository's npm installation or an authenticated network path to clone its source into a browser runner. A local `npm run build` and visual review on the user's machine are required before merging to `main`.

---

## Editorial phase II — testimonial, photo essays and site chrome (2026-11-10)

This iteration keeps the established homepage hero, existing server copy, real screenshots, links and routing. It redesigns only the material that follows the hero, plus the previously outdated shared header and footer.

### Founder portrait / quote
- The repeated full-width introductory paragraph was removed.
- The intervening chapter is now a restrained founder's statement attributed to **Raijin**, the first member of the project's existing `TEAM_MEMBERS` array.
- The displayed quotation is an **exact excerpt** from the existing Russian or English hero description, not new generated marketing copy.
- The portrait loads the active `skinUrl` from the existing `/api/v1/users/by-name` endpoint and reuses the installed `skinview3d` viewer. If a server skin cannot be loaded, the existing profile avatar (or the project's avatar fallback) stays visible.
- The WebGL code is lazy-loaded only as the section approaches the viewport; the static portrait's rendering loop pauses after loading. Avatar and 3D model crossfade after the actual skin is ready.
- The scene uses a warm graphite matte backdrop, an understated byline, a comfortable serif quotation and no artificial shine or spinning gears.

### Four alternating photograph chapters
- Alternating left/right layouts retained, including the original headings, descriptions, action labels and destination links.
- Each chapter uses a distinct local vignette according to where the text is placed, rather than the same blanket-darkening treatment everywhere.
- Headings: Onest, roughly 47–83px; copy: Golos Text, 17–19px; scene credits reuse the existing handwritten screenshot titles and subtitles.
- Backgrounds retain the actual Minecraft screenshot. Masked photographic edges fade into a shared `#171816` surface for softer transitions.
- Small per-photo metadata anchors the section to real in-game builds; these annotations are hidden on very narrow screens.
- Text enters only once, in four restrained steps: eyebrow, title, description, action. No letter-by-letter animation and no constant floating text.
- Scroll-linked imagery uses a spring-filtered ±64px shift on capable desktop views. On mobile and with reduced motion enabled, the motion is removed.

### Shared header + footer
- The old cool-navy/saturated blue accents were replaced by warm graphite, understated brass and neutral text.
- Desktop header: 70px composed navigation, clear current-page underline, light restrained links, quiet social icons and account control.
- Mobile navigation becomes available before the desktop links start to crowd; the existing language picker and all original URLs are preserved.
- Footer: logo, existing social destinations, the same four legal and informational links, unchanged disclaimer and copyright, with a composed editorial hierarchy.
- A standalone `SiteChrome.css` scopes the header/footer changes and keeps them independent of page content.

### Motion and accessibility references
- [Apple HIG — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles): consistency, hierarchy, simple controls, human details.
- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout): alignment, grouping, readable flow, adaptation to different widths.
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion): purposeful motion, avoid distracting decoration, make motion optional.
- [NN/g — Zigzag image-text layouts](https://www.nngroup.com/articles/zigzag-page-layout/): alternating positions can hinder utilitarian scanning, so here they support visual storytelling while labels and controls stay consistent.
- [Smashing Magazine — Accessible text over images](https://www.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/): per-image copy space and local gradient scrims.
- [Chrome — Parallax scroll effects](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/parallax-scroll-effects): transforms, opacity, reduced motion.
- [skinview3d — SkinViewer](https://skinview3d-docs.vercel.app/classes/SkinViewer.html): rendering control and skin-loading API.

### Files in this phase
- `src/pages/public/HomeQuote.tsx` (new, quoted excerpt and 3D portrait)
- `src/pages/public/HomePage.tsx` (replaced duplicate intro, structured 4 chapters)
- `src/pages/public/HomePage.premium.css` (testimonial and all four chapter styles + responsive rules)
- `src/shared/ui/skin/Skin3DViewer.tsx` (optional background, noninteractive presentation, onReady, static-render pause)
- `src/shared/ui/layout/SiteHeader.tsx` (navigation visual style only)
- `src/shared/ui/layout/SiteFooter.tsx` (footer visual structure)
- `src/shared/ui/layout/SiteChrome.css` (new shared chrome theme)

### Verification
Static source checks confirm all four chapters, live APIs, original gallery, all navigation destinations, original FAQ/team/leaderboard, translated labels, reduced-motion rules and valid CSS brace balance.
**Runtime build and visual QA are still required** on a clone with npm dependencies. The authoring environment cannot resolve GitHub or npm from its shell, so claiming a successful Vite/browser test would be misleading.

Inspect responsive widths 390/768/1024/1440/1920px, verify the actual Raijin public profile returns `skinUrl`, and test the quote avatar fallback by simulating a failed profile request. Check the loader's WebGL console for errors on devices without hardware acceleration.
