# Daley Growth Consulting — site bundle

Static HTML/CSS/JS site. No build step. Just upload the contents of this folder to any static host.

## What's in this bundle

```
dist/
├── index.html              # entry point
├── styles.css              # all site styles
├── app.jsx                 # React UI (compiled in-browser by Babel)
├── assets/
│   ├── TanHarmoni.ttf       # brand display font
│   ├── daley-logo-cream.png # logo on dark sections
│   ├── daley-logo-rust.png  # logo when scrolled over cream sections
│   └── founder-portrait.png # Ann-Marie's headshot
└── README.md
```

## Fonts used

| Font | Source | Bundled? |
|---|---|---|
| **TAN Harmoni** | Local file `assets/TanHarmoni.ttf` | ✅ Yes, in bundle |
| **Italiana** | Google Fonts (loaded via `<link>` in `index.html`) | No — CDN |
| **Cormorant Garamond** | Google Fonts (italic fallback for headings) | No — CDN |
| **Manrope** | Google Fonts (fallback for body) | No — CDN |
| **Glacial Indifference** | cdnfonts.com (primary body font) | No — CDN |

The CDN fonts load automatically when the page loads — no setup required. If you ever want to fully self-host them, download the WOFF2 files from Google Fonts / cdnfonts and replace the `<link>` tags in `index.html` with `@font-face` rules pointing to local copies in `/assets`.

## Deploy in 60 seconds

### Vercel (recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Drag this entire `dist/` folder onto the upload area
4. Deploy. You'll get a URL like `daley-growth.vercel.app`
5. In **Settings → Domains**, add `daleygc.com` and follow the DNS instructions Vercel gives you

### Netlify
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `dist/` folder onto the page
3. You're live. Connect a custom domain in **Site settings → Domain management**

### Cloudflare Pages
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project → Direct Upload**
3. Drag the `dist/` folder

All three are free for traffic at this site's scale, give you HTTPS automatically, and serve the same files.

## A note about JSX in the browser

`app.jsx` is compiled at runtime by Babel (loaded via CDN in `index.html`). This works perfectly for any modern browser but adds ~100ms of JS work on first load. If you ever want to pre-compile it for slightly faster page loads, you can run it through Babel CLI and replace `<script type="text/babel">` with a regular `<script>` — but for a site this size it's genuinely not worth the build setup.

## Booking link

The "Book a Call" buttons all point to `https://clientintake.daleygc.com`. This is stored as the `BOOKING_URL` constant near the top of `app.jsx` — change it once there if the URL ever moves.

## Updating content

Almost all copy (capabilities, FAQ, work examples, hero copy) lives in `app.jsx` as plain JavaScript arrays near the top of each section. Search for `CAPABILITIES`, `STEPS`, `WORK`, `METRICS`, `FAQS`, and `TOOLS` to find the editable content.
