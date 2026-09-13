/**
 * Shared Keld API. One process, many browsers.
 * Run: node server.js
 * Friends: http://YOUR_LAN_IP:3847
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Logic = require("./logic.js");
const Social = require("./social.js");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data.json");
const PORT = Number(process.env.PORT || 3847);

function emptyState() {
  return {
    users: [],
    sessions: {},
    clans: [],
    parties: [],
    friends: [],
    messages: [],
  };
}

function load() {
  try {
    const state = JSON.parse(fs.readFileSync(DATA, "utf8"));
    if (!Array.isArray(state.friends)) state.friends = [];
    if (!Array.isArray(state.messages)) state.messages = [];
    if (!Array.isArray(state.clans)) state.clans = [];
    if (!Array.isArray(state.parties)) state.parties = [];
    const fake = { SeedLead: 1, Hawthorne: 1, Limsa: 1 };
    state.clans = state.clans.filter((c) => !fake[c.ownerName]);
    state.parties = state.parties.filter((p) => !fake[p.hostName]);
    return state;
  } catch (err) {
    const state = emptyState();
    save(state);
    return state;
  }
}

function save(state) {
  fs.writeFileSync(DATA, JSON.stringify(state));
}

function hashPass(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString("hex");
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    platform: user.platform,
    region: user.region,
    lang: user.lang,
    about: user.about || "",
    status: user.status || "",
    avatar: user.avatar || "",
    igns: user.igns || {},
    createdAt: user.createdAt,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1500000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  });
  res.end(body);
}

function authUser(req, state) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");
  const userId = state.sessions[token];
  if (!userId) return null;
  return state.users.find((u) => u.id === userId) || null;
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".md")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime(file) });
    res.end(buf);
  });
}

async function handleApi(req, res, state) {
  const url = new URL(req.url, "http://127.0.0.1");
  const p = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") {
    send(res, 204, {});
    return;
  }
  if (p === "/api/health" && method === "GET") {
    send(res, 200, { ok: true, users: state.users.length, mode: "platform" });
    return;
  }

  if (p === "/api/register" && method === "POST") {
    const body = await readBody(req);
    const check = Logic.validateProfile(body);
    if (!check.ok) {
      send(res, 400, { ok: false, errors: check.errors });
      return;
    }
    if (!body.password || String(body.password).length < 4) {
      send(res, 400, { ok: false, errors: ["Password must be at least 4 characters"] });
      return;
    }
    if (state.users.some((u) => u.name.toLowerCase() === check.profile.name.toLowerCase())) {
      send(res, 409, { ok: false, errors: ["That name is taken"] });
      return;
    }
    const salt = crypto.randomBytes(8).toString("hex");
    const user = {
      id: Logic.newId ? null : "u_" + Date.now().toString(36),
      name: check.profile.name,
      platform: check.profile.platform,
      region: check.profile.region,
      lang: check.profile.lang,
      about: "",
      status: "",
      avatar: "",
      igns: {},
      salt,
      pass: hashPass(body.password, salt),
      createdAt: Date.now(),
    };
    user.id = "u_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    state.users.push(user);
    const token = crypto.randomBytes(16).toString("hex");
    state.sessions[token] = user.id;
    save(state);
    send(res, 201, { ok: true, token, profile: publicUser(user) });
    return;
  }

  if (p === "/api/login" && method === "POST") {
    const body = await readBody(req);
    const user = state.users.find(
      (u) => u.name.toLowerCase() === String(body.name || "").trim().toLowerCase(),
    );
    if (!user || user.pass !== hashPass(body.password, user.salt)) {
      send(res, 401, { ok: false, errors: ["Wrong name or password"] });
      return;
    }
    const token = crypto.randomBytes(16).toString("hex");
    state.sessions[token] = user.id;
    save(state);
    send(res, 200, { ok: true, token, profile: publicUser(user) });
    return;
  }

  if (p === "/api/clans" && method === "GET") {
    send(res, 200, { ok: true, clans: state.clans });
    return;
  }
  if (p === "/api/parties" && method === "GET") {
    send(res, 200, { ok: true, parties: state.parties });
    return;
  }

  const user = authUser(req, state);
  if (!user) {
    send(res, 401, { ok: false, errors: ["Log in first"] });
    return;
  }

  if (p === "/api/me" && method === "GET") {
    send(res, 200, { ok: true, profile: publicUser(user) });
    return;
  }
  if (p === "/api/me" && method === "PATCH") {
    const body = await readBody(req);
    const check = Logic.validateProfile({
      name: user.name,
      platform: body.platform || user.platform,
      region: body.region || user.region,
      lang: body.lang || user.lang,
    });
    if (!check.ok) {
      send(res, 400, { ok: false, errors: check.errors });
      return;
    }
    user.platform = check.profile.platform;
    user.region = check.profile.region;
    user.lang = check.profile.lang;
    if (body.about !== undefined) user.about = String(body.about).slice(0, 200);
    if (body.status !== undefined) user.status = String(body.status).slice(0, 40);
    if (body.igns && typeof body.igns === "object") user.igns = body.igns;
    if (body.avatar !== undefined) {
      if (body.avatar && body.avatar.length > 1400000) {
        send(res, 400, { ok: false, errors: ["Avatar too large"] });
        return;
      }
      user.avatar = body.avatar || "";
    }
    save(state);
    send(res, 200, { ok: true, profile: publicUser(user) });
    return;
  }

  if (p === "/api/clans" && method === "POST") {
    const body = await readBody(req);
    const resv = Logic.validateClan({
      ...body,
      ownerName: user.name,
      membersList: [{ name: user.name, platform: user.platform, joinedAt: Date.now() }],
    });
    if (!resv.ok) {
      send(res, 400, { ok: false, errors: resv.errors });
      return;
    }
    state.clans.unshift(resv.clan);
    save(state);
    send(res, 201, { ok: true, clan: resv.clan });
    return;
  }

  const clanJoin = p.match(/^\/api\/clans\/([^/]+)\/join$/);
  if (clanJoin && method === "POST") {
    const clan = state.clans.find((c) => c.id === clanJoin[1]);
    if (!clan) {
      send(res, 404, { ok: false, errors: ["Missing listing"] });
      return;
    }
    const resv = Logic.applyJoin(clan, publicUser(user));
    if (!resv.ok) {
      send(res, 400, { ok: false, error: resv.error });
      return;
    }
    state.clans = state.clans.map((c) => (c.id === resv.clan.id ? resv.clan : c));
    save(state);
    send(res, 200, resv);
    return;
  }

  const clanDecide = p.match(/^\/api\/clans\/([^/]+)\/decide$/);
  if (clanDecide && method === "POST") {
    const clan = state.clans.find((c) => c.id === clanDecide[1]);
    if (!clan || clan.ownerName !== user.name) {
      send(res, 403, { ok: false, error: "Not your listing" });
      return;
    }
    const body = await readBody(req);
    const resv = Logic.decideApplication(clan, body.name, Boolean(body.accept));
    if (!resv.ok) {
      send(res, 400, { ok: false, error: resv.error });
      return;
    }
    state.clans = state.clans.map((c) => (c.id === resv.clan.id ? resv.clan : c));
    save(state);
    send(res, 200, resv);
    return;
  }

  const clanId = p.match(/^\/api\/clans\/([^/]+)$/);
  if (clanId && method === "PATCH") {
    const clan = state.clans.find((c) => c.id === clanId[1]);
    if (!clan || clan.ownerName !== user.name) {
      send(res, 403, { ok: false, error: "Not your listing" });
      return;
    }
    const body = await readBody(req);
    if (body.bump) {
      clan.bumped = Date.now();
      save(state);
      send(res, 200, { ok: true, clan });
      return;
    }
    if (body.kick) {
      const resv = Logic.kickClanMember(clan, body.kick);
      if (!resv.ok) {
        send(res, 400, { ok: false, error: resv.error });
        return;
      }
      state.clans = state.clans.map((c) => (c.id === resv.clan.id ? resv.clan : c));
      save(state);
      send(res, 200, resv);
      return;
    }
    const resv = Logic.updateClan(clan, body);
    if (!resv.ok) {
      send(res, 400, { ok: false, errors: resv.errors });
      return;
    }
    state.clans = state.clans.map((c) => (c.id === resv.clan.id ? resv.clan : c));
    save(state);
    send(res, 200, resv);
    return;
  }
  if (clanId && method === "DELETE") {
    const clan = state.clans.find((c) => c.id === clanId[1]);
    if (!clan || clan.ownerName !== user.name) {
      send(res, 403, { ok: false, error: "Not your listing" });
      return;
    }
    state.clans = state.clans.filter((c) => c.id !== clan.id);
    save(state);
    send(res, 200, { ok: true });
    return;
  }

  if (p === "/api/parties" && method === "POST") {
    const body = await readBody(req);
    const resv = Logic.validateParty({ ...body, hostName: user.name });
    if (!resv.ok) {
      send(res, 400, { ok: false, errors: resv.errors });
      return;
    }
    state.parties.unshift(resv.party);
    save(state);
    send(res, 201, { ok: true, party: resv.party });
    return;
  }

  const partyJoin = p.match(/^\/api\/parties\/([^/]+)\/join$/);
  if (partyJoin && method === "POST") {
    const party = state.parties.find((x) => x.id === partyJoin[1]);
    if (!party) {
      send(res, 404, { ok: false, error: "Missing party" });
      return;
    }
    const resv = Logic.joinParty(party, publicUser(user));
    if (!resv.ok) {
      send(res, 400, { ok: false, error: resv.error });
      return;
    }
    state.parties = state.parties.map((x) => (x.id === resv.party.id ? resv.party : x));
    save(state);
    send(res, 200, resv);
    return;
  }

  const partyId = p.match(/^\/api\/parties\/([^/]+)$/);
  if (partyId && method === "PATCH") {
    const party = state.parties.find((x) => x.id === partyId[1]);
    if (!party || party.hostName !== user.name) {
      send(res, 403, { ok: false, error: "Not your party" });
      return;
    }
    const body = await readBody(req);
    if (body.kick) {
      const resv = Logic.kickPartyMember(party, body.kick);
      if (!resv.ok) {
        send(res, 400, { ok: false, error: resv.error });
        return;
      }
      if (resv.dissolved) {
        state.parties = state.parties.filter((x) => x.id !== party.id);
      } else {
        state.parties = state.parties.map((x) => (x.id === resv.party.id ? resv.party : x));
      }
      save(state);
      send(res, 200, resv);
      return;
    }
    const resv = Logic.updateParty(party, body);
    if (!resv.ok) {
      send(res, 400, { ok: false, errors: resv.errors });
      return;
    }
    state.parties = state.parties.map((x) => (x.id === resv.party.id ? resv.party : x));
    save(state);
    send(res, 200, resv);
    return;
  }
  if (partyId && method === "DELETE") {
    const party = state.parties.find((x) => x.id === partyId[1]);
    if (!party) {
      send(res, 404, { ok: false, error: "Missing party" });
      return;
    }
    if (party.hostName !== user.name && !party.members.includes(user.name)) {
      send(res, 403, { ok: false, error: "Not in this party" });
      return;
    }
    if (party.hostName === user.name) {
      state.parties = state.parties.filter((x) => x.id !== party.id);
    } else {
      const resv = Logic.leaveParty(party, user.name);
      if (resv.dissolved) state.parties = state.parties.filter((x) => x.id !== party.id);
      else state.parties = state.parties.map((x) => (x.id === resv.party.id ? resv.party : x));
    }
    save(state);
    send(res, 200, { ok: true });
    return;
  }

  if (p === "/api/people" && method === "GET") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const rows = state.users
      .filter((u) => u.name.toLowerCase() !== user.name.toLowerCase())
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map((u) => ({
        name: u.name,
        status: u.status || "",
        platform: u.platform,
      }));
    send(res, 200, { ok: true, people: rows });
    return;
  }

  if (p === "/api/friends" && method === "GET") {
    send(res, 200, { ok: true, ...Social.friendList(state.friends, user.name) });
    return;
  }
  if (p === "/api/friends" && method === "POST") {
    const body = await readBody(req);
    const target = state.users.find(
      (u) => u.name.toLowerCase() === String(body.name || "").trim().toLowerCase(),
    );
    if (!target) {
      send(res, 404, { ok: false, error: "No account with that name" });
      return;
    }
    const resv = Social.requestFriend(state.friends, user.name, target.name);
    if (!resv.ok) {
      send(res, 400, { ok: false, error: resv.error });
      return;
    }
    state.friends = resv.friends;
    save(state);
    send(res, 200, { ok: true, mode: resv.mode, ...Social.friendList(state.friends, user.name) });
    return;
  }
  if (p === "/api/friends/decide" && method === "POST") {
    const body = await readBody(req);
    const resv = Social.decideFriend(state.friends, user.name, body.name, Boolean(body.accept));
    if (!resv.ok) {
      send(res, 400, { ok: false, error: resv.error });
      return;
    }
    state.friends = resv.friends;
    save(state);
    send(res, 200, { ok: true, mode: resv.mode, ...Social.friendList(state.friends, user.name) });
    return;
  }

  if (p === "/api/messages" && method === "GET") {
    const channel = url.searchParams.get("channel") || "";
    if (
      !Social.canAccessChannel({
        name: user.name,
        channel,
        friends: state.friends,
        clans: state.clans,
        parties: state.parties,
      })
    ) {
      send(res, 403, { ok: false, error: "Cannot open that chat" });
      return;
    }
    const rows = state.messages.filter((m) => m.channel === channel).slice(-80);
    send(res, 200, { ok: true, messages: rows });
    return;
  }
  if (p === "/api/messages" && method === "POST") {
    const body = await readBody(req);
    if (
      !Social.canAccessChannel({
        name: user.name,
        channel: body.channel,
        friends: state.friends,
        clans: state.clans,
        parties: state.parties,
      })
    ) {
      send(res, 403, { ok: false, error: "Cannot post there" });
      return;
    }
    const resv = Social.postMessage(state.messages, {
      channel: body.channel,
      from: user.name,
      text: body.text,
    });
    if (!resv.ok) {
      send(res, 400, { ok: false, error: resv.error });
      return;
    }
    state.messages = resv.messages;
    save(state);
    send(res, 200, { ok: true, message: resv.message });
    return;
  }

  send(res, 404, { ok: false, errors: ["Unknown route"] });
}

function main() {
  let state = load();
  const server = http.createServer(async (req, res) => {
    try {
      if ((req.url || "").startsWith("/api/")) {
        await handleApi(req, res, state);
        state = load();
        return;
      }
      serveStatic(req, res);
    } catch (err) {
      send(res, 500, { ok: false, errors: [err.message || "server error"] });
    }
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log("Keld on http://0.0.0.0:" + PORT);
  });
}

if (require.main === module) {
  main();
}

module.exports = { hashPass, publicUser, emptyState };
