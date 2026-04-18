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

## Docker
Build the image:

```bash
docker build -t time-off-planner .
```

Run it with persistent PocketBase data:

```bash
docker run --rm -p 8090:8090 -v time-off-planner-data:/pb/pb_data time-off-planner
```

Then open:

- `http://127.0.0.1:8090/`
- `http://127.0.0.1:8090/_/`

The container downloads PocketBase `0.36.9` for Linux during build, applies `pb_migrations` on startup, and stores app data in `/pb/pb_data`.

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

## Security for single-user mode
- The provided schema intentionally uses open collection rules for a simple single-user setup.
- Run PocketBase on localhost/private network only (for example `127.0.0.1`) and do not expose it publicly without adding auth rules.
- If internet exposure is needed, add authentication and tighten `list/view/create/update/delete` rules before deployment.
