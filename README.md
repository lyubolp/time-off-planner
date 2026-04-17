# time-off-planner
A planner for my time off

## Stack
- PocketBase (backend + static file hosting)
- Alpine.js (frontend)

## Features
- Single-user setup
- Import official holidays from `.json` or `.csv`
- Add time-off entries with:
  - total days (can include weekend/holidays)
  - planned days
  - actually taken days
  - title
- Dashboard calendar for previous, current, and next month
- History + future time-off list
- Remaining time-off tracking:
  - total entitlement
  - unused (`total - taken`)
  - unplanned (`total - planned`)
- Dark / light mode

## PocketBase setup
1. Download and run PocketBase in this repository root.
2. Open PocketBase Admin UI and create an admin account.
3. Import collection schema from:
   - `./pocketbase/collection-schema.json`
4. Ensure static file serving is enabled (default PocketBase behavior for `pb_public`).
5. Open:
   - `http://127.0.0.1:8090/`

## Holiday import format
### JSON
```json
[
  { "date": "2026-01-01", "title": "New Year" },
  { "date": "2026-12-25", "title": "Christmas" }
]
```

### CSV
```csv
date,title
2026-01-01,New Year
2026-12-25,Christmas
```

## Notes
- This app is intentionally single-user and uses open collection rules for simple personal usage.
- The app is served directly by PocketBase from `pb_public/index.html`.
