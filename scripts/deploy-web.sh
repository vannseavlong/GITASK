#!/usr/bin/env bash
# Deploy packages/web to Firebase Hosting from this machine.
#
#   scripts/deploy-web.sh prod              typecheck + test + build, confirm, deploy to the live site
#   scripts/deploy-web.sh preview           typecheck + build, deploy to the "staging" preview channel
#
# Flags:  --allow-unclean   prod only: skip ONLY the clean-tree check (must still be on an up-to-date main)
# Env:    DRY_RUN=1         run the guards, print every command instead of running it;
#                           nothing is built and Firebase is never contacted.
#         PREVIEW_EXPIRES   preview channel lifetime (default 7d)
#
# Needs `firebase login` done once by the owner. This script never logs in and holds no token.
set -euo pipefail

# Pinned on purpose (never @latest). Bump deliberately, using a release >= 2 weeks old.
FIREBASE_TOOLS_VERSION="15.34.0"
PREVIEW_CHANNEL="staging"
PREVIEW_EXPIRES="${PREVIEW_EXPIRES:-7d}"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
web="$root/packages/web"
firebase_cli=(npx --yes "firebase-tools@${FIREBASE_TOOLS_VERSION}")

die() { echo "deploy-web: $*" >&2; exit 1; }

[[ -z "${DRY_RUN:-}" || "${DRY_RUN}" == "1" ]] || die "DRY_RUN must be empty or 1 (got '${DRY_RUN}')"

# Print the command in dry-run mode, otherwise run it.
run() {
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

mode="${1:-}"
allow_unclean=0
for arg in "${@:2}"; do
  case "$arg" in
    --allow-unclean) allow_unclean=1 ;;
    *) die "unknown flag: $arg" ;;
  esac
done
[[ "$mode" == "prod" || "$mode" == "preview" ]] || die "usage: deploy-web.sh <prod|preview> [--allow-unclean]"
[[ "$mode" == "prod" || $allow_unclean -eq 0 ]] || die "--allow-unclean only applies to prod"

# Target comes from the files Firebase itself reads, so there is one source of truth.
project="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1] + '/.firebaserc', 'utf8')).projects.default" "$web")"
site="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1] + '/firebase.json', 'utf8')).hosting.site" "$web")"

if [[ "$mode" == "prod" ]]; then
  branch="$(git -C "$root" rev-parse --abbrev-ref HEAD)"
  [[ "$branch" == "main" ]] || die "prod deploys come from main (on '$branch')."
  if [[ $allow_unclean -eq 0 ]]; then
    [[ -z "$(git -C "$root" status --porcelain)" ]] || die "working tree is not clean. Commit or discard changes, or pass --allow-unclean."
  fi
  # Must be exactly origin/main. If the fetch fails (offline) we refuse, even in DRY_RUN.
  git -C "$root" fetch --quiet origin main || die "could not fetch origin/main; cannot confirm main is up to date."
  [[ "$(git -C "$root" rev-parse HEAD)" == "$(git -C "$root" rev-parse origin/main)" ]] \
    || die "local main differs from origin/main. Pull (or push) so they match, then retry."
fi

echo "== typecheck"
run pnpm --dir "$root" --filter gitask-web run typecheck
if [[ "$mode" == "prod" ]]; then
  echo "== tests"
  run pnpm --dir "$root" test
fi
echo "== build"
run pnpm --dir "$root" --filter gitask-web run build

echo
echo "Firebase project : $project"
echo "Hosting site     : $site"
if [[ "$mode" == "prod" ]]; then
  echo "Target           : LIVE https://$site.web.app"
  echo "Commit           : $(git -C "$root" rev-parse --short HEAD)"
  expected="deploy $site"
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "[dry-run] would ask you to type: $expected"
  else
    [[ -t 0 ]] || die "confirmation needs an interactive terminal; nothing was deployed."
    read -r -p "Type '$expected' to publish: " answer
    [[ "$answer" == "$expected" ]] || die "confirmation did not match; nothing was deployed."
  fi
  (cd "$web" && run "${firebase_cli[@]}" deploy --only hosting --project "$project")
  if [[ "${DRY_RUN:-}" != "1" ]]; then
    echo "Deployed. To roll back, see 'Website > Rollback' in Docs/architecture/release.md (Firebase Console > Hosting > Release history > Rollback)."
  fi
else
  echo "Target           : preview channel '$PREVIEW_CHANNEL' (expires in $PREVIEW_EXPIRES), live site untouched"
  (cd "$web" && run "${firebase_cli[@]}" hosting:channel:deploy "$PREVIEW_CHANNEL" --expires "$PREVIEW_EXPIRES" --project "$project")
  echo "The preview URL is printed above by firebase."
fi
