# Next steps for Best TV 2.0

Status: implementation handoff; product planning is complete enough to begin a staging build. No Best TV 2.0 backend or production changes have been implemented by this document.

Recorded: 2026-11-20, America/Los_Angeles.

This document preserves the owner's requirements from the November 19–20, 2026 conversation. Read it before proposing or implementing Best TV 2.0. Later clarifications below supersede the earlier alternatives discussed in that conversation. Do not require access to that chat to continue.

## 1. Product context and intended scope

Best TV is a personal episode-rating explorer, primarily used to choose episodes to rewatch. The owner visits approximately once every few weeks, adds shows approximately monthly, and sometimes adds three shows in one visit. This is not a service being built for scale or multiple customers.

The goal is to stop editing and running Colab manually. Manage the collection on the website, keep application data in Firestore, and use GitHub Actions for the bulk import. Preserve the useful episode heatmap and current browsing features.

The owner explicitly asked to document this work for a future AI session, possibly weeks later. This commit is documentation only. It does not authorize treating proposed setup choices as already configured.

## 2. Decisions and requirements to preserve

1. Keep the existing GitHub Pages website unless a concrete implementation constraint warrants discussing a change.
2. Store all persistent application data in Firestore: tracked shows, imported episode data, the available-show directory, settings, refresh status, and run history. Raw IMDb downloads may be temporary files on the Actions runner; a static JSON catalog or Google Sheet must not remain the production source of truth.
3. Add shows to a pending batch. Adding a show MUST NOT start a refresh automatically. The user may add several shows, then explicitly click Refresh all data once.
4. Every requested refresh processes ALL currently tracked shows, not only newly added shows. Download the relevant IMDb datasets once per run and filter them for the selected collection.
5. No automatic/daily scheduled refreshes in the initial version. Infrequent, explicit use is intentional.
6. Keep the website usable during refreshes. Continue serving the last successful dataset until a validated replacement is published.
7. Maintain a lightweight directory of all series in the latest imported IMDb source, not episode data for every series. Use it to select shows to add. Permit manual IMDb IDs/URLs when the directory does not yet include a show.
8. Provide add, hide, restore, and remove controls. Persist changes across the owner's devices through authentication and Firestore.
9. Show refresh activity unobtrusively in the top corner: animated indicator, elapsed time, approximate typical duration, and reassurance that browsing still works. Respect reduced-motion settings.
10. Record timing history. After at least five successful comparable full refreshes, display the median duration. Before then, label any estimate provisional; use a measured pilot run if available and never invent a measured value.
11. Include release information in the plan: series premiere date and episode original air/release dates, where a suitable additional provider supplies them. Provider selection is unresolved. Missing dates must remain unknown, not fabricated.
12. Prepare for a future personal watch-list/tracker project by separating imported metadata from personal state and retaining stable show AND episode IDs. Do not expand the first release into a full watch-tracking app.

Superseded ideas: adding a show immediately launches a job; per-show-only refresh; routine scheduled refresh; a static public catalog instead of Firestore; scaling-oriented services and optimization. Those are not the agreed MVP.

## 3. Current system and verified starting point

- Repository: https://github.com/talrme/best-tv
- Live site: https://talrme.github.io/best-tv/
- Local checkout used during planning: `/Users/talg/Desktop/Websites For Fun/best-tv` (machine-specific convenience, not a deployment dependency).
- Inspected source commit: `8a54f9f0a05ee462251d87bacd86618f05429ff3` (`Add episode details modal`). HEAD and origin/main still matched this commit when this handoff was written. Fetch and inspect again before implementation.
- Main files: `index.html`, `styles.css`, `script.js`, `README.md`; vanilla HTML/CSS/JavaScript with no application build step currently required.
- Default show: Halt and Catch Fire. Preserve show search, episode heatmap, rating thresholds, sortable must-watch table, tap/click episode details, IMDb links, shareable URL parameters, and browser settings unless deliberately redesigned.
- `script.js` currently downloads the entire published Sheet CSV using `gviz/tq?tqx=out:csv&gid=0`, groups it by show, and draws the view. Current rating calculations exclude specials/episode zero and missing ratings. Keep calculation policy explicit; don't discard useful unrated episode records from the imported catalog.
- Current browser keys include `best-tv:last-show` and `best-tv:settings`. Plan compatible preference migration; do not silently clear them.

