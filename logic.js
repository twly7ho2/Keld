/**
 * Clan + party logic. Game rules come from games.js only.
 */

const Games =
  typeof require !== "undefined" ? require("./games.js") : window.ClanGames;

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Switch", "Mobile"];
const REGIONS = ["Middle East", "EU", "NA", "Asia"];
const LANGS = ["English", "Arabic", "Mixed"];
const STATUSES = ["open", "apply", "closed"];

function now() {
  return Date.now();
}

function newId(prefix) {
  return (
    (prefix || "c") +
    "_" +
    now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

function trim(value) {
  return String(value || "").trim();
}

function validInvite(url) {
  const text = trim(url);
  let parsed;
  try {
    parsed = new URL(text);
  } catch (err) {
    return { ok: false, error: "Invite must be a full URL" };
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "discord.gg" && host !== "discord.com") {
    return { ok: false, error: "Invite must be discord.gg or discord.com" };
  }
  if (host === "discord.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] !== "invite" || !parts[1]) {
      return { ok: false, error: "Use https://discord.com/invite/<code>" };
    }
  }
  if (host === "discord.gg" && !parsed.pathname.replace(/\//g, "")) {
    return { ok: false, error: "Invite code missing" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Invite protocol not allowed" };
  }
  return { ok: true, url: parsed.href };
}

function validateProfile(input) {
  const name = trim(input.name);
  const platform = trim(input.platform);
  const region = trim(input.region);
  const lang = trim(input.lang);
  const errors = [];
  if (name.length < 2 || name.length > 24) {
    errors.push("Name must be 2–24 characters");
  }
  if (!PLATFORMS.includes(platform)) {
    errors.push("Pick a platform");
  }
  if (!REGIONS.includes(region)) {
    errors.push("Pick a region");
  }
  if (!LANGS.includes(lang)) {
    errors.push("Pick a language");
  }
  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: true, profile: { name, platform, region, lang } };
}

function extrasFromInput(game, input) {
  const extras = {};
  (game.extra || []).forEach((field) => {
    extras[field.key] = trim(input[field.key] || (input.extras || {})[field.key]);
  });
  return extras;
}

function validateClan(input) {
  const game = Games.getGame(input.gameId || "warframe");
  if (!game) {
    return { ok: false, errors: ["Unknown game"] };
  }
  const name = trim(input.name);
  const platform = trim(input.platform);
  const region = trim(input.region);
  const lang = trim(input.lang);
  const status = trim(input.status);
  const rank = trim(input.rank);
  const when = trim(input.when);
  const blurb = trim(input.blurb);
  const req = trim(input.req);
  const invite = validInvite(input.invite);
  const extras = extrasFromInput(game, input);
  const errors = [];

  if (name.length < 2 || name.length > 40) {
    errors.push(game.org + " name must be 2–40 characters");
  }
  if (!PLATFORMS.includes(platform)) {
    errors.push("Pick a platform");
  }
  if (!REGIONS.includes(region)) {
    errors.push("Pick a region");
  }
  if (!LANGS.includes(lang)) {
    errors.push("Pick a language");
  }
  if (!STATUSES.includes(status)) {
    errors.push("Pick recruiting status");
  }
  if (!invite.ok) {
    errors.push(invite.error);
  }
  if (blurb.length > 180) {
    errors.push("Pitch must be ≤ 180 characters");
  }
  (game.extra || []).forEach((field) => {
    if (field.options && extras[field.key] && !field.options.includes(extras[field.key])) {
      errors.push("Invalid " + field.label);
    }
    if (field.options && !extras[field.key]) {
      extras[field.key] = field.options[0];
    }
  });

  const cap = Games.orgCap(game, extras);
  let members = 1;
  const sizeRaw = trim(input.size);
  if (sizeRaw) {
    const n = Number(String(sizeRaw).split("/")[0].trim());
    if (!Number.isFinite(n) || n < 1) {
      errors.push("Member count must be a number ≥ 1");
    } else {
      members = Math.floor(n);
    }
  }
  if (members > cap) {
    errors.push(game.org + " cap for this setup is " + cap);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    clan: {
      id: input.id || newId("c"),
      gameId: game.id,
      name,
      platform,
      extras,
      req,
      region,
      lang,
      rank,
      when,
      blurb,
      status,
      invite: invite.url,
      members,
      cap,
      ownerName: trim(input.ownerName) || "",
      bumped: input.bumped || now(),
      createdAt: input.createdAt || now(),
      membersList: Array.isArray(input.membersList) ? input.membersList : [],
      applications: Array.isArray(input.applications) ? input.applications : [],
    },
  };
}

function uniqueMemberCount(clan) {
  const names = new Set();
  (clan.membersList || []).forEach((m) => names.add(m.name));
  if (clan.ownerName) {
    names.add(clan.ownerName);
  }
  return Math.max(names.size, 1);
}

function daysOld(ts, at) {
  const t = at || now();
  return Math.floor((t - ts) / 86400000);
}

function isStale(clan, at) {
  return daysOld(clan.bumped, at) > 14;
}

function scoreClan(clan, profile) {
  if (!profile) {
    return { score: 0, reasons: ["Save your profile first"], hardFail: true };
  }
  const reasons = [];
  let score = 0;
  let hardFail = false;

  if (clan.platform !== profile.platform && clan.platform !== "Mobile") {
    if (profile.platform !== clan.platform) {
      reasons.push("Wrong platform");
      hardFail = true;
    }
  } else {
    score += 40;
  }

  if (clan.status === "closed") {
    reasons.push("Not recruiting");
    hardFail = true;
  }
  if (clan.members >= clan.cap) {
    reasons.push(Games.getGame(clan.gameId).org + " is full");
    hardFail = true;
  }
  if (clan.region === profile.region) {
    score += 20;
    reasons.push("Same region");
  } else {
    reasons.push("Different region");
  }
  if (clan.lang === profile.lang || clan.lang === "Mixed" || profile.lang === "Mixed") {
    score += 20;
    reasons.push("Language ok");
  } else {
    score += 5;
    reasons.push("Language mismatch");
  }
  if (!isStale(clan)) {
    score += 20;
    reasons.push("Active listing");
  } else {
    reasons.push("Listing stale (>14d)");
  }
  if (hardFail) {
    score = Math.min(score, 15);
  }
  return { score, reasons, hardFail };
}

function canJoin(clan, profile) {
  if (!profile) {
    return { ok: false, error: "Save your profile on Join first" };
  }
  if (clan.ownerName && clan.ownerName === profile.name) {
    return { ok: false, error: "You already own this " + Games.getGame(clan.gameId).org.toLowerCase() };
  }
  if (clan.membersList && clan.membersList.some((m) => m.name === profile.name)) {
    return { ok: false, error: "Already a member" };
  }
  const pending = (clan.applications || []).find(
    (a) => a.name === profile.name && a.state === "pending",
  );
  if (pending) {
    return { ok: false, error: "Application already pending" };
  }
  const scored = scoreClan(clan, profile);
  if (scored.hardFail) {
    return { ok: false, error: scored.reasons[0] || "Not eligible" };
  }
  return { ok: true, scored };
}

function applyJoin(clan, profile) {
  const gate = canJoin(clan, profile);
  if (!gate.ok) {
    return gate;
  }
  const next = {
    ...clan,
    membersList: clan.membersList.slice(),
    applications: clan.applications.slice(),
  };
  if (clan.status === "open") {
    next.membersList.push({
      name: profile.name,
      platform: profile.platform,
      joinedAt: now(),
    });
    next.members = uniqueMemberCount(next);
    return { ok: true, mode: "joined", clan: next, invite: clan.invite };
  }
  if (clan.status === "apply") {
    next.applications.push({
      name: profile.name,
      platform: profile.platform,
      region: profile.region,
      lang: profile.lang,
      state: "pending",
      at: now(),
    });
    return { ok: true, mode: "applied", clan: next, invite: null };
  }
  return { ok: false, error: "Not recruiting" };
}

function decideApplication(clan, applicantName, accept) {
  const apps = clan.applications.map((a) => ({ ...a }));
  const hit = apps.find((a) => a.name === applicantName && a.state === "pending");
  if (!hit) {
    return { ok: false, error: "No pending application from that player" };
  }
  const next = {
    ...clan,
    applications: apps,
    membersList: clan.membersList.slice(),
  };
  if (accept) {
    if (uniqueMemberCount(next) >= next.cap) {
      return { ok: false, error: "Roster is full" };
    }
    hit.state = "accepted";
    next.membersList.push({
      name: hit.name,
      platform: hit.platform,
      joinedAt: now(),
    });
    next.members = uniqueMemberCount(next);
  } else {
    hit.state = "denied";
  }
  return { ok: true, clan: next };
}

function filterClans(clans, filters) {
  const f = filters || {};
  return clans.filter((c) => {
    if (f.gameId && c.gameId !== f.gameId) return false;
    if (f.platform && c.platform !== f.platform) return false;
    if (f.region && c.region !== f.region) return false;
    if (f.lang && c.lang !== f.lang) return false;
    if (f.status && c.status !== f.status) return false;
    return true;
  });
}

function sortForJoin(clans, profile) {
  return clans
    .map((clan) => ({ clan, fit: scoreClan(clan, profile) }))
    .sort((a, b) => {
      if (a.fit.hardFail !== b.fit.hardFail) {
        return a.fit.hardFail ? 1 : -1;
      }
      if (b.fit.score !== a.fit.score) {
        return b.fit.score - a.fit.score;
      }
      return b.clan.bumped - a.clan.bumped;
    });
}

function validateParty(input) {
  const game = Games.getGame(input.gameId);
  if (!game) {
    return { ok: false, errors: ["Unknown game"] };
  }
  const mode = Games.partyMode(input.gameId, input.modeId);
  if (!mode) {
    return { ok: false, errors: ["That party type does not exist in " + game.name] };
  }
  const title = trim(input.title);
  const platform = trim(input.platform);
  const region = trim(input.region);
  const lang = trim(input.lang);
  const blurb = trim(input.blurb);
  const invite = validInvite(input.invite);
  const errors = [];
  if (title.length < 2 || title.length > 60) {
    errors.push("Party title must be 2–60 characters");
  }
  if (!PLATFORMS.includes(platform)) {
    errors.push("Pick a platform");
  }
  if (!REGIONS.includes(region)) {
    errors.push("Pick a region");
  }
  if (!LANGS.includes(lang)) {
    errors.push("Pick a language");
  }
  if (!invite.ok) {
    errors.push(invite.error);
  }
  if (blurb.length > 140) {
    errors.push("Note too long");
  }
  if (errors.length) {
    return { ok: false, errors };
  }
  const hostName = trim(input.hostName);
  return {
    ok: true,
    party: {
      id: input.id || newId("p"),
      gameId: game.id,
      modeId: mode.id,
      modeLabel: mode.label,
      size: mode.size,
      title,
      platform,
      region,
      lang,
      blurb,
      invite: invite.url,
      hostName,
      members: hostName ? [hostName] : [],
      createdAt: input.createdAt || now(),
      starts: trim(input.starts) || "now",
    },
  };
}

function joinParty(party, profile) {
  if (!profile) {
    return { ok: false, error: "Save your profile first" };
  }
  if (party.platform !== profile.platform) {
    return { ok: false, error: "Wrong platform" };
  }
  if (party.members.includes(profile.name)) {
    return { ok: false, error: "Already in this party" };
  }
  if (party.members.length >= party.size) {
    return { ok: false, error: "Party full (" + party.size + " for " + party.modeLabel + ")" };
  }
  const next = { ...party, members: party.members.concat([profile.name]) };
  const full = next.members.length >= next.size;
  return {
    ok: true,
    party: next,
    invite: party.invite,
    full,
  };
}

function leaveParty(party, name) {
  if (!party.members.includes(name)) {
    return { ok: false, error: "Not in this party" };
  }
  const members = party.members.filter((m) => m !== name);
  if (!members.length) {
    return { ok: true, party: null, dissolved: true };
  }
  const hostName = party.hostName === name ? members[0] : party.hostName;
  return { ok: true, party: { ...party, members, hostName }, dissolved: false };
}

function filterParties(parties, filters) {
  const f = filters || {};
  return parties.filter((p) => {
    if (f.gameId && p.gameId !== f.gameId) return false;
    if (f.modeId && p.modeId !== f.modeId) return false;
    if (f.platform && p.platform !== f.platform) return false;
    if (f.region && p.region !== f.region) return false;
    if (f.openOnly && p.members.length >= p.size) return false;
    return true;
  });
}

function updateClan(clan, patch) {
  const next = {
    ...clan,
    extras: Object.assign({}, clan.extras || {}),
    membersList: (clan.membersList || []).slice(),
    applications: (clan.applications || []).slice(),
  };
  const errors = [];
  if (patch.invite !== undefined) {
    const inv = validInvite(patch.invite);
    if (!inv.ok) errors.push(inv.error);
    else next.invite = inv.url;
  }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(trim(patch.status))) {
      errors.push("Bad recruiting status");
    } else {
      next.status = trim(patch.status);
    }
  }
  ["blurb", "when", "rank", "req"].forEach((key) => {
    if (patch[key] !== undefined) {
      next[key] = trim(patch[key]);
    }
  });
  if (next.blurb && next.blurb.length > 180) {
    errors.push("Pitch must be ≤ 180 characters");
  }
  if (errors.length) {
    return { ok: false, errors };
  }
  next.bumped = now();
  return { ok: true, clan: next };
}

