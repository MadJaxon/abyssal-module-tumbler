# Abyssal Tumbler

A third-party EVE Online tool for matching **abyssal (mutated) modules** into a fitting budget. Paste modules from in-game chat, set how many of each type belong on the ship, and rank combinations by stacked DPS, capacitor warfare, propulsion, and leftover CPU/PG.

The combination math — including stacking penalties — is a verbatim port of the original [abyssal-module-tumbler](https://github.com/MadJaxon/abyssal-module-tumbler) worker. Display is new; the numbers are not.

This is not affiliated with CCP Games.

## Use it

```bash
npm install --include=dev
npm test
npm run dev
```

Open the printed local URL (Vite, typically `http://localhost:5173`).

1. In EVE, copy mutated modules from chat (they paste as `showinfo` links).
2. Paste into the inventory pane, or press Ctrl+V anywhere on the page.
3. Set CPU / powergrid remaining on the ship and how many of each module type the fit needs.
4. Calculate. Sort, expand a row, copy the combination (names + MutaMarket links).

Inventory, budgets, slot counts, and sort prefs persist in the browser. Result lists are not saved.

### MutaMarket import

Paste a type-search URL such as:

`https://mutamarket.com/modules/type/abyssal-vorton-tuning-system/attributes/…`

Dev mode proxies that through `/api/mutamarket` to avoid CORS. A production host needs the same reverse proxy to `https://mutamarket.com`.

ESI public dogma is fetched directly (`X-User-Agent: AbyssalTumbler/1.0`). If a browser blocks it, the same Vite/nginx proxy can expose `/api/esi` → `https://esi.evetech.net`.

## Tests

```bash
npm test
```

Golden tests pin stacking, combination aggregation, uniqueness, the chat parser, and dogma classification against the original formulas.

## Publish

The public site is [https://madjaxon.github.io/abyssal-module-tumbler/](https://madjaxon.github.io/abyssal-module-tumbler/), served from the `gh-pages` branch of `MadJaxon/abyssal-module-tumbler`. Run the scripts in Git Bash on the machine that has the GitHub SSH key.

GitHub `master` is the old Angular app until the one-time replace below. Copy this repository to that machine, including the `.git` directory. `git clone git@github.com:MadJaxon/abyssal-module-tumbler.git` still downloads the Angular app until that replace has finished.

A production build uses base path `/abyssal-module-tumbler/`. `npm run dev` stays at `/`.

### One time

From this repo, in Git Bash:

```bash
git status
git remote add origin git@github.com:MadJaxon/abyssal-module-tumbler.git
./scripts/replace-github-master.sh --replace-master
```

`git status` must be clean. The script fetches GitHub and force-updates `master` with this history (`--force-with-lease`). It leaves `gh-pages` alone, so the live site stays on the Angular build until the next command.

In the repository on GitHub, Settings → Pages → Build and deployment should be **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**. That is the setting already serving the old site.

Then install, build, and replace the page:

```bash
npm install --include=dev
./scripts/publish-pages.sh
```

`publish-pages.sh` runs the production build and force-updates `gh-pages` only. The site URL stays the same.

### Later

```bash
git clone git@github.com:MadJaxon/abyssal-module-tumbler.git
cd abyssal-module-tumbler
npm install --include=dev
./scripts/publish-pages.sh
```

Pasting modules from in-game chat works on the published site (ESI allows browser requests). A MutaMarket type-search URL needs the dev server's `/api/mutamarket` proxy, which GitHub Pages does not run.

## Out of scope

EVE SSO hangar import, extra module types (shield boosters / armor reps), and a hosted Redis cache layer. The original optional cache service is not required.
