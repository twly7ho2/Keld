/**
 * Per-game clan/guild nouns, caps, extra fields, and party sizes.
 * Party sizes are the game's own fireteam/stack, not copied across titles.
 */
const GAMES = [
  {
    id: "warframe",
    name: "Warframe",
    org: "Clan",
    cap: 1000,
    extra: [
      {
        key: "tier",
        label: "Clan tier",
        options: ["Ghost", "Shadow", "Storm", "Mountain", "Moon"],
      },
    ],
    tierCap: { Ghost: 10, Shadow: 30, Storm: 100, Mountain: 300, Moon: 1000 },
    reqLabel: "Min MR",
    reqMax: 40,
    parties: [
      { id: "squad", label: "Squad / mission", size: 4 },
      { id: "eidolon", label: "Eidolon hunt", size: 4 },
      { id: "railjack", label: "Railjack", size: 4 },
    ],
  },
  {
    id: "destiny2",
    name: "Destiny 2",
    org: "Clan",
    cap: 100,
    extra: [],
    reqLabel: "Power / note",
    reqMax: null,
    parties: [
      { id: "strike", label: "Strike / Nightfall / Dungeon", size: 3 },
      { id: "trials", label: "Trials / Comp", size: 3 },
      { id: "raid", label: "Raid", size: 6 },
      { id: "crucible6", label: "6v6 Crucible", size: 6 },
    ],
  },
  {
    id: "ffxiv",
    name: "Final Fantasy XIV",
    org: "Free Company",
    cap: 512,
    extra: [
      {
        key: "grand",
        label: "Grand Company",
        options: ["Maelstrom", "Twin Adder", "Immortal Flames", "Any"],
      },
    ],
    reqLabel: "Min level",
    reqMax: 100,
    parties: [
      { id: "light", label: "Light party", size: 4 },
      { id: "full", label: "Full party / savage", size: 8 },
      { id: "alliance", label: "Alliance raid", size: 24 },
    ],
  },
  {
    id: "wow",
    name: "World of Warcraft",
    org: "Guild",
    cap: 1000,
    extra: [
      {
        key: "version",
        label: "Version",
        options: ["Retail", "Classic", "Season of Discovery", "Hardcore"],
      },
    ],
    reqLabel: "Min item level",
    reqMax: null,
    parties: [
      { id: "dungeon", label: "Dungeon party", size: 5 },
      { id: "raid10", label: "Raid 10", size: 10 },
      { id: "raid20", label: "Raid 20 (Mythic)", size: 20 },
      { id: "raid25", label: "Raid 25", size: 25 },
    ],
  },
  {
    id: "eso",
    name: "Elder Scrolls Online",
    org: "Guild",
    cap: 500,
    extra: [],
    reqLabel: "CP / note",
    reqMax: null,
    parties: [
      { id: "group", label: "Group dungeon", size: 4 },
      { id: "trial", label: "Trial", size: 12 },
    ],
  },
  {
    id: "gw2",
    name: "Guild Wars 2",
    org: "Guild",
    cap: 500,
    extra: [],
    reqLabel: "KP / note",
    reqMax: null,
    parties: [
      { id: "party", label: "Party", size: 5 },
      { id: "raid", label: "Raid / strike squad", size: 10 },
      { id: "squad", label: "Commander squad", size: 50 },
    ],
  },
  {
    id: "newworld",
    name: "New World",
    org: "Company",
    cap: 100,
    extra: [
      {
        key: "faction",
        label: "Faction",
        options: ["Covenant", "Marauders", "Syndicate", "None"],
      },
    ],
    reqLabel: "Min level",
    reqMax: 65,
    parties: [
      { id: "catacombs", label: "Catacombs", size: 3 },
      { id: "expedition", label: "Expedition", size: 5 },
      { id: "raid10", label: "Raid 10", size: 10 },
      { id: "raid20", label: "Trial 20", size: 20 },
      { id: "war", label: "War roster", size: 50 },
    ],
  },
  {
    id: "lostark",
    name: "Lost Ark",
    org: "Guild",
    cap: 100,
    extra: [],
    reqLabel: "Item level",
    reqMax: null,
    parties: [
      { id: "guardian", label: "Guardian / chaos party", size: 4 },
      { id: "legion8", label: "Legion raid (2 parties)", size: 8 },
    ],
  },
  {
    id: "poe",
    name: "Path of Exile",
    org: "Guild",
    cap: 250,
    extra: [
      {
        key: "league",
        label: "League",
        options: ["Trade", "SSF", "Private"],
      },
    ],
    reqLabel: "Note",
    reqMax: null,
    parties: [{ id: "maps", label: "Party", size: 6 }],
  },
  {
    id: "division2",
    name: "The Division 2",
    org: "Clan",
    cap: 50,
    extra: [],
    reqLabel: "SHD level",
    reqMax: null,
    parties: [
      { id: "group", label: "Group", size: 4 },
      { id: "raid", label: "Raid", size: 8 },
    ],
  },
  {
    id: "clashofclans",
    name: "Clash of Clans",
    org: "Clan",
    cap: 50,
    extra: [
      {
        key: "th",
        label: "Min Town Hall",
        options: ["TH8", "TH10", "TH12", "TH14", "TH16", "Any"],
      },
    ],
    reqLabel: "Min trophies",
    reqMax: null,
    parties: [{ id: "war", label: "War callers (clan-wide)", size: 50 }],
  },
  {
    id: "clashroyale",
    name: "Clash Royale",
    org: "Clan",
    cap: 50,
    extra: [],
    reqLabel: "Trophies",
    reqMax: null,
    parties: [{ id: "2v2", label: "2v2", size: 2 }],
  },
  {
    id: "brawlstars",
    name: "Brawl Stars",
    org: "Club",
    cap: 30,
    extra: [],
    reqLabel: "Trophies",
    reqMax: null,
    parties: [
      { id: "duo", label: "Duo", size: 2 },
      { id: "trio", label: "3v3 / trio", size: 3 },
    ],
  },
  {
    id: "rocketleague",
    name: "Rocket League",
    org: "Club",
    cap: 50,
    extra: [],
    reqLabel: "Rank",
    reqMax: null,
    parties: [
      { id: "twos", label: "Doubles", size: 2 },
      { id: "threes", label: "Standard", size: 3 },
    ],
  },
  {
    id: "bdo",
    name: "Black Desert Online",
    org: "Guild",
    cap: 100,
    extra: [
      {
        key: "scale",
        label: "Scale",
        options: ["Small", "Medium", "Large", "Extra Large"],
      },
    ],
    reqLabel: "Contribution / note",
    reqMax: null,
    parties: [
      { id: "party", label: "Party", size: 5 },
      { id: "node", label: "Node war squad", size: 20 },
    ],
  },
  {
    id: "albion",
    name: "Albion Online",
    org: "Guild",
    cap: 1000,
    extra: [],
    reqLabel: "Spec / note",
    reqMax: null,
    parties: [
      { id: "group", label: "Group", size: 20 },
      { id: "zvz", label: "ZvZ call", size: 50 },
    ],
  },
  {
    id: "eve",
    name: "EVE Online",
    org: "Corporation",
    cap: 10000,
    extra: [
      {
        key: "nullsec",
        label: "Space",
        options: ["Highsec", "Lowsec", "Nullsec", "WH"],
      },
    ],
    reqLabel: "SP / note",
    reqMax: null,
    parties: [
      { id: "gang", label: "Small gang", size: 10 },
      { id: "fleet", label: "Fleet", size: 50 },
    ],
  },
  {
    id: "osrs",
    name: "Old School RuneScape",
    org: "Clan",
    cap: 500,
    extra: [],
    reqLabel: "Total level",
    reqMax: null,
    parties: [
      { id: "tob", label: "Theatre of Blood", size: 4 },
      { id: "cox5", label: "Chambers 5", size: 5 },
      { id: "cox8", label: "Chambers 8", size: 8 },
    ],
  },
  {
    id: "swtor",
    name: "Star Wars: The Old Republic",
    org: "Guild",
    cap: 500,
    extra: [
      {
        key: "faction",
        label: "Faction",
        options: ["Republic", "Empire", "Both"],
      },
    ],
    reqLabel: "Item rating",
    reqMax: null,
    parties: [
      { id: "fp", label: "Flashpoint", size: 4 },
      { id: "op8", label: "Operation 8", size: 8 },
      { id: "op16", label: "Operation 16", size: 16 },
    ],
  },
  {
    id: "dota2",
    name: "Dota 2",
    org: "Guild",
    cap: 1000,
    extra: [],
    reqLabel: "Rank / medal",
    reqMax: null,
    parties: [
      { id: "stack", label: "Party queue", size: 5 },
      { id: "duo", label: "Duo queue", size: 2 },
    ],
  },
  {
    id: "lol",
    name: "League of Legends",
    org: "Club",
    cap: 100,
    extra: [],
    reqLabel: "Rank",
    reqMax: null,
    parties: [
      { id: "flex", label: "Flex / Clash", size: 5 },
      { id: "duo", label: "Solo/Duo premade", size: 2 },
    ],
  },
  {
    id: "roblox",
    name: "Roblox",
    org: "Group",
    cap: 10000,
    extra: [],
    reqLabel: "Note",
    reqMax: null,
    parties: [
      { id: "squad4", label: "Squad 4", size: 4 },
      { id: "squad8", label: "Server group 8", size: 8 },
    ],
  },
  {
    id: "fortnite",
    name: "Fortnite",
    org: "Stack",
    cap: 16,
    extra: [],
    reqLabel: "Rank / note",
    reqMax: null,
    parties: [
      { id: "duo", label: "Duos", size: 2 },
      { id: "trio", label: "Trios", size: 3 },
      { id: "squad", label: "Squads", size: 4 },
    ],
  },
];

