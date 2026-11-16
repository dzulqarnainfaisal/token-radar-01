// The token radar's model (radar-3): one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks every protocol the snapshot records as pre-token that is not a wrapped, staked or
// bridged product of a token that already trades. The watchlist is the floor, never the ceiling: all
// 40 of its slugs are covered, and every other rankable protocol joins them, so the board is the whole
// radar, not just the floor's 40.
//
// Implied value follows only from the snapshot's own figures, and it is calibrated on the snapshot's
// own live market instead of a flat multiple:
//
//   implied = round( tvl_usd x catMultiple x growthMult x maturityMult x breadthMult )
//
//   catMultiple  the median market-cap / TVL of the live-token protocols in the same category
//                (at least 3 live peers); else the median of the live-token protocols in the same
//                SECTOR (a group of related categories, at least 3 live peers); else the global
//                live median; clamped to [0.05, 1.50]. A category's token is worth what that
//                category's live tokens are worth per dollar of TVL, and where a category has too
//                few live peers of its own, its sector's live tokens are the next-nearest market
//                instead of the whole market's median. No protocol name is ever special-cased: the
//                multiples are recomputed from the sealed snapshot on every run.
//   growthMult   1 + clamp(change_7d, -60, 150) / 100 x 0.5   (unreported growth counts as 0)
//   maturityMult 0.70 + min(age_days, 1095) / 1095 x 0.40      (age unknown counts as 365 days)
//   breadthMult  1 + 0.015 x min(max(chains - 1, 0), 10)
//
// The snapshot carries market cap, not fully diluted value, so the multiple is a conservative
// stand-in for launch value: it says what the market pays per TVL dollar for peers that already
// trade. The dashboard shows the whole calibration table (peers, median, fallback) so the number
// can be audited. A protocol is said to record no token, never to have none.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
  multiple_floor: number;
  multiple_cap: number;
  min_peers: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 150,
  maturity_floor: 0.7,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_per_chain: 0.015,
  breadth_max_chains: 10,
  multiple_floor: 0.05,
  multiple_cap: 1.5,
  min_peers: 3,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's calibration: how many live peers set it, the median multiple they give, and the
 * sector that backs it when the category has too few live peers of its own (null when the category
 * belongs to no sector). */
export interface CompEntry {
  category: string;
  peers: number;
  median: number;
  source: 'category' | 'sector' | 'global';
  sector: string | null;
}

/** The calibration of the whole snapshot: the global median, one entry per board category, and one
 * entry per sector. */