### Colab and source data

Notebook: https://colab.research.google.com/drive/1Bxuls9Ig4wuxerzQfcHJ0wRcz59XolU2#scrollTo=KsqTdDj--irx

The notebook was inspected directly on November 19, 2026. It contained 63 hard-coded IMDb series IDs at that time. Treat this count as dated evidence; re-read the current notebook/Sheet when migrating, rather than using a frozen count or earlier prototype data.

It downloads:

- `https://datasets.imdbws.com/title.episode.tsv.gz`
- `https://datasets.imdbws.com/title.ratings.tsv.gz`
- `https://datasets.imdbws.com/title.basics.tsv.gz`

It joins episode relationships, show titles, episode titles, ratings, and vote counts; exports Season, Episode, Title, Rating, Votes, IMDB Link, and Show; archives the previous raw_data worksheet; then clears and rewrites it. It currently drops the explicit episode ID column after constructing IMDb links. Preserve that ID in 2.0, and retain the parent show's IMDb ID too.

Current Sheet: https://docs.google.com/spreadsheets/d/1B5iPZgD3AVaQQM9dFa-2V-lj5RGEPTClJi-gvlrmIJY/edit

Archive Sheet: https://docs.google.com/spreadsheets/d/1gw7RyuG8p2sKe8cSOr2gYEyu-2lHD4xOZEWk31Xe9Hw/edit

Do not execute the notebook's clear/write cells just to inspect or migrate it. Extract code and read existing data. Keep the current site/Sheet available as rollback during migration. A Sheet export can remain optional later, but isn't required for 2.0.

## 4. Proposed architecture

These are implementation recommendations consistent with the requirements, not claims that resources already exist:

```text
GitHub Pages browser app
  |-- Firebase Auth: owner signs in
  |-- Firestore: read published catalog + own library; save pending selections
  `-- callable Firebase Function: request full refresh
        |-- authorize owner, validate input, prevent duplicate active jobs
        |-- create persistent request/run record
        `-- GitHub workflow_dispatch (fixed repo/workflow/ref)
              `-- Python importer on GitHub Actions
                    |-- authenticate to Google Cloud through OIDC/WIF
                    |-- capture collection revision / selected show IDs
                    |-- download and process IMDb + release metadata
                    |-- validate staged results
                    `-- publish Firestore version; finish run record
```

Use one small Firebase Function to dispatch work, not to process large IMDb files. Keep the browser free of GitHub credentials. A narrowly scoped fine-grained token in Secret Manager is a reasonable personal MVP; a GitHub App is optional and not required. Plan for credential expiry and an actionable dispatch failure message.

The Actions-to-Google identity should use Workload Identity Federation/OIDC restricted to this repository and trusted branch/environment. Avoid a long-lived downloaded Google service-account key. Server/Admin SDK operations use IAM and bypass Firestore Security Rules; configure both appropriately.

Only the owner may mutate the shared catalog selection or request imports. Merely signing in with any Google account must not grant administration. Preserve public browsing unless the owner requests making the site private. Personal preferences/library state and operational errors must not be publicly readable by default.

## 5. Collection operations and batching

### Add

- Search the last imported series directory by title, with year/type shown for disambiguation; identify records by IMDb ID, not title.
- Also accept a manual `tt...` ID or an IMDb title URL; normalize to the ID, reject malformed input, and deduplicate additions.
- Save each addition immediately in Firestore as tracked/pending, without launching GitHub Actions.
- Show pending additions and a clear button such as `Refresh all data · 3 additions`.
- A user may leave and return without losing the batch.
- Manual IDs are verified as suitable series during import. If missing from the latest source, retain the pending selection and show a clear reason; don't claim episodes were imported.

