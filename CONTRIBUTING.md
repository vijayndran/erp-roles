# Contributing

The whole dataset is one file — **`roles.json`** — and everything else
(`README.md`, `index.html`) is **generated** from it. Contributing is editing
JSON and re-running one command.

## The golden rule

**Never hand-edit `README.md` or `index.html`.** They are build output. Edit
`roles.json`, then regenerate. CI will reject a drift between them.

## The model

A canonical ERP role is defined on three axes:

- **`platforms`** — one or more keys from `meta.platforms` (`SAP`, `SAP_B1`,
  `ORACLE`, `DYNAMICS`, `WORKDAY`, `INFOR_M3`, `NETSUITE`, `SAGE`). A role can
  span several platforms (e.g. a Project Manager exists everywhere) or be
  platform-specific (Basis is SAP/Oracle, not NetSuite).
- **`stream`** — one key from `meta.streams` (`FUNCTIONAL`, `TECHNICAL`,
  `BASIS_ADMIN`, `DATA_ANALYTICS`, `PM_LEADERSHIP`). This is what keeps
  "SAP Consultant" from meaning ten different jobs.
- **`tier`** — one of `meta.tiers` (`ENTRY`, `MID`, `SENIOR`, `LEAD`, `MANAGER`).

## How to add or change a role

1. Fork and clone. Open `roles.json`, edit the `roles` array:

   ```json
   {
     "id": "erp-functional-consultant",
     "positionTitle": "ERP Functional Consultant",
     "platforms": ["SAP", "ORACLE", "DYNAMICS"],
     "stream": "FUNCTIONAL",
     "tier": "MID",
     "summary": "One line: what the role actually does.",
     "requiredSkills": ["..."],
     "preferredSkills": ["..."],
     "compMin": 6000,
     "compMax": 11000,
     "aliases": ["SAP Functional Consultant", "Oracle Functional Consultant"]
   }
   ```

   Field rules:
   - `id` — stable kebab-case slug, **unique**; don't change an existing one (public handle).
   - `platforms` — at least one; add a new platform to `meta.platforms` first.
   - `stream` / `tier` — from the allowed sets.
   - `summary` — **required**, one line.
   - `compMin <= compMax`, indicative MYR/month (SEA mid-market), dated by `meta.asOf`.
   - `aliases` — raw titles seen in the wild that map here. **The most valuable
     thing to grow.** Don't repeat the `positionTitle` itself (the validator rejects it).

2. **Just adding a title you saw?** Add it to the closest role's `aliases`. One line.

3. If you added a progression path, update `ladders` (ordered list of role `id`s).

## Regenerate and verify

```bash
node generate.js      # or: npm run generate
```

Then `npm run check` runs the same regen-and-diff the CI does.

## Build & CI

Every push/PR runs `node generate.js` and `git diff --exit-code` on the generated
files, and the generator validates `roles.json` (unique kebab ids, known
platforms/streams/tiers, at least one platform, `compMin <= compMax`, a required
`summary`, no self-aliases, and that the role count in `meta.description` matches
the data). Malformed data or stale generated files **fail the build**.

`roles.json` carries a `$schema` pointer to [`schema.json`](./schema.json) for
inline editor validation.

## Scope

A **platform-aware taxonomy of ERP role names + light enrichment** — not a salary
benchmark or a certification guide. Comp bands are deliberately indicative.

## License

MIT — see [LICENSE](./LICENSE).