export interface Calibration {
  global_median: number;
  by_category: Map<string, { peers: number; median: number }>;
  by_sector: Map<string, { peers: number; median: number }>;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    multiple_source: 'category' | 'sector' | 'global';
    multiple_peers: number;
    multiple_sector: string | null;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with the farm plan generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  watchlist: boolean;
  category_multiple: number;
  multiple_source: 'category' | 'sector' | 'global';
  multiple_peers: number;
  multiple_sector: string | null;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl_ratio: number | null;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_implied_usd: number;
  global_median: number;
  comps: CompEntry[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted list of numbers; 0 when the list is empty. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Categories that are wrapped, staked or bridged products by definition, never a launch of their own. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Exchange names: a protocol beginning with one is that exchange's product, not a launch of its own. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word wrapped, staked or staking anywhere in the name: a derivative, not a launch. */
const DERIVATIVE_WORD = /\b(wrapped|staked|staking)\b/i;

/**
 * Whether a protocol is one the board may rank: it records no token, and it is not a wrapped,
 * staked or bridged product of a token that already trades. This is the house watchlist's rule,
 * applied to the whole board instead of only the floor's 40: a protocol above the floor that the
 * watchlist leaves out is left out for the same cause, and a protocol below the floor that the
 * rule keeps is a subject, not an exception.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (DERIVATIVE_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((x) => p.name.startsWith(x))) return false;
  if (VERSIONED.test(p.name)) return false;
  return true;
}

/**
 * The sector map: each category belongs to exactly one sector, or to none. A sector is used only
 * when a category has fewer than 3 live peers of its own, and only when the sector itself has at
 * least 3 live peers; otherwise the global median applies. The sectors group categories by what
 * the protocols do, so the fallback multiple comes from the nearest market, not the whole market:
 *
 * - Lending: protocols that lend and borrow against collateral (lending pools, CDP vaults and
 *   collateral managers all price the same thing: a dollar lent against locked collateral).
 * - Yield & Allocation: protocols that allocate capital to earn yield (vaults, yield aggregators,
 *   risk curators and farms all take deposits and put them to work for a return).
 * - Staking: protocols that stake or restake assets for yield (liquid staking, restaking and
 *   staking pools all wrap the same staking yield).
 * - Trading: venues where assets trade (DEXs, derivatives, options, prediction markets and OTC
 *   desks all earn from trading flow).
 * - Bridges & Chains: cross-chain plumbing, the chains themselves, and BTC representations that
 *   move across chains (all of them are valued as the rails assets move on, not as an app).
 * - Asset-Backed: tokens backed by off-chain value (RWA, stablecoin wrappers and dual-token
 *   stablecoins all price the backing, not an app's usage).
 *
 * Categories with NO sector stay on the global median when they have fewer than 3 peers:
 * Payments, Crypto Card Issuer, Insurance, Governance Incentives, AI Agents, Decentralized AI,
 * NFT Marketplace, Launchpad, Token Locker, and any category not listed above. There is no
 * catch-all sector: a category with no near neighbours takes the whole market's median, honestly.
 */
export const SECTOR_OF_CATEGORY: Map<string, string> = new Map([
  // Lending: lend/borrow against collateral.
  ['Lending', 'Lending'],
  ['CDP', 'Lending'],
  ['CDP Manager', 'Lending'],
  ['Collateral Markets', 'Lending'],
  ['Collateral Management', 'Lending'],
  ['Uncollateralized Lending', 'Lending'],
  // Yield & Allocation: allocate capital to earn yield.
  ['Yield', 'Yield & Allocation'],
  ['Yield Aggregator', 'Yield & Allocation'],
  ['Onchain Capital Allocator', 'Yield & Allocation'],
  ['Risk Curators', 'Yield & Allocation'],
  ['Liquidity Manager', 'Yield & Allocation'],
  ['Leveraged Farming', 'Yield & Allocation'],
  ['Farm', 'Yield & Allocation'],
  ['CeDeFi', 'Yield & Allocation'],
  // Staking: stake/restake assets for yield.
  ['Liquid Staking', 'Staking'],
  ['Liquid Restaking', 'Staking'],
  ['Restaking', 'Staking'],
  ['Staking Pool', 'Staking'],
  // Trading: venues where assets trade.
  ['Dexs', 'Trading'],
  ['Derivatives', 'Trading'],
  ['Basis Trading', 'Trading'],
  ['Options', 'Trading'],
  ['Prediction Market', 'Trading'],
  ['Interest Rate Derivatives', 'Trading'],
  ['OTC Marketplace', 'Trading'],
  // Bridges & Chains: cross-chain plumbing, the chains, and BTC that moves across them.
  ['Bridge', 'Bridges & Chains'],
  ['Canonical Bridge', 'Bridges & Chains'],
  ['Cross Chain Bridge', 'Bridges & Chains'],
  ['Chain', 'Bridges & Chains'],
  ['Anchor BTC', 'Bridges & Chains'],
  ['Decentralized BTC', 'Bridges & Chains'],
  // Asset-Backed: tokens backed by off-chain value.
  ['RWA', 'Asset-Backed'],
  ['Stablecoin Wrapper', 'Asset-Backed'],
  ['Dual-Token Stablecoin', 'Asset-Backed'],
  ['DOR', 'Asset-Backed'],
]);

/**
 * The calibration: for every category, the median market-cap / TVL of its live-token protocols
 * (at least `min_peers` of them), the same median per sector (grouping the sector's categories'
 * live protocols), and the global median across all live protocols. A category with too few live
 * peers falls back to its sector's median when the sector has enough peers, else to the global
 * median, and the dashboard says which one applied.
 */
export function buildCalibration(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const byCategory = new Map<string, number[]>();
  const bySector = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    if (isPreToken(p)) continue;
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio)) continue;
    all.push(ratio);
    if (p.category !== null) {
      const list = byCategory.get(p.category) ?? [];
      list.push(ratio);
      byCategory.set(p.category, list);
      const sector = SECTOR_OF_CATEGORY.get(p.category);
      if (sector !== undefined) {
        const sList = bySector.get(sector) ?? [];
        sList.push(ratio);
        bySector.set(sector, sList);
      }
    }
  }
  all.sort((a, b) => a - b);
  const global = median(all);
  const by_category = new Map<string, { peers: number; median: number }>();
  for (const [category, ratios] of byCategory) {
    if (ratios.length < model.min_peers) continue;
    ratios.sort((a, b) => a - b);
    by_category.set(category, { peers: ratios.length, median: median(ratios) });
  }
  const by_sector = new Map<string, { peers: number; median: number }>();
  for (const [sector, ratios] of bySector) {
    if (ratios.length < model.min_peers) continue;
    ratios.sort((a, b) => a - b);
    by_sector.set(sector, { peers: ratios.length, median: median(ratios) });
  }
  return { global_median: global, by_category, by_sector };
}