### Hide, restore, and remove

Working semantics proposed in the conversation:

- Hide: hide from the owner's normal library; preserve data and continue including the show in full refreshes. A Hidden view can restore it. This is a browsing preference, not a privacy boundary on previously public ratings.
- Remove: archive/untrack the show and exclude it from later refreshes. Do not trigger a refresh merely to remove it. Retain data for undo; permanent deletion is separate and not a default destructive action.
- Importing must never resurrect a removed show or clear hidden state.

### Changes during a run

At job start, capture the tracked IDs and collection revision. Additions after that point remain pending for a later explicit refresh. Do not silently launch another job. End with a message such as `Refresh complete · 1 addition still pending` when applicable.

If a show is removed while processing, completion must not re-add it to the collection. Keep collection state separate from imported data and recheck current selection before updating active-library publication references.

## 6. Persistent refresh state, timing, and failure behavior

Use explicit state, not just a comparison of last-refreshed timestamps.

```text
queued -> running -> succeeded
   |         |
   +---------+----> failed / cancelled
```

Store at least:

```text
requestId, runId, requestedByUid, requestedAt
startedAt, heartbeatAt, finishedAt
status, stage, requestedCollectionRevision, capturedShowIds
githubRunId, githubRunUrl, publishedVersion
sourceFetchedAt, source identity/checksums when available
counts, per-show outcomes, safe error summary, timingSampleEligible
```

- UI stage labels may include waiting for GitHub, downloading source, processing, saving, validating, and publishing. Do not invent percentage completion from elapsed time.
- Display total user wait from requestedAt, including queue time; optionally show processing time separately. Use server-recorded timestamps and recompute elapsed time locally, not a Firestore write every second.
- Subscribe to only the small active-run record for progress. Reopening the page or using another device should recover the same run status.
- Publish heartbeats periodically. A stale heartbeat means `Refresh may be interrupted`, not proof of failure. Reconcile against GitHub/lease state before allowing overlapping workers or clearing the lock.
- Make duplicate requests idempotent, use a server-side lease/request identity and GitHub concurrency, and prevent an older or cancelled worker from publishing after its lease is lost. A disabled browser button alone is insufficient.
- Explicitly record dispatch failure, queued jobs that never start, cancellation, and timeout. Make recovery possible even when a killed runner cannot execute its cleanup code.
- Keep failure messages useful but sanitized; link the owner to the run. Don't expose secrets, source dumps, or personal account data in public workflow logs.

### Duration estimate

- Keep requestedAt, startedAt, and finishedAt so queue, processing, and total duration can be measured separately.
- After five successful comparable FULL refreshes, show the median total duration. A rolling window of the most recent 20 qualifying successes is a proposed simple policy.
- Exclude failed/cancelled/partial runs and one-time migration/directory bootstrap jobs from the normal typical-duration sample. Record the reason when a run is excluded.
- Before five qualifying successes, use a clearly provisional estimate from a measured pilot if one exists; otherwise say the estimate is not learned yet. Don't present a guess as a benchmark.
- Explain that timing is approximate. If elapsed exceeds the median, continue showing real status rather than declaring failure.

## 7. Firestore data model and publication

Suggested logical collections; exact paths may be refined during implementation:

```text
trackedShows/{imdbShowId}
  tracked/archived, addedAt, updatedAt, displayNameOverride
users/{uid}/library/{imdbShowId}
  hidden, sortOrder, updatedAt
users/{uid}/preferences/main
  thresholds, density, reducedMotion, ...

catalog/current
  version, publishedAt, sourceFetchedAt, schemaVersion, summary
catalogVersions/{version}/shows/{imdbShowId}
  imported title/year/type, aggregates, premiere date, provider IDs/provenance
catalogVersions/{version}/shows/{imdbShowId}/seasons/{seasonChunkId}
  bounded episode records including stable IDs, ratings, votes, release metadata

showDirectory/...                  # bounded searchable series-only records/shards
refreshRequests/{requestId}
refreshRuns/{runId}
operations/activeRefresh           # trusted lease/current run pointer
```

