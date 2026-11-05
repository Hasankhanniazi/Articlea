# Articlea

Article discovery website: topic filters, search, publisher attribution, short feed excerpts and links to original articles. It does not republish full articles.

## Publish
1. Open **Settings → Pages** and select **Deploy from a branch**, `main`, `/(root)`.
2. Save and wait for GitHub Pages to deploy.
3. Open **Actions → Refresh Articlea feeds → Run workflow** for the first collection.

## RSS feeds
Edit `sources.json` to add, remove or disable feeds. Verify each publisher's terms and permitted use before launch. RSS fields vary; some sources do not provide images or summaries. The collector keeps up to 500 unique entries and attempts to refresh every 30 minutes.

GitHub scheduled workflows are best-effort and may run later than the scheduled time. The first source list is a starter configuration, not a guarantee that each feed is available or that every reuse is permitted. Articlea links to original publishers and does not scrape full articles or bypass paywalls.