/** The category multiple one protocol gets: its category's median (at least 3 live peers), else
 * its sector's median (at least 3 live peers), else the global median. The multiple is rounded to
 * four decimals here, before it scores anything, so the number board.json states is exactly the
 * number the model used: the page recomputes the row from the stated multiple and must land on
 * the same implied value. */
export function categoryMultiple(p: SnapshotProtocol, calibration: Calibration, model: ModelConstants = MODEL): { multiple: number; source: 'category' | 'sector' | 'global'; peers: number; sector: string | null } {
  const entry = p.category !== null ? calibration.by_category.get(p.category) : undefined;
  if (entry !== undefined) {
    return { multiple: round4(Math.min(Math.max(entry.median, model.multiple_floor), model.multiple_cap)), source: 'category', peers: entry.peers, sector: null };
  }
  const sector = p.category !== null ? SECTOR_OF_CATEGORY.get(p.category) : undefined;
  const sectorEntry = sector !== undefined ? calibration.by_sector.get(sector) : undefined;
  if (sectorEntry !== undefined) {
    return { multiple: round4(Math.min(Math.max(sectorEntry.median, model.multiple_floor), model.multiple_cap)), source: 'sector', peers: sectorEntry.peers, sector };
  }
  return { multiple: round4(Math.min(Math.max(calibration.global_median, model.multiple_floor), model.multiple_cap)), source: 'global', peers: 0, sector: null };
}

/** The four multipliers and the implied value one protocol gets under `model` and `calibration`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  calibration: Calibration,
  model: ModelConstants = MODEL,
): { implied: number; multiple: number; source: 'category' | 'sector' | 'global'; peers: number; sector: string | null; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, source, peers, sector } = categoryMultiple(protocol, calibration, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult = 1 + model.breadth_per_chain * Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_chains);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult * breadthMult));
  return { implied, multiple, source, peers, sector, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const calibration = buildCalibration(snapshot, model);
  const watchlist = new Set(snapshot.watchlist);
  const chosen = snapshot.protocols.filter(isRankable);
  const scored = chosen.map((p) => {
    const v = impliedValue(p, snapshot.as_of, calibration, model);
    return { p, v };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: watchlist.has(s.p.slug),
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    model: {
      category_multiple: round4(s.v.multiple),
      multiple_source: s.v.source,
      multiple_peers: s.v.peers,
      multiple_sector: s.v.sector,
      growth_pct: s.v.growthPct,
      growth_multiplier: round4(s.v.growthMult),
      maturity_multiplier: round4(s.v.maturityMult),
      breadth_multiplier: round4(s.v.breadthMult),
      age_days: s.v.age,
    },
    farm_steps: farmSteps(s.p, s.v.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** What one transaction costs on a chain, from the chain's own fee level. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c.includes('ethereum')) return 'about $8 of gas on Ethereum mainnet';
  if (c.includes('solana')) return 'about $0.05 of fees on Solana';
  if (c.includes('tron')) return 'about $1 of energy on Tron';
  if (c.includes('bnb') || c.includes('binance')) return 'about $0.30 of gas on BNB Chain';
  if (c.includes('polygon')) return 'about $0.10 of gas on Polygon';
  if (c.includes('avalanche')) return 'about $0.50 of gas on Avalanche';
  if (c.includes('base') || c.includes('arbitrum') || c.includes('optimism') || c.includes('blast') || c.includes('zksync') || c.includes('linea') || c.includes('scroll') || c.includes('mode') || c.includes('ink') || c.includes('unichain') || c.includes('abstract') || c.includes('world chain')) {
    return `about $0.50 of gas on ${chain}`;
  }
  return `about $2 of gas on ${chain}`;
}

/** One category's core action and its weekly action, in the words a farmer can follow. */
interface CategoryActions {
  match: (category: string) => boolean;
  core: (name: string, capital: number, chain: string) => string;
  weekly: (name: string, capital: number, chain: string) => string;
}

