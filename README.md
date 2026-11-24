# jerryschnepp.com

Personal website of Dr. Jerry Schnepp, served by GitHub Pages at https://www.jerryschnepp.com.

Plain HTML and CSS, no build step. Edit a page and push to `main`; GitHub Pages republishes in a minute or two.

- `index.html`, `research.html`, `publications.html`, `teaching.html`, `talks.html`: the five pages. Each carries its own copy of the header and footer, so a change to the navigation or footer goes in all five (and `404.html`).
- `css/site.css`: all styles. Colors are custom properties at the top. The site is dark only, so visitors see the same look whatever their system's light or dark setting is. Printing switches to dark ink on white.
- After editing `css/site.css` or a script, change its `?v=` tag in the pages that load it (the first 8 characters of the file's SHA-1) so browsers fetch the new copy.
- `js/filter.js`: the filter chips and search on Publications and Talks. `js/sketch.js`: the Sing N Sketch demo on Research.
- `img/`, `fonts/`, `slides/`: images, self-hosted fonts (Literata and Public Sans, SIL Open Font License), and posted slide decks.
- `home/`, `interests/`, `projects/`, `research/`, `service/`: redirects from the old Google Sites addresses to the new pages. Leave these in place so old links keep working.
- `cv.pdf`: the CV linked from the menu, footer, and home page. To update it, upload a new PDF with the same name (Add file, then Upload files) and it replaces the old one.
- `CNAME`: the custom domain. `.nojekyll` tells GitHub Pages to serve the files as they are.