Requirements:

- Keep imported fields separate from owner-editable fields; replacement imports must not overwrite personal state.
- Stage a new immutable catalog version and validate it before atomically switching a small current-version pointer. Readers pin a version for an entire view and do not mix old/new seasons during publication.
- A failed required import leaves the pointer unchanged. If one requested series is absent upstream, report it explicitly as pending/not found while retaining last-good data for previously imported shows; decide and document the per-show publication policy before implementation. Never silently replace a known show's episodes with an empty result.
- Preserve unrated episodes as records with a null rating; exclude them only from computations that require ratings. Handle missing season/episode numbers and specials explicitly rather than casting `\N` blindly.
- Use bounded season/chunk documents, comfortably below Firestore's 1 MiB document limit; don't put every episode or every directory entry in one document. Avoid a read/listener per heatmap cell.
- Retain a small configurable number of prior published catalog versions for rollback; clean up older versions explicitly, including subcollections, after readers have a grace period. Avoid unbounded duplicate history.
- The first directory import can be much larger than the selected show's episode data. Measure document counts, storage, and write cost before the bootstrap; don't assume the full IMDb series directory fits the free daily write allowance.

### Available-show directory

Build from `title.basics`, initially targeting `tvSeries` and `tvMiniSeries`; confirm whether any other title types are useful. Keep only stable ID, title, normalized search title, year, and type, with optional disambiguation fields. It must not import all series' episode catalogs or ratings.

Firestore doesn't provide arbitrary full-text search automatically. Start with bounded normalized title-prefix lookup and exact IMDb ID lookup. Choose indexed per-show documents or bounded prefix shards after measuring size; if sharding, define deterministic splitting before any shard approaches the document limit. Don't introduce an external search service for this personal MVP.

Compare content hashes and update only changed directory records/shards where practical. Merely refreshing a lastSeen timestamp on every unchanged series would still incur a write for every series. Only declare the directory refresh complete after its intended update succeeds; distinguish its status from selected-catalog publication if necessary. Show the directory's last successful source timestamp in the Add dialog.

## 8. Release dates and future tracking foundation

The owner asked about launch dates after discussing future watch tracking. The working interpretation is series premiere dates plus individual episode original air/release dates. Confirm only if later context suggests a different meaning.

The current three IMDb datasets do not supply exact episode release dates. Their year fields cannot substitute for precise dates. Evaluate an additional provider (for example TVmaze or TMDB) for coverage, IMDb-ID mappings, date precision, rate limits, API credentials, and attribution/license requirements. No provider has been chosen or integrated yet. Keep enrichment within the same explicit full-refresh job.

Store source/provenance, external IDs, fetchedAt, and precision. Preserve a date-only release as a calendar date rather than inventing a midnight UTC timestamp; store actual timestamps in UTC when supplied. Missing dates stay null. Label dates original air dates; do not imply availability on a particular streaming service or in the owner's region. Episode mappings require review for specials and different numbering schemes; don't join by title alone.

Future, OUT OF SCOPE for the first functional release:

- Want to watch / Watching / Rewatch or custom lists.
- Individual watched episodes, watched dates, rewatch history.
- Reliable caught-up/backlog and next-up calculations.

Lay the foundation now: stable show and episode IDs, user-owned data separated from catalog versions, and extensible list membership. Avoid one mutually exclusive status enum that would make `Watching` incompatible with `Caught up` or `Rewatch`. Caught up is eventually a derived state based on sufficiently fresh released-episode data, not a synonym for series finished. Do not add this project scope just because the storage supports it.

## 9. Visual direction and existing experiments