const ACTIONS: CategoryActions[] = [
  {
    match: (c) => c.includes('curator') || c.includes('allocator') || c.includes('manager'),
    core: (n, k, ch) => `Deposit $${k} into a ${n} vault on ${ch} and keep the shares.`,
    weekly: (n) => `Read ${n}'s vault allocation report once a week and top the position up once.`,
  },
  {
    match: (c) => c.includes('cdp') || c.includes('collateral') || c.includes('lend'),
    core: (n, k, ch) => `Supply $${k} of USDC to ${n} on ${ch} and keep the position open.`,
    weekly: (n) => `Make one borrow-and-repay cycle on ${n} each week and leave some supply in place.`,
  },
  {
    match: (c) => c.includes('dex') || c.includes('swap'),
    core: (n, k, ch) => `Provide $${k} of liquidity to ${n}'s main pool on ${ch} and keep the position open.`,
    weekly: (n) => `Swap a small amount through ${n}'s pool each week and keep the liquidity position.`,
  },
  {
    match: (c) => c.includes('yield') || c.includes('farm') || c.includes('leveraged'),
    core: (n, k, ch) => `Deposit $${k} into ${n}'s highest-TVL vault on ${ch} and keep the position open.`,
    weekly: (n) => `Harvest or compound the vault rewards on ${n} once a week.`,
  },
  {
    match: (c) => c.includes('rwa'),
    core: (n, k, ch) => `Mint $${k} of the protocol's yield asset through ${n} on ${ch} and hold it.`,
    weekly: (n) => `Check the underlying asset attestation ${n} publishes each week and keep holding.`,
  },
  {
    match: (c) => c.includes('stable'),
    core: (n, k, ch) => `Mint or deposit $${k} of the stable asset through ${n} on ${ch}.`,
    weekly: (n) => `Use the stable asset for one transfer or payment through ${n} each week.`,
  },
  {
    match: (c) => c.includes('staking') || c.includes('restak'),
    core: (n, k, ch) => `Stake $${k} of the chain's staking asset through ${n} on ${ch} and keep the receipt.`,
    weekly: (n) => `Claim or restake the staking rewards on ${n} once a week.`,
  },
  {
    match: (c) => c.includes('perpetual') || c.includes('derivative') || c.includes('basis'),
    core: (n, k, ch) => `Deposit $${k} of USDC as margin on ${n} and open one small hedge.`,
    weekly: (n) => `Open and close one small hedged trade on ${n} each week.`,
  },
  {
    match: (c) => c.includes('prediction'),
    core: (n, k) => `Fund $${k} and place one market position on ${n}.`,
    weekly: (n) => `Place one new market position on ${n} each week and settle the old ones.`,
  },
  {
    match: (c) => c.includes('insurance'),
    core: (n, k, ch) => `Buy $${k} of cover from ${n} on ${ch} and keep the policy.`,
    weekly: (n) => `Review the cover terms on ${n} once a week and keep the policy active.`,
  },
  {
    match: (c) => c.includes('payment') || c.includes('card'),
    core: (n, k, ch) => `Move $${k} through ${n} for one real payment on ${ch}.`,
    weekly: (n) => `Make one payment through ${n} each week.`,
  },
  {
    match: (c) => c.includes('governance'),
    core: (n, k, ch) => `Deposit $${k} into ${n}'s governance vault on ${ch} and vote once.`,
    weekly: (n) => `Vote on one proposal on ${n} each week.`,
  },
  {
    match: (c) => c === 'chain',
    core: (n, k, ch) => `Bridge $${k} of USDC to ${ch} through its official bridge and use it in one app on the chain.`,
    weekly: (n, _k, ch) => `Use one app on ${ch} each week so the chain sees repeat activity.`,
  },
  {
    match: (c) => c.includes('index'),
    core: (n, k, ch) => `Buy $${k} of ${n}'s index token on ${ch} and hold it.`,
    weekly: (n) => `Top up or rebalance the index position on ${n} once a week.`,
  },
  {
    match: (c) => c.includes('privacy'),
    core: (n, k, ch) => `Deposit $${k} into ${n}'s shielded pool on ${ch} and keep the receipt.`,
    weekly: (n) => `Make one shielded transfer through ${n} each week.`,
  },
  {
    match: (c) => c.includes('btc'),
    core: (n, k, ch) => `Deposit $${k} of BTC through ${n} on ${ch} and keep the position open.`,
    weekly: (n) => `Move a small BTC amount through ${n} once a week.`,
  },
  {
    match: (c) => c.includes('otc'),
    core: (n, k, ch) => `Use $${k} to complete one OTC trade through ${n} on ${ch}.`,
    weekly: (n) => `Check ${n}'s OTC desk once a week for a listed trade.`,
  },
  {
    match: (c) => c.includes('cedefi'),
    core: (n, k, ch) => `Deposit $${k} of USDC into ${n}'s CeDeFi vault on ${ch} and keep the shares.`,
    weekly: (n) => `Check the vault yield on ${n} once a week and top up once.`,
  },
];

