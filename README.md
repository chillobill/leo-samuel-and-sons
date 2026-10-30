# Leo Samuel & Sons LTD

A responsive website for a building business in Holmfirth, West Yorkshire. Project journals are Markdown files; GitHub Actions renders them into HTML and publishes to GitHub Pages when a pull request is merged into `main`.

## First publication

1. Create a repository named `leo-samuel-and-sons` on GitHub. Use a public repository for GitHub Pages on GitHub Free, or a plan supporting private-repository Pages. Do not add a starter README.
2. Upload or push this source tree, including `.github/workflows/pages.yml`, to `main`. The ZIP's generated `dist/` folder is for preview only and is ignored by Git.
3. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
4. Open **Actions → Build and publish website → Run workflow** on `main`. A first run before Pages is enabled may fail; rerun after step 3.
5. Find the live URL in the deployment result. Default project hosting is `https://OWNER.github.io/leo-samuel-and-sons/`.
6. In a repository ruleset for `main`, require pull requests and the **Validate and build** status check. This is what enforces PR-only updates; the workflow alone cannot prohibit direct pushes. Enable the rule after the first passing build, using the exact check name GitHub shows. If your plan does not support the rule, follow the PR process by convention.
7. Restrict the `github-pages` environment to `main` under repository deployment protection rules.

The initial site has a deliberately empty journal and no invented projects, reviews, accreditations, phone number or email. The homepage hero image is `public/assets/images/holmfirth-house.png`; it is separate from the project journal. Confirm business copy before launch. Add the correct business contact and any required company disclosures before public launch.

## Add a project using a pull request

1. Create a branch, for example `projects/holmfirth-extension`.
2. Copy `content/projects/_example.md` to `content/projects/holmfirth-extension.md`. Use a lowercase, hyphenated filename. Uppercase `.MD` extensions are also supported.
3. Add your photos under `public/assets/images/holmfirth-extension/`. Prefer compressed JPG, WebP or AVIF files; use simple lowercase filenames.
4. Edit the YAML front matter and Markdown. Set `draft: false` when ready. Keep the date quoted in `YYYY-MM-DD` format.

```markdown
---
title: "Project title"
date: "2026-10-29"
summary: "A short introduction to the work and its latest milestone."
category: "On site"
image: "/assets/images/holmfirth-extension/front.jpg"
image_alt: "Describe the actual photograph for visitors using a screen reader"
draft: false
---

## The project

Describe the work in your own words.

## 29 October 2026 — Progress on site

Write the latest update here.

![Describe this photograph](/assets/images/holmfirth-extension/progress.jpg)

## Next steps

Explain what comes next.
```

5. Open a PR into `main`. Actions validates metadata and image paths, runs tests, renders the website and attaches a **website-preview** ZIP. PRs never deploy. To preview the downloaded artifact, extract and serve its folder locally; PR artifacts use root URLs. You can also build the source locally as below.
6. Review the change, then merge. Actions rebuilds and deploys the HTML automatically. Generated HTML does not need to be edited or committed.

For later updates, edit the same Markdown file in a new branch, append dated progress sections and photos, and open another PR. Update `date` to move it to the top of the journal. Drafts are validated but excluded from the public output; draft source remains visible in a public repository. Only publish information and images you have permission to share.

## Contact and site settings

Edit `site.json` through a PR:

- `name` and `location`: the business identity and location.
- `email` and `phone`: leave blank until confirmed; filled values create real email/call links.
- `url`: the full published site root, including the repository path if applicable, e.g. `https://OWNER.github.io/leo-samuel-and-sons`. Leave blank until known. Used for canonical links.

To use a custom domain, configure it in GitHub's Pages settings. The deployment workflow reads the Pages base path automatically.

## Local development

Requires Node.js 24 LTS (Node 22+ is supported) and Python 3 for the optional preview server.

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run preview
```

Open `http://localhost:4173`. To check repository subfolder builds:

```sh
BASE_PATH=/leo-samuel-and-sons npm run build
```

The build validates required front matter, dates, image existence and local image paths; sorts published projects newest first; and renders the homepage and individual project pages. Raw HTML inside Markdown is escaped. Only local project images and supported link schemes are allowed. The site uses no analytics, cookies, external font services, contact backend or runtime JavaScript.

## Files

- `content/projects/*.md`: project journals.
- `public/assets/images/`: photographs and the homepage hero image.
- `public/assets/style.css`: responsive design.
- `scripts/build.mjs`: static HTML renderer.
- `.github/workflows/pages.yml`: PR validation and publishing.
- `.github/pull_request_template.md`: project review checklist.
- `site.json`: contact and business settings.
