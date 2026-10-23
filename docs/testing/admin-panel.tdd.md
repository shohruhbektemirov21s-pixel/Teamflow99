# Admin panel TDD evidence

## Scope

Journeys were derived from the request: an administrator can see and search all manageable data, use a dedicated archive/cache center, and operate the panel on desktop and mobile.

## RED / GREEN evidence

| Guarantee | Test | RED evidence | GREEN evidence |
|---|---|---|---|
| Dashboard exposes the complete permitted model catalog and loads the responsive shell script | `test_dashboard_has_teamflow_shell_and_operational_metrics` | Missing “Barcha bo‘limlar” and `teamflow.js` | Passed in the 12-test admin suite |
| Shell badges use live chat and unread-notification counts | `test_shell_uses_real_navigation_counts` | Hard-coded value `3` | Passed with database-created records |
| Global search finds admin records and handles short queries | `test_global_search_finds_records_and_handles_empty_query` | `NoReverseMatch: admin:global_search` | Passed for task result and empty-query state |
| Archive/cache controls are not exposed to ordinary staff | `test_trash_and_cache_center_is_restricted_to_superusers` | Expected 403, received 200 | Passed after the permission boundary was added |

## Commands and results

- RED: `python manage.py test apps.core.tests.test_admin_ui -v 1` — 2 failures and 1 error for the missing catalog, live counters and search route.
- RED: targeted trash permission test — expected 403, received 200.
- GREEN: `python manage.py test apps.core.tests.test_admin_ui -v 1` — 12/12 passed.
- Full backend regression: `python manage.py test -v 1` — 404 passed, 2 skipped.
- Django checks: `python manage.py check` — no issues.
- Migration drift: `python manage.py makemigrations --check --dry-run` — no changes detected.
- Browser QA: local Chrome at 1440×1000, 768×1024 and 375×812 — no horizontal overflow; mobile drawer opened and closed with Escape; dark mode, global search and trash page worked; 0 console errors.

## Known gaps

- The repository does not include the Python `coverage` package, so a numeric coverage percentage was not produced; the focused admin suite and full backend suite both passed.
- No committed visual baseline existed, so screenshot comparison is inconclusive rather than a visual-regression pass.
- Automated browser QA covers interaction and overflow; it is not a complete manual screen-reader audit.