function actionsFor(p: SnapshotProtocol): CategoryActions {
  const c = (p.category ?? '').toLowerCase();
  for (const a of ACTIONS) if (a.match(c)) return a;
  return {
    match: () => true,
    core: (n, k, ch) => `Deposit $${k} of USDC into ${n} on ${ch} and keep the position open.`,
    weekly: (n) => `Make one qualifying action on ${n} each week, such as a deposit, a swap or a vote.`,
  };
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names. The first step is always safety; the last is always the log.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasFor(chain);
  const action = actionsFor(p);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: `${gas} for the first transaction`,
      time: '5 minutes',
    },
    {
      text: action.core(p.name, capital, chain),
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: action.weekly(p.name, capital, chain),
      cost: gas,
      time: '10 minutes a week',
    },
    {
      text: `Check whether ${p.name} runs a points program or quests, and finish one listed task this week if it does.`,
      cost: 'no fee to check; one task costs about the same gas as a swap',
      time: '15 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl_ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    watchlist: row.watchlist,
    category_multiple: row.model.category_multiple,
    multiple_source: row.model.multiple_source,
    multiple_peers: row.model.multiple_peers,
    multiple_sector: row.model.multiple_sector,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const calibration = buildCalibration(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !r.watchlist).length;
  const comps: CompEntry[] = [...new Set(board.map((r) => r.category ?? 'Other'))]
    .sort()
    .map((category) => {
      const entry = calibration.by_category.get(category);
      if (entry !== undefined) return { category, peers: entry.peers, median: round4(entry.median), source: 'category' as const, sector: SECTOR_OF_CATEGORY.get(category) ?? null };
      const sector = SECTOR_OF_CATEGORY.get(category) ?? null;
      const sectorEntry = sector !== null ? calibration.by_sector.get(sector) : undefined;
      if (sectorEntry !== undefined) return { category, peers: sectorEntry.peers, median: round4(sectorEntry.median), source: 'sector' as const, sector };
      return { category, peers: 0, median: round4(calibration.global_median), source: 'global' as const, sector };
    });
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_implied_usd: board.reduce((sum, r) => sum + r.implied_value_usd, 0),
    global_median: round4(calibration.global_median),
    comps,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