function kickClanMember(clan, name) {
  if (!name || name === clan.ownerName) {
    return { ok: false, error: "Cannot remove the owner" };
  }
  const membersList = (clan.membersList || []).filter((m) => m.name !== name);
  if (membersList.length === (clan.membersList || []).length) {
    return { ok: false, error: "That player is not on the roster" };
  }
  const next = { ...clan, membersList };
  next.members = uniqueMemberCount(next);
  return { ok: true, clan: next };
}

function updateParty(party, patch) {
  const next = { ...party, members: party.members.slice() };
  const errors = [];
  if (patch.invite !== undefined) {
    const inv = validInvite(patch.invite);
    if (!inv.ok) errors.push(inv.error);
    else next.invite = inv.url;
  }
  if (patch.title !== undefined) {
    const title = trim(patch.title);
    if (title.length < 2 || title.length > 60) {
      errors.push("Title must be 2–60 characters");
    } else {
      next.title = title;
    }
  }
  if (patch.blurb !== undefined) {
    const blurb = trim(patch.blurb);
    if (blurb.length > 140) errors.push("Note too long");
    else next.blurb = blurb;
  }
  if (patch.starts !== undefined) {
    next.starts = trim(patch.starts) || "now";
  }
  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: true, party: next };
}

function kickPartyMember(party, name) {
  if (!name) {
    return { ok: false, error: "No player" };
  }
  return leaveParty(party, name);
}

function seedClans() {
  return [];
}

function seedParties() {
  return [];
}

const store = {
  PLATFORMS,
  REGIONS,
  LANGS,
  STATUSES,
  validInvite,
  validateProfile,
  validateClan,
  daysOld,
  isStale,
  scoreClan,
  canJoin,
  applyJoin,
  decideApplication,
  filterClans,
  sortForJoin,
  validateParty,
  joinParty,
  leaveParty,
  filterParties,
  updateClan,
  kickClanMember,
  updateParty,
  kickPartyMember,
  seedClans,
  seedParties,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = store;
}
if (typeof window !== "undefined") {
  window.ClanLogic = store;
}
