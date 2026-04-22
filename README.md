# TechYatra (GitHub Pages)

Personal site: [https://techyatra.github.io/](https://techyatra.github.io/)

## Stack

- Static HTML, CSS (`assets/main.css`), JS (`assets/main.js`)
- [Hashnode GraphQL](https://gql.hashnode.com/) for blog posts
- [YouTube Data API v3](https://developers.google.com/youtube/v3) (video duration) + RSS for latest videos
- [Supabase](https://supabase.com/) (anon key + RLS) for newsletter, contact, article read counts, and site visits

## Social / SEO

- Add **`og-image.png`** at the site root (recommended ~1200×630) so Open Graph and Twitter cards show a real preview image. Meta tags in `index.html` already point to `https://techyatra.github.io/og-image.png`.

## Architecture (portfolio only)

Coloured diagram (open over **HTTPS**, e.g. after deploy): [docs/portfolio-architecture.html](https://techyatra.github.io/docs/portfolio-architecture.html)

## Local preview

Open `index.html` in a browser, or use any static server from this folder (e.g. `npx serve`). Use the same for `docs/portfolio-architecture.html` if the Mermaid chart does not load from `file://`.

`video_generator.html` is a separate tool page and was not changed as part of the main site refactor.
