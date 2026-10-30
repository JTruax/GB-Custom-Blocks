# Versioning and releases

How to choose the next version number, where to change it, and what to do when you add a block. Follow it for every zip you install on a site, so you can always tell which code a site is running.

## 1. Choose the number

Versions use `MAJOR.MINOR.PATCH` (semantic versioning), for example `0.2.0` or `1.4.2`. Raise **one** part, and reset the parts to its right to `0`:

| Change | Raise | Example |
|---|---|---|
| Bug fixes, wording, editor tweaks, performance; nothing new to learn and nothing breaks | **PATCH** | `0.2.0` → `0.2.1` |
| A **new block**, a new option on a block, a new feature; existing content keeps working as before | **MINOR** | `0.2.1` → `0.3.0` |
| Anything that **breaks existing content or needs action from site owners**: removing a block or option, renaming a block (`boim/…`) or a saved setting (`data-boim-…`), changing what saved content outputs, dropping support for a WordPress, PHP or GenerateBlocks version | **MAJOR** | `0.3.0` → `1.0.0` |

If one release has several kinds of change, the biggest one wins.

While the version starts with `0.`, the plugin is still taking shape. Use the same rules, and move to `1.0.0` when you consider it ready for client sites. After that, breaking changes need a major version, a changelog entry explaining what to do, and ideally a migration.

## 2. Where the version lives

Every release changes **all seven** of these to the same number:

| File | What to change |
|---|---|
| `boim-blocks.php` | ` * Version:` in the plugin header (what WordPress shows on the Plugins screen) |
| `boim-blocks.php` | `define( 'BOIM_VERSION', '…' );` |
| `readme.txt` | `Stable tag:` |
| `readme.txt` | A new `= x.y.z =` entry under `== Changelog ==` |
| `CHANGELOG.md` | Rename `## Unreleased` to `## x.y.z (YYYY-MM-DD)` |
| `package.json` (+ `package-lock.json`) | `"version"`; change it with `npm version` (step 3) so the lock file follows |
| `src/<block>/block.json` | `"version"` of **each block that changed** in this release (see below) |

**Block versions:** each block with a `block.json` (currently `src/patterns/block.json`) has its own `"version"`. When a release changes that block, set it to the release number. When a release doesn't touch the block, leave it alone. A new block starts at the release that first ships it. The Video Banner has no `block.json` (it extends GenerateBlocks' Container), so it only follows the plugin version.

## 3. Release, step by step

Example for `0.2.0`; replace it with your number.

1. **Changelog.** In `CHANGELOG.md`, rename `## Unreleased` to `## 0.2.0 (2026-11-02)` (today's date). Add a fresh, empty `## Unreleased` above it. Check every change in this release has a line, starting with **New:**, **Changed:**, **Fixed:** or **Removed:**.
2. **Plugin file.** In `boim-blocks.php`, set both ` * Version:           0.2.0` and `define( 'BOIM_VERSION', '0.2.0' );`.
3. **package.json.** Run this; it updates `package.json` and `package-lock.json` without making a commit or tag of its own:

   ```bash
   npm version 0.2.0 --no-git-tag-version
   ```

4. **readme.txt.** Set `Stable tag: 0.2.0`. Under `== Changelog ==`, add a `= 0.2.0 =` entry at the top, a short version of the `CHANGELOG.md` lines (`* New: …`). If you tested on a newer WordPress, update `Tested up to:` too.
5. **Changed blocks.** Set `"version": "0.2.0"` in the `block.json` of each block this release changed.
6. **Check nothing was missed.** This lists every version number in the source:

   ```bash
   grep -rnE "Version:|BOIM_VERSION'|Stable tag|\"version\"" boim-blocks.php readme.txt package.json src/*/block.json
   ```

   The plugin header, `BOIM_VERSION`, `Stable tag` and `package.json` must all show the new number.
7. **Build, check, package.** All must pass before you ship. (`npm run test:e2e` starts the local test site on its own if it isn't running.)

   ```bash
   npm run build
   ```

   ```bash
   npm run lint
   ```

   ```bash
   npm run test:e2e
   ```

   ```bash
   npm run zip
   ```

   Then confirm the zip has the new number:

   ```bash
   unzip -p dist/boim-blocks.zip boim-blocks/boim-blocks.php | grep "Version:"
   ```

8. **Commit and tag.**

   ```bash
   git add -A
   ```

   ```bash
   git commit -m "Release 0.2.0"
   ```

   ```bash
   git tag -a v0.2.0 -m "BOIM Blocks 0.2.0"
   ```

   ```bash
   git push origin main --follow-tags
   ```

9. **Optional: a GitHub release with the zip attached**, so the exact file for each version is kept on GitHub:

   ```bash
   gh release create v0.2.0 dist/boim-blocks.zip --title "BOIM Blocks 0.2.0" --notes-file <(sed -n '/^## 0.2.0/,/^## /p' CHANGELOG.md | sed '1d;$d')
   ```

10. **Install it.** Upload the zip on the site (**Plugins → Add New Plugin → Upload Plugin → Replace current with uploaded**). Check the Plugins screen shows the new version.

## 4. Between releases

- **Every change gets a changelog line** under `## Unreleased` in `CHANGELOG.md`, in the same commit as the change. At release time, the list is already written.
- **Don't change version numbers in everyday commits.** Only the release commit (step 3) does that.
- **Testing a work-in-progress zip on a site?** Give it a pre-release number so it can't be mistaken for the real release, e.g. `0.2.0-beta.1`, then `0.2.0-beta.2`. Do steps 2, 3, 6 and 7 only; there's no changelog date, tag or GitHub release. The final release is plain `0.2.0`.

## 5. Adding a new block

A new block always means at least a **MINOR** release.

1. Create `src/<block>/` with its `block.json`. Set `"version"` to the release it will ship in, and `"textdomain": "boim-blocks"`.
2. Register it in `boim_register_blocks()` in `boim-blocks.php`. If it has no `block.json` (like the Video Banner), add its entries to `webpack.config.js` and its assets to `boim_register_assets()` instead.
3. Add its tests in `tests/e2e/<block>.spec.js`, plus any demo content in `playground/`.
4. Document it:
   - `README.md`: add it to the block list at the top, and give it its own `## <Block>` section.
   - `readme.txt`: add it under `== Description ==`.
   - `CHANGELOG.md`: add **New: …** under `## Unreleased`.
5. Release it with the steps in section 3.

## 6. Raising requirements

The minimums live in `boim-blocks.php` (`Requires at least:`, `Requires PHP:`, the GenerateBlocks check in `boim_generateblocks_notice()`) and `readme.txt` (`Requires at least:`, `Requires PHP:`). Also update `minimum_wp_version` and `testVersion` in `phpcs.xml.dist`. Raising any of them is at least a **MINOR** release, with a changelog line saying what's now required. Make it **MAJOR** if sites still on the old version would lose features.
