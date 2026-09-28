# Publish ScamWise LK on GitHub Pages

The app uses static HTML, CSS, JavaScript and a bundled browser-based Prolog interpreter. A database, backend service and separate Prolog installation are not needed for hosting. The Node.js server is only for running the project locally.

## Publish after the commit guide

1. Complete the commits and pull requests in GIT_COMMIT_GUIDE.md. Keep `dist`, `.github`, `scripts`, `tests`, `README.md` and `package.json` at the repository root. Upload extracted files, not the ZIP itself or an extra enclosing folder.
2. Use a public repository for GitHub Free. The examples use the repository name `scamwise-lk` and the branch `main`.
3. In the repository, open **Settings > Pages**. Under **Build and deployment**, select **GitHub Actions** as the source. The workflow is already included; there is no need to choose another template.
4. Merge `ci/github-pages` into `main`. This starts the publication workflow. Alternatively, open **Actions > Publish ScamWise LK > Run workflow**, select `main`, and run it.
5. Wait until the workflow succeeds. Open **Settings > Pages > Visit site** or the website link in the successful workflow.
6. With the suggested repository name and no custom domain, the address is `https://YOUR_USERNAME.github.io/scamwise-lk/`. Replace YOUR_USERNAME with your GitHub username.

Only `dist/` is sent to Pages. The full source, rules, tests and local instructions remain available in the repository for assessment. Changes merged into `main` will publish automatically.

## Quick verification after publication

- A new assessment has no selected answers.
- The check button is disabled until all 30 questions have a selection.
- Not sure counts as completed; the reasoning engine still treats it as unknown evidence.
- Try the OTP example, select Not sure for the remaining questions, and check the result.
- Switch to backward chaining and test the prize example in the same way.
- Open Get help and then return to Check a situation.

## If publication fails

- If the first workflow ran before Pages was enabled, enable GitHub Actions under Settings > Pages and rerun the workflow on `main`.
- If no workflow appears, verify that `.github/workflows/pages.yml` was committed and is visible in the repository.
- If the site returns 404, wait for a successful deployment and use its reported URL. Confirm that `dist/index.html` exists and that the workflow uploads `dist`.
- If your repository uses another default branch, either rename it to `main` or update both branch references in `.github/workflows/pages.yml`.

The publishing workflow is prepared and locally checked; it has not been run in your GitHub account yet.

## Submission links

Give the lecturer the repository URL for the code and the Pages URL for the live demo. Submit the final assignment PDF separately as required.

## Official instructions

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
