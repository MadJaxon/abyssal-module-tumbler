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

## Out of scope

EVE SSO hangar import, extra module types (shield boosters / armor reps), and a hosted Redis cache layer. The original optional cache service is not required.