No final production redesign was approved. Three recent concepts were discussed: Episode Desk (heatmap-first with show navigation), My Library (collection-first), and The TV Edit (editorial). Episode Desk is a sensible starting recommendation for the clarified use case, not an irrevocable design decision. Preserve easy phone use, readable episode details, search, and a discreet top-corner refresh indicator.

Machine-local references, if still available:

- Recent interactive concept source: `/Users/talg/.codex/visualizations/2026/11/19/01a1f514-6c2c-7fc0-a355-93330c535edc/best-tv-directions.html`.
- Earlier experiment set: `/Users/talg/Documents/Codex/2026-11-06/chec/outputs/best-tv-staging/` (ten prototypes plus strategy.html).

These files are optional inspiration, not repository dependencies. The recent concept uses illustrative ratings and simulated add/refresh operations. The earlier set used a November 6 snapshot of 61 shows; neither supersedes the latest notebook or this handoff. Don't copy old automatic/scheduled refresh assumptions into the implementation.

Suggested refresh UI:

```text
[animated indicator] Refreshing all shows · 2m 14s elapsed
Usually about [learned median] · Keep browsing
```

Timing numbers above are illustrative only. Pending-show count and run status must remain visible after navigation. Keep mobile controls touch-friendly and essential status available without hovering.

## 10. One-time setup and unresolved choices

Before building, inspect existing project configuration and reuse verified identifiers; do not assume the owner has already created any Firebase resources for Best TV.

- Select an existing Firebase project or create a dedicated project; choose Firestore region before provisioning. Avoid changing the billing or security posture of unrelated apps accidentally.
- Enable Google sign-in; authorize the website hostname and explicitly configure local development domains as needed. Establish the owner's UID/allowlist through trusted setup.
- Blaze billing is required for the proposed Firebase Function. Explain estimated usage from an actual pilot and directory bootstrap rather than promising zero charges. Configure budget alerts; alerts are not themselves hard spending caps.
- Register the web app and configure environment values. Firebase web configuration is not an admin credential; Security Rules still enforce authorization. Never commit service-account private keys or GitHub dispatch tokens.
- Configure Secret Manager and a dispatch credential limited to this repository, plus GitHub-to-Google WIF/IAM, trusted workflow/ref restrictions, and minimal workflow permissions.
- Confirm the release-date provider and its terms/identity-mapping policy.
- Choose/refine the visual direction after reviewing a staging build.

These are setup tasks, not reasons to ask the owner to repeat the established batch/full-refresh/personal-use requirements. Prepare concrete configuration and work within existing authorization; ask only for genuinely missing account selections or actions that require the owner's participation.

## 11. Implementation sequence

1. Re-read this document, fetch the repository, inspect instructions/worktree changes, and re-read current notebook and source Sheet. Preserve unrelated files and work. Extract current selected show IDs; don't reconstruct identities from names alone if the notebook supplies IDs.
2. Extract a standalone Python CLI and dependency file. Remove Colab magics, interactive authentication, `pip install` cells, unused plotting/BigQuery dependencies, and Sheet overwrite operations. Stream/chunk large TSVs, filter early, preserve IDs/nulls, and produce validated intermediate results.
3. Implement the Firestore schema, Security Rules, owner authorization, staging-version writer, pointer publication, and a read-only adapter for the existing UI. Profile the full series directory before choosing its layout/import strategy.
4. Run a controlled initial import into a staging Firebase target. Compare source and output shows, IDs, episode counts, ratings, and vote counts. Include release metadata integration once its provider is chosen; represent gaps honestly.
5. Implement the authenticated dispatch function, full-refresh workflow, persistent run records/leases/heartbeats, failure recovery, and duration history. No cron schedule. All refreshes process the captured tracked collection.
6. Add collection management with pending batches, manual IMDb IDs, directory search, hide/restore/remove, and cross-device state. Connect the real progress UI and timing estimates; remove simulated statuses from any reused concept.
7. Apply the selected responsive visual design while retaining existing browsing features and old shared-link compatibility.
8. Verify acceptance criteria below, demonstrate staging, then migrate the live data adapter and publish through the repository's actual Pages setup. Preserve rollback to the prior site and Sheet until the owner is comfortable.
9. Update README with real setup/deployment/recovery commands, resource identifiers that are safe to record, and measured timing/cost results. Update this plan with completed items and any explicit changes of decision.

