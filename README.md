# Token Radar

[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/dzulqarnainfaisal/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/dzulqarnainfaisal/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

An entry for the make.fun bounty [Token Radar](https://make.fun/bounty/token-radar-01).

## What it does

Token Radar ranks DeFi protocols that have no token yet by their implied token value: each protocol's TVL multiplied by the median TVL-to-market-cap multiple of its peers. The multiple falls back from sector, to category, to a global median when a peer group is too thin. The entry reads a frozen DefiLlama snapshot (758 protocols) and scores the 198 watchlist rows into a board, a dossier, and an interactive dashboard.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

The output lands in `out/`: `board.json` (198 ranked rows), `dossier.json`, and the `dashboard/` files.