/**
 * Public search pages only. We do not scrape stats into the app.
 * {q} = encodeURIComponent(username or player tag).
 */
const LOOKUPS = {
  fortnite: {
    label: "Fortnite.gg",
    hint: "Epic display name",
    url: "https://fortnite.gg/stats?player={q}",
  },
  rocketleague: {
    label: "Tracker.gg",
    hint: "Epic / platform name",
    url: "https://tracker.gg/rocket-league/profile/epic/{q}/overview",
  },
  destiny2: {
    label: "DestinyTracker",
    hint: "Bungie name",
    url: "https://destinytracker.com/destiny-2/profile/search?name={q}",
  },
  lol: {
    label: "OP.GG",
    hint: "Riot ID — use Name-TAG",
    url: "https://www.op.gg/search?q={q}",
  },
  dota2: {
    label: "OpenDota",
    hint: "Steam name or ID",
    url: "https://www.opendota.com/search?q={q}",
  },
  poe: {
    label: "PoE profile",
    hint: "Account name",
    url: "https://www.pathofexile.com/account/view-profile/{q}",
  },
  osrs: {
    label: "OSRS Hiscores",
    hint: "Exact character name",
    url: "https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1={q}",
  },
  roblox: {
    label: "Roblox users",
    hint: "Username",
    url: "https://www.roblox.com/search/users?keyword={q}",
  },
  ffxiv: {
    label: "Lodestone",
    hint: "Character name",
    url: "https://na.finalfantasyxiv.com/lodestone/character/?q={q}",
  },
  wow: {
    label: "Raider.IO",
    hint: "Character name",
    url: "https://raider.io/search?type=character&name[value]={q}",
  },
  clashofclans: {
    label: "Clash profile",
    hint: "Player tag like #ABC123",
    url: "https://link.clashofclans.com/en?action=OpenPlayerProfile&tag={q}",
  },
  clashroyale: {
    label: "RoyaleAPI",
    hint: "Player tag",
    url: "https://royaleapi.com/player/{q}",
  },
  brawlstars: {
    label: "Brawlify",
    hint: "Player tag",
    url: "https://brawlify.com/stats/profile/{q}",
  },
  warframe: {
    label: "warframe.market",
    hint: "In-game name",
    url: "https://warframe.market/profile/{q}",
  },
  eve: {
    label: "EVE Who",
    hint: "Character name",
    url: "https://evewho.com/name/{q}",
  },
  albion: {
    label: "Albion killboard",
    hint: "Character name",
    url: "https://albiononline.com/killboard/search?q={q}",
  },
  gw2: {
    label: "GW2Armory search",
    hint: "Account or character",
    url: "https://wiki.guildwars2.com/wiki/Special:Search?search={q}",
  },
  lostark: {
    label: "Maxroll",
    hint: "Character name",
    url: "https://maxroll.gg/lost-ark/search?q={q}",
  },
};

function getGame(id) {
  return GAMES.find((g) => g.id === id) || null;
}

function partyMode(gameId, modeId) {
  const g = getGame(gameId);
  if (!g) return null;
  return g.parties.find((p) => p.id === modeId) || null;
}

function lookupSpec(gameId) {
  return LOOKUPS[gameId] || null;
}

function lookupUrl(gameId, rawName) {
  const spec = LOOKUPS[gameId];
  const name = String(rawName || "").trim();
  if (!spec || !name) return null;
  let q = name;
  if (gameId === "clashofclans" || gameId === "clashroyale" || gameId === "brawlstars") {
    q = name.replace(/^#/, "");
  }
  return spec.url.replace("{q}", encodeURIComponent(q));
}

function orgCap(game, extras) {
  if (game.id === "warframe" && extras && extras.tier && game.tierCap) {
    return game.tierCap[extras.tier] || game.cap;
  }
  return game.cap;
}

const gameStore = { GAMES, LOOKUPS, getGame, partyMode, orgCap, lookupSpec, lookupUrl };

if (typeof module !== "undefined" && module.exports) {
  module.exports = gameStore;
}
if (typeof window !== "undefined") {
  window.ClanGames = gameStore;
}
