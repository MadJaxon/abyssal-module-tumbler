#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch.
# Does not change master. Run this whenever the live site should update.
#
#   ./scripts/publish-pages.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

remote_name=origin
pages_branch=gh-pages
base_path="/abyssal-module-tumbler/"

if ! git remote get-url "$remote_name" >/dev/null 2>&1; then
  echo "No '$remote_name' remote." >&2
  echo "One-time setup: ./scripts/replace-github-master.sh --replace-master" >&2
  exit 1
fi

url="$(git remote get-url "$remote_name")"
case "$url" in
  *github.com[:/]MadJaxon/abyssal-module-tumbler*) ;;
  *)
    echo "Remote '$remote_name' is $url" >&2
    echo "Refusing to publish to a different repository." >&2
    exit 1
    ;;
esac

if [[ ! -e node_modules/.bin/vite && ! -e node_modules/.bin/vite.cmd ]]; then
  echo "Dependencies are missing. Run: npm install --include=dev" >&2
  exit 1
fi

name="$(git config user.name || true)"
email="$(git config user.email || true)"
if [[ -z "$name" || -z "$email" ]]; then
  echo "Set git user.name and user.email before publishing." >&2
  exit 1
fi

npm run build

index="dist/index.html"
if [[ ! -f "$index" ]]; then
  echo "Build did not write $index" >&2
  exit 1
fi
if ! grep -q "$base_path" "$index"; then
  echo "$index is missing the Pages path $base_path — refusing to publish." >&2
  exit 1
fi

tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

cp -R dist/. "$tmp/"
: >"$tmp/.nojekyll"
cp "$tmp/index.html" "$tmp/404.html"

git -C "$tmp" init -q
git -C "$tmp" checkout -q -b "$pages_branch"
git -C "$tmp" add -A
git -C "$tmp" -c user.name="$name" -c user.email="$email" commit -q -m "Publish GitHub Pages"

echo "Updating $pages_branch on $url"
git -C "$tmp" push --force "$url" "HEAD:${pages_branch}"
echo "Published. Site: https://madjaxon.github.io/abyssal-module-tumbler/"
