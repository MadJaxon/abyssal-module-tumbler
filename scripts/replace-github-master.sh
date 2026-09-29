#!/usr/bin/env bash
# One-time switch: point GitHub master at this repository.
# Does not change the gh-pages branch. Publish the site with publish-pages.sh.
#
#   ./scripts/replace-github-master.sh --replace-master
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

remote_name=github
repo_ssh="git@github.com:MadJaxon/abyssal-module-tumbler.git"

if [[ "${1:-}" != "--replace-master" ]]; then
  echo "This replaces GitHub master with this repo. The Angular history stops being master." >&2
  echo "Run: ./scripts/replace-github-master.sh --replace-master" >&2
  exit 1
fi

branch="$(git branch --show-current)"
if [[ "$branch" != "master" ]]; then
  echo "Checkout master first (current branch: ${branch:-detached})." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash them first." >&2
  git status --short >&2
  exit 1
fi

if git remote get-url "$remote_name" >/dev/null 2>&1; then
  url="$(git remote get-url "$remote_name")"
  case "$url" in
    *github.com[:/]MadJaxon/abyssal-module-tumbler*) ;;
    *)
      echo "Remote '$remote_name' is $url" >&2
      echo "Expected $repo_ssh" >&2
      exit 1
      ;;
  esac
else
  git remote add "$remote_name" "$repo_ssh"
  url="$repo_ssh"
fi

echo "Fetching $url"
git fetch "$remote_name"

echo
echo "GitHub master:"
git log -1 --format='  %h %s' "$remote_name/master"
echo "This master:"
git log -1 --format='  %h %s' master
echo
echo "Updating GitHub master to this history (--force-with-lease)."
echo "gh-pages is left as it is."
git push --force-with-lease -u "$remote_name" "$branch"
echo
echo "master on GitHub now matches this repo."
echo "Next: npm install --include=dev && ./scripts/publish-pages.sh"