Candidate source layout (adapt to repo conventions; don't require a framework rewrite):

```text
scripts/import_catalog.py
scripts/requirements.txt
functions/                         # small dispatch/reconciliation backend
.github/workflows/refresh-data.yml
firestore.rules
firestore.indexes.json
firebase.json
docs/                              # setup, data model, operations after implementation
```

## 12. Acceptance criteria

- Add three shows without launching a job; reload and see the same pending batch.
- One explicit refresh includes those three AND all previously tracked shows; hidden shows remain included, removed shows excluded.
- Add another show during a run; it remains pending and no second automatic run starts. Remove during a run; completion doesn't re-add it.
- Duplicate clicks/retries don't produce conflicting workers; a stale worker cannot publish over a newer run.
- The last good ratings stay browsable throughout queued/running/failure states. Reopening on a second device shows the real current status and pending selections.
- Queued, running, success, failure, cancellation, dispatch failure, and stale-heartbeat recovery behave honestly. Successful publication switches the visible catalog consistently.
- Duration estimates remain provisional before five qualifying successes and use the defined median afterward. Elapsed time survives reload; reduced-motion mode works.
- Directory search is paginated/bounded, identifies duplicate titles by year/ID, and supports manual IDs. An upstream-missing series has a clear pending/not-found state.
- Current source show IDs migrate without duplicates; imported episode IDs remain stable across versions; null ratings/dates, specials, missing numbers, and temporary upstream omissions are handled explicitly.
- Dates show provenance/precision and aren't invented from year-only values. Missing enrichment does not masquerade as confirmed release metadata.
- Owner can edit and request jobs; a different signed-in user and an anonymous visitor cannot perform administrative writes or read private user/operational data. Exercise Rules in the emulator and IAM/dispatch behavior separately.
- Existing heatmap, thresholds, must-watch sorting, episode details, IMDb links, settings, and old shared URLs still work on desktop and narrow phones.
- No runtime dependency on the old Sheet, no accidental background schedule, no browser GitHub token, no committed credentials, and no watch-tracker feature expansion.

## 13. Primary references to recheck at implementation time

Product/API limits and billing may change. These were consulted during planning; verify them again rather than assuming old numeric limits, action versions, or setup screens remain current.

- IMDb datasets, daily update cadence, fields, and non-commercial terms: https://data.imdb.com/non-commercial-datasets/
- GitHub workflow dispatch endpoint/permissions: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
- GitHub OIDC with Google Cloud: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform
- Firebase callable functions: https://firebase.google.com/docs/functions/callable
- Firebase function billing/quotas: https://firebase.google.com/docs/functions/quotas
- Firestore limits, including document size and free allowances: https://firebase.google.com/docs/firestore/quotas
- Firestore Security Rules versus server IAM: https://firebase.google.com/docs/firestore/security/overview
- Firebase Google sign-in: https://firebase.google.com/docs/auth/web/google-signin
- GitHub Actions billing (standard public runners versus other usage): https://docs.github.com/en/billing/concepts/product-billing/github-actions

## 14. Suggested prompt for a future AI session

> Read NEXT_STEPS_BEST_TV_2.0.md and the current README, inspect repository instructions and changes, and implement Best TV 2.0 in stages. Preserve the settled personal-use requirements: Firestore-backed data, batch show additions, only an explicit full-refresh button triggers the GitHub Action, no scheduled jobs, and continued browsing during refresh with persistent status/elapsed time and a learned median after five successful runs. Preserve IDs and separate personal state for later watch tracking, but don't build that tracker now. Inspect existing Firebase configuration before requesting missing account setup. Use a staging target, validate the migration and failure behavior, and keep production rollback available.
