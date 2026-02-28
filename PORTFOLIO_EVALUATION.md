# Portfolio Evaluation (Ben Thomas)

## What is wrong (issues to fix)

1. **Broken navigation links in the CV page**
   - In `cv.html`, the "Analysis" menu item points to `computational.html` instead of `analysis.html`.

2. **Placeholder/empty project link**
   - In `computational.html`, the "Portfolio Website" card uses `href="#"` for "View Repository", which is a dead link.

3. **Legacy pages contain broken links and placeholder content**
   - `notes.html` links to non-existent `../projects.html` and has placeholder text blocks (`[Insert Video 1 Here]`, etc.).
   - `education/hub.html` links to non-existent `projects.html`, references missing PDF `../pdfs/BenThomasCA1_Trabajo.pdf`, and includes multiple `href="#"` placeholders.

4. **Inconsistent branding/navigation labeling**
   - Home nav logo uses "Ben Thomas" while analysis uses "BEN THOMAS"; inconsistent identity presentation.

5. **Security/UX issue on external document links**
   - Multiple `target="_blank"` links are missing `rel="noopener noreferrer"`.

## What is missing (high-impact additions)

1. **Core SEO metadata**
   - No `meta name="description"`, no Open Graph/Twitter card tags, and no canonical links on key pages.

2. **Portfolio conversion elements**
   - Missing a clear contact CTA (GitHub/LinkedIn/email button) on homepage hero and project cards.

3. **Repository/demo links for all projects**
   - Several projects only link to PDFs; they should also include source repo and (where possible) live demo/media.

4. **Accessibility polish**
   - Add skip-link, improve keyboard focus states, and verify color contrast in muted text areas.

5. **Operational essentials**
   - Add `sitemap.xml`, `robots.txt`, favicon set, and a simple 404 page.

## Prioritized next steps

1. Fix wrong/broken links (`cv.html`, `notes.html`, `education/hub.html`, `computational.html`).
2. Remove or hide unfinished/legacy pages from navigation and indexing.
3. Add SEO metadata across top-level pages (`index`, `analysis`, `computational`, `cv`).
4. Add explicit contact and project repository/demo CTAs.
5. Add basic accessibility and deployment hygiene (skip-link, rel attrs, sitemap, robots, favicon).
