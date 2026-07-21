# Multilingual SEO Landing Pages Design

## Goal

Make all 15 supported Azkar languages discoverable as separate search pages while keeping one shared web application at `https://sunnyberd.github.io/Tasbih/`.

## Scope

The implementation covers these language codes: `en`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `ru`, `uz`, `zh`, `tr`, `hi`, `id`, `ms`, and `th`.

It adds search landing pages and a safe language handoff into the existing application. It does not change Firebase synchronization, local storage formats, dhikr counting, statistics, offline queues, authentication, or other application behavior.

## Architecture

The current application remains at `/Tasbih/`. Each language gets a static page at `/Tasbih/<language>/`, for example `/Tasbih/ru/` and `/Tasbih/uz/`. Every language directory contains an `index.html` file whose important text and metadata are present in the initial HTML response and do not depend on JavaScript rendering.

All landing pages share a single root-level stylesheet, `seo-landing.css`. The pages contain no application logic and continue to work if JavaScript is disabled.

Each landing-page call-to-action opens the main application with a supported `lang` query parameter, for example `/Tasbih/?lang=ru`. The application reads this parameter during startup, validates it against the 15 supported language codes, applies it, and saves it as the current language. Unsupported values are ignored and retain the existing English/default behavior. The main application keeps its existing root canonical URL so query variants do not become duplicate search pages.

## Landing Page Content

Every localized page contains:

- a localized, concise `<title>`;
- a localized meta description;
- a self-referencing canonical URL;
- a visible localized `<h1>`;
- a short product introduction;
- a localized feature list covering the dhikr/tasbih counter, duas and the 99 Names of Allah, goals and statistics, reminders, offline use, and optional account synchronization;
- a three-step usage section;
- a small FAQ explaining cost, installation/offline use, and synchronization;
- a prominent localized call-to-action that opens Azkar in the matching language;
- a visible language-navigation section linking to all 15 landing pages;
- localized `WebApplication` JSON-LD using only claims that are already true in the application.

The pages must not claim that synchronization is perfectly real-time while that behavior remains under testing. Copy should describe account synchronization conservatively as a supported/optional capability without promising immediate consistency.

Translations will reuse established terminology from `seo.js` and `i18n.js`. The initial implementation aims for clear, simple language. Native-speaker copy review can improve wording later without changing the page architecture.

## International SEO

Every landing page includes the same complete alternate-language cluster:

- one `rel="alternate" hreflang="<language>"` link for each of the 15 language URLs;
- one `hreflang="x-default"` link to the English landing page `/Tasbih/en/`;
- a self-referencing canonical link for the current localized URL.

The main application page includes alternate links to the 15 landing pages and uses the English landing page as `x-default`, while retaining its canonical URL `https://sunnyberd.github.io/Tasbih/`.

`sitemap.xml` lists the root application plus all 15 localized landing pages. Every sitemap URL uses the public GitHub Pages origin and an accurate `lastmod` date. The existing `priority` and `changefreq` fields may be removed because Google ignores them.

`robots.txt` remains permissive and continues to point to the same sitemap URL.

## Visual Design

Landing pages use the existing dark-and-gold Azkar visual identity but are simpler than the application. The layout is responsive, readable on phones and desktops, keyboard accessible, and lightweight. Semantic HTML is preferred over decorative components. Pages share one stylesheet so visual changes remain centralized.

The landing pages do not embed or duplicate the application. They explain the product and direct users into the existing root application.

## Failure Handling

- Unsupported or malformed `lang` parameters are ignored.
- A landing page remains useful and navigable if JavaScript, Firebase, or the application backend is unavailable.
- All internal public URLs are absolute from `/Tasbih/` or fully qualified where required by canonical, hreflang, sitemap, Open Graph, and structured-data fields.
- No landing page uses `noindex` or points its canonical at a different language.

## Verification

A repository-local SEO audit verifies:

- exactly 15 expected language directories exist;
- every page has a non-empty localized title, meta description, visible `h1`, self-canonical, call-to-action, and language navigation;
- every page has all 15 reciprocal hreflang entries plus `x-default`;
- every canonical, alternate URL, asset reference, and application link uses the GitHub Pages `/Tasbih/` base correctly;
- JSON-LD parses as JSON and identifies Azkar as a free web application;
- `sitemap.xml` contains the root application and all 15 landing pages without duplicates;
- the root application recognizes each supported `?lang=` value and rejects unsupported values;
- existing application scripts remain syntactically valid.

After automated checks, the pages are served locally for a brief visual check at mobile and desktop widths. The published URLs are then suitable for submission through Google Search Console.

## Success Criteria

The feature is complete when all 15 localized URLs can be deployed unchanged to GitHub Pages, expose crawlable localized content without requiring JavaScript, form a valid reciprocal hreflang cluster, appear in the sitemap, and open the single existing Azkar application in the selected language without affecting unrelated application behavior.
