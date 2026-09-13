/**
 * Game finder: query → ranked games. Aliases avoid scrolling 22 titles.
 */
const ALIASES = {
  wf: "warframe",
  warframe: "warframe",
  d2: "destiny2",
  destiny: "destiny2",
  "destiny 2": "destiny2",
  ff14: "ffxiv",
  ffxiv: "ffxiv",
  "final fantasy": "ffxiv",
  wow: "wow",
  warcraft: "wow",
  eso: "eso",
  elderscrolls: "eso",
  gw2: "gw2",
  "guild wars": "gw2",
  nw: "newworld",
  aeternum: "newworld",
  loak: "lostark",
  "lost ark": "lostark",
  poe: "poe",
  exile: "poe",
  div2: "division2",
  division: "division2",
  coc: "clashofclans",
  clash: "clashofclans",
  cr: "clashroyale",
  royale: "clashroyale",
  brawl: "brawlstars",
  bs: "brawlstars",
  rl: "rocketleague",
  rocket: "rocketleague",
  bdo: "bdo",
  "black desert": "bdo",
  albion: "albion",
  eve: "eve",
  osrs: "osrs",
  runescape: "osrs",
  rs: "osrs",
  swtor: "swtor",
  "star wars": "swtor",
  dota: "dota2",
  lol: "lol",
  league: "lol",
  roblox: "roblox",
  fn: "fortnite",
  fortnite: "fortnite",
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchGames(games, query, opts) {
  const q = norm(query);
  const pinned = (opts && opts.pinned) || [];
  const recent = (opts && opts.recent) || [];
  if (!q) {
    const rest = games.filter((g) => !pinned.includes(g.id) && !recent.includes(g.id));
    const pick = (ids) =>
      ids.map((id) => games.find((g) => g.id === id)).filter(Boolean);
    return pick(pinned).concat(pick(recent), rest);
  }
  const aliasHit = ALIASES[q];
  return games
    .map((g) => {
      const name = norm(g.name);
      const org = norm(g.org);
      let score = 0;
      if (g.id === q || g.id === aliasHit) score = 100;
      else if (name === q) score = 90;
      else if (name.startsWith(q) || g.id.startsWith(q)) score = 80;
      else if (name.includes(q) || g.id.includes(q) || org.includes(q)) score = 60;
      else if (Object.keys(ALIASES).some((a) => a.includes(q) && ALIASES[a] === g.id)) {
        score = 70;
      }
      if (pinned.includes(g.id)) score += 8;
      if (recent.includes(g.id)) score += 4;
      return { game: g, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name))
    .map((r) => r.game);
}

const searchStore = { ALIASES, norm, searchGames };
if (typeof module !== "undefined" && module.exports) {
  module.exports = searchStore;
}
if (typeof window !== "undefined") {
  window.ClanSearch = searchStore;
}
