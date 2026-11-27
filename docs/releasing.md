# Publishing Verso

Verso currently publishes its container through [Build Verso image](../.github/workflows/publish.yml). Every push to `main` triggers a multi-architecture build; it can also be dispatched manually.

## Images

The workflow builds for `linux/amd64` and `linux/arm64` and publishes both:

- `ghcr.io/yo-less/verso:latest`
- `ghcr.io/yo-less/verso:<full-commit-sha>`

The SHA tag pins the source commit. The workflow currently passes `VERSION=v1.3.0-verso` to Docker; semantic-version tags and GitHub release notes are not generated automatically by this workflow.

## Checklist

1. Review changes and verify relevant test jobs on the development branch before merging.
2. Merge into `main` and check [Test Suite](https://github.com/yo-less/verso/actions/workflows/tests.yml) and [Build Verso image](https://github.com/yo-less/verso/actions/workflows/publish.yml). Inspect individual test job results, not just the summary.
3. Verify the published manifest includes both architectures:

   ```bash
   docker buildx imagetools inspect ghcr.io/yo-less/verso:latest
   ```

4. If the interface changed, regenerate and review the demo screenshots using [Capture Verso screenshots](../.github/workflows/screenshots.yml). See [screenshot documentation](screenshots/README.md).

If a build fails, investigate the logs and correct the source on a review branch. Users can pin a previously published commit tag; see [Updating and backups](updating-and-backups.md#choosing-a-version).

The inherited release helpers are not the active Verso publication workflow.
