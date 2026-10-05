# My ARP Report (Basti)

A phone app for Basti ARPs, in Hindi or English. The first time, an ARP picks a language, their block and their name. The phone remembers these, and after that the app opens on their own month.

**Live:** https://adichandrashekar.github.io/basti-arp-app/ (ARPs can add it to their home screen; it works offline with the last data it downloaded)

## Tabs

- **Home**: the month at a glance. Visits against the target of 30, days in the field, schools visited, focus schools visited, the share of practices seen, which classes were observed, the last 6 months, a field-day calendar, the three practices teachers most need help with, and recent visits.
- **Upcoming**: a visit planner. Suggests focus schools (the one not visited for longest first) and schools to follow up (fewer than half the practices seen last time). The ARP adds a school with a day, ticks it when done, or searches for any other school. A planned school is ticked automatically once the data shows the visit. The plan is stored only on the phone.
- **Class KPIs**: one % card per practice, filtered by month (or all months), class (1-3 Hindi, 1-3 Maths, 4-8) and all schools / focus schools. Each card shows the change from last month. Tapping a card shows the last 6 months and the classes where the practice was missing.
- **Focus schools**: visited this month, visits, practices seen, schools not visited for 2+ months, the weakest practices, and a card per school. Tapping a school opens a page with who visited it each month, what to check on the next visit, % cards for that school, and every visit.

Every number has a `?` explanation. All the text is in `src/i18n.js`.

## Data

There is no data in this repo. The app reads `index.json` and `districts/basti.json` at run time from the ARP dashboard's site (https://adichandrashekar.github.io/arp-ssp-dashboard/data/, built by `etl/build.py` in [arp-ssp-dashboard](https://github.com/AdiChandrashekar/arp-ssp-dashboard)). A data refresh there shows up here with no redeploy. `src/data.js` decodes the same format as `web/src/data.js` in that repo, so change both if the format changes. To use another copy of the data, set `VITE_DATA_BASE` at build time.

## Running

```bash
npm install
npm run dev
```

Every push to `main` builds the app and publishes it to GitHub Pages (`.github/workflows/deploy.yml`). Data updates don't need a deploy.

## Privacy

There is no login. Anyone with the link can choose any ARP. The data is the same as on the public dashboard: teacher and school names, no phone numbers or student names.
