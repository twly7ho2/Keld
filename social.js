/**
 * Friends + chat channels. Names are unique on the server.
 */
function cleanName(value) {
  return String(value || "").trim();
}

function dmChannel(nameA, nameB) {
  const a = cleanName(nameA).toLowerCase();
  const b = cleanName(nameB).toLowerCase();
  if (!a || !b || a === b) return "";
  return a < b ? "dm:" + a + ":" + b : "dm:" + b + ":" + a;
}

function parseChannel(channel) {
  const raw = String(channel || "");
  if (raw.startsWith("dm:")) {
    const parts = raw.slice(3).split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { type: "dm", a: parts[0], b: parts[1] };
  }
  if (raw.startsWith("clan:")) return { type: "clan", id: raw.slice(5) };
  if (raw.startsWith("party:")) return { type: "party", id: raw.slice(6) };
  return null;
}

function areFriends(friends, nameA, nameB) {
  const a = cleanName(nameA).toLowerCase();
  const b = cleanName(nameB).toLowerCase();
  return (friends || []).some(
    (f) =>
      f.state === "accepted" &&
      ((f.a === a && f.b === b) || (f.a === b && f.b === a)),
  );
}

function pendingBetween(friends, from, to) {
  const a = cleanName(from).toLowerCase();
  const b = cleanName(to).toLowerCase();
  return (friends || []).find(
    (f) =>
      f.state === "pending" &&
      ((f.from === a && ((f.a === a && f.b === b) || (f.a === b && f.b === a))) ||
        (f.a === a && f.b === b) ||
        (f.a === b && f.b === a)),
  );
}

function requestFriend(friends, from, to) {
  const src = cleanName(from);
  const dst = cleanName(to);
  if (!src || !dst) return { ok: false, error: "Need a name" };
  if (src.toLowerCase() === dst.toLowerCase()) {
    return { ok: false, error: "That is you" };
  }
  if (areFriends(friends, src, dst)) {
    return { ok: false, error: "Already friends" };
  }
  const existing = (friends || []).find((f) => {
    const pair =
      (f.a === src.toLowerCase() && f.b === dst.toLowerCase()) ||
      (f.a === dst.toLowerCase() && f.b === src.toLowerCase());
    return pair;
  });
  if (existing && existing.state === "pending") {
    if (existing.from !== src.toLowerCase()) {
      existing.state = "accepted";
      return { ok: true, friends, mode: "accepted" };
    }
    return { ok: false, error: "Request already sent" };
  }
  const next = (friends || []).concat([
    {
      a: src.toLowerCase() < dst.toLowerCase() ? src.toLowerCase() : dst.toLowerCase(),
      b: src.toLowerCase() < dst.toLowerCase() ? dst.toLowerCase() : src.toLowerCase(),
      from: src.toLowerCase(),
      state: "pending",
    },
  ]);
  return { ok: true, friends: next, mode: "pending" };
}

function decideFriend(friends, actor, other, accept) {
  const me = cleanName(actor).toLowerCase();
  const them = cleanName(other).toLowerCase();
  const row = (friends || []).find((f) => {
    const pair = (f.a === me && f.b === them) || (f.a === them && f.b === me);
    return pair && f.state === "pending";
  });
  if (!row) return { ok: false, error: "No request" };
  if (row.from === me) return { ok: false, error: "Wait for them" };
  if (!accept) {
    return {
      ok: true,
      friends: (friends || []).filter((f) => f !== row),
      mode: "denied",
    };
  }
  row.state = "accepted";
  return { ok: true, friends, mode: "accepted" };
}

function friendList(friends, name) {
  const me = cleanName(name).toLowerCase();
  const incoming = [];
  const outgoing = [];
  const accepted = [];
  (friends || []).forEach((f) => {
    if (f.a !== me && f.b !== me) return;
    const other = f.a === me ? f.b : f.a;
    if (f.state === "accepted") accepted.push(other);
    else if (f.from === me) outgoing.push(other);
    else incoming.push(other);
  });
  return { accepted, incoming, outgoing };
}

function canAccessChannel(ctx) {
  const parsed = parseChannel(ctx.channel);
  if (!parsed) return false;
  const me = cleanName(ctx.name).toLowerCase();
  if (parsed.type === "dm") {
    if (parsed.a !== me && parsed.b !== me) return false;
    return areFriends(ctx.friends, parsed.a, parsed.b);
  }
  if (parsed.type === "clan") {
    const clan = (ctx.clans || []).find((c) => c.id === parsed.id);
    if (!clan) return false;
    if (clan.ownerName && clan.ownerName.toLowerCase() === me) return true;
    return (clan.membersList || []).some((m) => String(m.name || "").toLowerCase() === me);
  }
  if (parsed.type === "party") {
    const party = (ctx.parties || []).find((p) => p.id === parsed.id);
    if (!party) return false;
    return (party.members || []).some((n) => String(n).toLowerCase() === me);
  }
  return false;
}

function postMessage(messages, input) {
  const text = cleanName(input.text);
  if (!text) return { ok: false, error: "Empty message" };
  if (text.length > 240) return { ok: false, error: "Message too long" };
  const row = {
    id: "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
    channel: input.channel,
    from: cleanName(input.from),
    text,
    at: Date.now(),
  };
  const next = (messages || []).concat([row]);
  const kept = next.length > 400 ? next.slice(-400) : next;
  return { ok: true, message: row, messages: kept };
}

const social = {
  dmChannel,
  parseChannel,
  areFriends,
  requestFriend,
  decideFriend,
  friendList,
  canAccessChannel,
  postMessage,
  pendingBetween,
};
if (typeof module !== "undefined" && module.exports) module.exports = social;
if (typeof window !== "undefined") window.KeldSocial = social;
