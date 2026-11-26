# Maintaining Verso

Verso is based on [Scriptorium](https://github.com/MrColoo/scriptorium-library), with upstream changes incorporated from that project. Preserve copyright notices, credits and GPL licensing.

## Fork changes to preserve

- Settings → Branding controls the instance name, four SVG assets, login background and accent, and decorative layout. Default assets are in cps/static/verso-*.svg. User uploads and settings live alongside app.db and must not be committed. Serve custom SVG only through the restricted image endpoint; never inline uploaded SVG.
- Preserve the login's floating labels, password toggle, CSRF, password reset, messages and alternate authentication flows.
- The library home page surfaces the admin-only upstream release notice. Keep upstream release checks, dismissal and links; upstream changes require a new source build.
- KOReader downloads incorporate the instance name into Lua display strings. Preserve cwasync.koplugin, settings keys, version header and /kosync routes. Keep the bounded blocking progress upload before suspend, power-off and Wi-Fi disconnect. Keep plugin version and setup docs aligned.
- Publish multi-architecture images from source. The upstream release workflow is archived; do not reactivate it.

## Updating

1. Review upstream release notes and merge the intended release on a branch.
2. Update the image VERSION to the merged upstream version plus -verso.
3. Run tests and verify both default and custom branding, authentication, mobile login, upstream release notices and actual KOReader behavior.
4. Verify both image manifests after publishing.
