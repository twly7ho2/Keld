/* global ClanLogic, ClanGames, ClanSearch */
(function () {
  const L = window.ClanLogic;
  const G = window.ClanGames;
  const S = window.ClanSearch;
  const PROFILE_KEY = "keld.v3.profile";
  const CLANS_KEY = "keld.v3.clans";
  const PARTIES_KEY = "keld.v3.parties";
  const PREF_KEY = "keld.v3.prefs";
  const $ = (id) => document.getElementById(id);

  function doLogin() {
    const name = ($("authName") && $("authName").value.trim()) || "";
    const password = ($("authPass") && $("authPass").value) || "";
    if (!window.ClanNet) {
      setMsg("authMsg", "Page scripts failed to load. Hard-refresh.", true);
      return;
    }
    if (!netOn()) {
      setMsg("authMsg", "This page is not talking to the server. Open the Render link, not the file.", true);
      return;
    }
    if (!name || !password) {
      setMsg("authMsg", "Type a name and password, then press Log in.", true);
      return;
    }
    setMsg("authMsg", "Logging in…", false);
    window.ClanNet.req("POST", "/api/login", { name: name, password: password })
      .then(function (data) {
        window.ClanNet.setToken(data.token);
        window.ClanNet.cache.profile = data.profile;
        setMsg("authMsg", "Logged in as " + data.profile.name + ".", false);
        paintAuth();
        if (typeof paint === "function") paint();
      })
      .catch(function (err) {
        setMsg("authMsg", "Login failed: " + err.message, true);
      });
  }

  function doRegister() {
    const name = ($("authName") && $("authName").value.trim()) || "";
    const password = ($("authPass") && $("authPass").value) || "";
    if (!window.ClanNet) {
      setMsg("authMsg", "Page scripts failed to load. Hard-refresh.", true);
      return;
    }
    if (!netOn()) {
      setMsg("authMsg", "This page is not talking to the server. Open the Render link, not the file.", true);
      return;
    }
    if (!name || password.length < 4) {
      setMsg("authMsg", "New account needs a name and a password of 4+ characters.", true);
      return;
    }
    setMsg("authMsg", "Creating account…", false);
    window.ClanNet.req("POST", "/api/register", {
      name: name,
      password: password,
      platform: ($("pPlatform") && $("pPlatform").value) || "PC",
      region: ($("pRegion") && $("pRegion").value) || "Middle East",
      lang: ($("pLang") && $("pLang").value) || "English",
    })
      .then(function (data) {
        window.ClanNet.setToken(data.token);
        window.ClanNet.cache.profile = data.profile;
        setMsg("authMsg", "Account created. Logged in as " + data.profile.name + ".", false);
        paintAuth();
        if (typeof paint === "function") paint();
      })
      .catch(function (err) {
        setMsg("authMsg", "Sign up failed: " + err.message, true);
      });
  }

  document.addEventListener("click", function (ev) {
    if (ev.target.closest("#authLogin")) {
      ev.preventDefault();
      doLogin();
    } else if (ev.target.closest("#authReg")) {
      ev.preventDefault();
      doRegister();
    } else if (ev.target.closest("#authOut")) {
      ev.preventDefault();
      if (window.ClanNet) {
        window.ClanNet.setToken("");
        window.ClanNet.cache.profile = null;
      }
      setMsg("authMsg", "Logged out.", false);
      paintAuth();
      if (typeof paint === "function") paint();
    }
  });

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function prefs() {
    return readJson(PREF_KEY, { pinned: [], recent: [] });
  }
  function savePrefs(p) {
    writeJson(PREF_KEY, p);
  }
  function touchRecent(gameId) {
    if (!gameId) return;
    const p = prefs();
    p.recent = [gameId].concat(p.recent.filter((id) => id !== gameId)).slice(0, 5);
    savePrefs(p);
  }
  function togglePin(gameId) {
    const p = prefs();
    p.pinned = p.pinned.includes(gameId)
      ? p.pinned.filter((id) => id !== gameId)
      : p.pinned.concat([gameId]);
    savePrefs(p);
    return p.pinned.includes(gameId);
  }
  function netOn() {
    return window.ClanNet && window.ClanNet.cache.online;
  }
  const SAMPLE_NAMES = { SeedLead: 1, Hawthorne: 1, Limsa: 1 };
  function dropSamples(rows) {
    return (rows || []).filter((row) => {
      const owner = row.ownerName || row.hostName || "";
      return !SAMPLE_NAMES[owner];
    });
  }
  function loadProfile() {
    if (netOn()) return window.ClanNet.cache.profile;
    return readJson(PROFILE_KEY, null);
  }
  function loadClans() {
    if (netOn()) return dropSamples(window.ClanNet.cache.clans || []);
    return dropSamples(readJson(CLANS_KEY, []) || []);
  }
  function loadParties() {
    if (netOn()) return dropSamples(window.ClanNet.cache.parties || []);
    return dropSamples(readJson(PARTIES_KEY, []) || []);
  }
  async function pullLists() {
    if (netOn()) await window.ClanNet.refreshLists();
  }
  function paintAuth() {
    const el = $("authState");
    const fields = $("authFields");
    const guest = $("authGuest");
    const inside = $("authIn");
    const outBtn = $("authOut");
    const loggedIn = netOn() && window.ClanNet.cache.profile;
    if (inside) inside.hidden = !loggedIn;
    if (outBtn) outBtn.hidden = !loggedIn;
    if (fields) fields.hidden = Boolean(loggedIn);
    if (guest) guest.hidden = Boolean(loggedIn);
    if (!el) return;
    if (loggedIn) {
      el.hidden = false;
      el.textContent = "You are logged in as " + window.ClanNet.cache.profile.name + ".";
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }
  async function persistProfile(profile) {
    if (netOn()) {
      const data = await window.ClanNet.req("PATCH", "/api/me", profile);
      window.ClanNet.cache.profile = data.profile;
      return data.profile;
    }
    writeJson(PROFILE_KEY, profile);
    return profile;
  }
  function replaceById(rows, next) {
    return rows.map((r) => (r.id === next.id ? next : r));
  }
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
  function setMsg(id, text, isError) {
    let el = $(id);
    if (!el && $("authBar") && id === "authMsg") {
      el = document.createElement("p");
      el.id = "authMsg";
      $("authBar").insertBefore(el, $("authBar").firstChild);
    }
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.className = "msg" + (isError ? " err" : " ok");
  }
  function fillSelect(el, items) {
    if (!el) return;
    el.innerHTML = items
      .map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
      .join("");
  }
  function fillFilter(el, items) {
    if (!el) return;
    el.innerHTML =
      '<option value="">Any</option>' +
      items.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  }
  function gameName(id) {
    const g = G.getGame(id);
    return g ? g.name : id;
  }
  function currentTab() {
    const h = (location.hash || "#join").replace("#", "");
    return ["create", "party", "desk", "profile", "friends", "chat"].includes(h) ? h : "join";
  }
  function showTab(name) {
    $("joinPane").hidden = name !== "join";
    $("createPane").hidden = name !== "create";
    $("partyPane").hidden = name !== "party";
    $("deskPane").hidden = name !== "desk";
    $("profilePane").hidden = name !== "profile";
    if ($("friendsPane")) $("friendsPane").hidden = name !== "friends";
    if ($("chatPane")) $("chatPane").hidden = name !== "chat";
    $("tabJoin").classList.toggle("on", name === "join");
    $("tabCreate").classList.toggle("on", name === "create");
    $("tabParty").classList.toggle("on", name === "party");
    $("tabDesk").classList.toggle("on", name === "desk");
    $("tabProfile").classList.toggle("on", name === "profile");
    if ($("tabFriends")) $("tabFriends").classList.toggle("on", name === "friends" || name === "chat");
    if (location.hash !== "#" + name) location.hash = name;
    paintCounts();
  }

  const pickers = {};

  function attachPicker(key, input, list, hidden, opts) {
    const allowEmpty = opts && opts.allowEmpty;
    const onChange = opts && opts.onChange;
    function renderList(q) {
      const p = prefs();
      const hits = S.searchGames(G.GAMES, q, p);
      if (!hits.length) {
        list.innerHTML = '<li class="dead">No game matches “' + escapeHtml(q) + '”</li>';
        list.hidden = false;
        return;
      }
      list.innerHTML = hits
        .map((g) => {
          const pin = p.pinned.includes(g.id) ? "★" : "☆";
          return `<li data-id="${escapeHtml(g.id)}">
            <span><b>${escapeHtml(g.name)}</b> <em>${escapeHtml(g.org)}</em></span>
            <button type="button" class="pin" data-pin="${escapeHtml(g.id)}" title="Pin">${pin}</button>
          </li>`;
        })
        .join("");
      list.hidden = false;
    }
    function setGame(id, silent) {
      hidden.value = id || "";
      const g = G.getGame(id);
      input.value = g ? g.name : "";
      list.hidden = true;
      if (id) touchRecent(id);
      paintChips();
      if (!silent && onChange) onChange(id || "");
    }
    input.addEventListener("focus", () => renderList(input.value));
    input.addEventListener("input", () => renderList(input.value));
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        list.hidden = true;
        if (allowEmpty && !hidden.value) input.value = "";
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        const first = list.querySelector("li[data-id]");
        if (first) setGame(first.getAttribute("data-id"));
      }
    });
    list.addEventListener("click", (ev) => {
      const pin = ev.target.closest("[data-pin]");
      if (pin) {
        ev.preventDefault();
        ev.stopPropagation();
        togglePin(pin.getAttribute("data-pin"));
        renderList(input.value);
        paintChips();
        return;
      }
      const row = ev.target.closest("li[data-id]");
      if (row) setGame(row.getAttribute("data-id"));
    });
    document.addEventListener("click", (ev) => {
      if (!input.parentElement.contains(ev.target)) list.hidden = true;
    });
    pickers[key] = { setGame, hidden, input, allowEmpty };
    return pickers[key];
  }

  function paintChips() {
    const p = prefs();
    const ids = p.pinned.concat(p.recent.filter((id) => !p.pinned.includes(id)));
    const html = ids
      .map((id) => {
        const g = G.getGame(id);
        if (!g) return "";
        const pinned = p.pinned.includes(id);
        return `<button type="button" class="chip${pinned ? " pin" : ""}" data-chip="${escapeHtml(id)}">${escapeHtml(g.name)}</button>`;
      })
      .join("");
    document.querySelectorAll("[data-chiptray]").forEach((el) => {
      el.innerHTML = html || '<span class="hint">Type a game or shortcut: d2, ff14, wf, coc</span>';
    });
  }

  function syncPartyModes(selectId, gameId, withAny) {
    const game = G.getGame(gameId);
    const el = $(selectId);
    if (!game) {
      el.innerHTML = withAny ? '<option value="">Any mode</option>' : "";
      return;
    }
    el.innerHTML =
      (withAny ? '<option value="">Any mode</option>' : "") +
      game.parties
        .map(
          (p) =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)} · ${p.size}</option>`,
        )
        .join("");
  }

  function syncCreateExtras() {
    const game = G.getGame($("cGame").value);
    const box = $("cExtras");
    if (!game || !game.extra.length) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = game.extra
      .map((field) => {
        const opts = field.options
          .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
          .join("");
        return `<div><label>${escapeHtml(field.label)}</label>
          <select id="ex_${escapeHtml(field.key)}">${opts}</select></div>`;
      })
      .join("");
  }

  function extraPayload() {
    const game = G.getGame($("cGame").value);
    const extras = {};
    (game.extra || []).forEach((field) => {
      const el = $("ex_" + field.key);
      extras[field.key] = el ? el.value : "";
    });
    return extras;
  }

  function slots(have, max) {
    let dots = "";
    for (let i = 0; i < max && i < 12; i += 1) {
      dots += `<i class="${i < have ? "on" : ""}"></i>`;
    }
    if (max > 12) dots += "<em>+" + (max - 12) + "</em>";
    return `<span class="slots">${dots}</span>`;
  }

  function bannerColor(name) {
    let h = 0;
    String(name || "x").split("").forEach((ch) => {
      h = (h * 33 + ch.charCodeAt(0)) % 360;
    });
    return "hsl(" + h + " 28% 28%)";
  }

  function paintProfile() {
    const p = loadProfile();
    const status = $("profileStatus");
    if (!p) {
      if (status) status.textContent = "not set";
      $("pDisplay").textContent = "Not set";
      $("pHandle").textContent = "Save a display name to join listings.";
      $("pAvatar").innerHTML = '?<i class="pdot"></i>';
      $("pBanner").style.background = "#2a3140";
      $("pBadges").innerHTML = "";
      $("pAboutView").textContent = "No about text.";
      $("pAboutView").className = "pempty";
      $("pGamesView").innerHTML = '<p class="pempty">None linked.</p>';
      $("pClansView").innerHTML = '<p class="pempty">None yet.</p>';
      $("pPartiesView").innerHTML = '<p class="pempty">None yet.</p>';
      if ($("pLevel")) $("pLevel").textContent = "0";
      if ($("pSince")) $("pSince").textContent = "";
      if ($("pGamesCount")) $("pGamesCount").textContent = "";
      if ($("pClansCount")) $("pClansCount").textContent = "";
      if ($("pPartiesCount")) $("pPartiesCount").textContent = "";
      const fold = $("editFold");
      if (fold) fold.open = true;
      return;
    }
    if (status) status.textContent = p.name;
    $("pName").value = p.name;
    $("pPlatform").value = p.platform;
    $("pRegion").value = p.region;
    $("pLang").value = p.lang;
    if ($("pStatus")) $("pStatus").value = p.status || "";
    if ($("pAbout")) $("pAbout").value = p.about || "";
    $("pDisplay").textContent = p.name;
    $("pHandle").textContent = (p.status || "Online") + " · " + p.platform;
    $("pBanner").style.background = bannerColor(p.name);
    $("pAvatar").innerHTML = p.avatar
      ? '<img alt="" src="' + p.avatar + '" /><i class="pdot"></i>'
      : escapeHtml(p.name.slice(0, 1).toUpperCase()) + '<i class="pdot"></i>';
    $("pBadges").innerHTML =
      "<span>" + escapeHtml(p.platform) + "</span>" +
      "<span>" + escapeHtml(p.region) + "</span>" +
      "<span>" + escapeHtml(p.lang) + "</span>" +
      '<span id="copyName">copy name</span>';
    $("pAboutView").textContent = p.about || "No about text.";
    $("pAboutView").className = p.about ? "" : "pempty";
    const igns = p.igns || {};
    const gameRows = Object.keys(igns);
    if ($("pGamesCount")) $("pGamesCount").textContent = gameRows.length ? String(gameRows.length) : "";
    $("pGamesView").innerHTML = gameRows.length
      ? gameRows
          .map(
            (id) =>
              '<div class="conn" data-game="' +
              escapeHtml(id) +
              '"><span>' +
              escapeHtml(gameName(id)) +
              "</span><span>" +
              escapeHtml(igns[id]) +
              ' <button type="button" data-unlink="' +
              escapeHtml(id) +
              '">remove</button></span></div>',
          )
          .join("")
      : '<p class="pempty">None linked.</p>';
    const mineClans = loadClans().filter(
      (c) =>
        c.ownerName === p.name ||
        (c.membersList || []).some((m) => m.name === p.name),
    );
    if ($("pClansCount")) $("pClansCount").textContent = mineClans.length ? String(mineClans.length) : "";
    $("pClansView").innerHTML = mineClans.length
      ? mineClans
          .map(
            (c) =>
              '<div class="conn"><span>' +
              escapeHtml(c.name) +
              "</span><span>" +
              escapeHtml(gameName(c.gameId)) +
              "</span></div>",
          )
          .join("")
      : '<p class="pempty">None yet.</p>';
    const mineParties = loadParties().filter((x) => x.members.includes(p.name));
    if ($("pPartiesCount")) $("pPartiesCount").textContent = mineParties.length ? String(mineParties.length) : "";
    $("pPartiesView").innerHTML = mineParties.length
      ? mineParties
          .map(
            (x) =>
              '<div class="conn"><span>' +
              escapeHtml(x.title) +
              "</span><span>" +
              escapeHtml(gameName(x.gameId)) +
              "</span></div>",
          )
          .join("")
      : '<p class="pempty">None yet.</p>';
    const gid = $("ignGame") && $("ignGame").value;
    if (gid && igns[gid]) $("ignName").value = igns[gid];
    else if ($("ignName")) $("ignName").value = "";
    if ($("pLevel")) {
      $("pLevel").textContent = String(Math.min(99, gameRows.length + mineClans.length + mineParties.length));
    }
    if ($("pSince")) {
      const when = p.createdAt ? new Date(p.createdAt) : null;
      $("pSince").textContent = when
        ? "On Keld since " +
          when.toLocaleDateString(undefined, { year: "numeric", month: "short" })
        : "";
    }
    const fold = $("editFold");
    if (fold && p.about) fold.open = false;
  }

  function paintCounts() {
    $("tabJoin").textContent = "Clans · " + loadClans().length;
    $("tabParty").textContent =
      "Parties · " + loadParties().filter((p) => p.members.length < p.size).length + " open";
    const profile = loadProfile();
    const pending = profile
      ? loadClans()
          .filter((c) => c.ownerName === profile.name)
          .reduce(
            (n, c) => n + (c.applications || []).filter((a) => a.state === "pending").length,
            0,
          )
      : 0;
    $("tabDesk").textContent = pending ? "Desk · " + pending + " apps" : "Desk";
    $("tabProfile").textContent = profile ? profile.name : "Profile";
  }

  function paintJoin() {
    const profile = loadProfile();
    const ranked = L.sortForJoin(
      L.filterClans(loadClans(), {
        gameId: $("fGame").value,
        platform: $("fPlatform").value,
        region: $("fRegion").value,
        lang: $("fLang").value,
        status: $("fStatus").value,
      }),
      profile,
    );
    const box = $("joinList");
    if (!ranked.length) {
      box.innerHTML =
        '<div class="empty">Nothing matches. Pin a game above or post one on Create.</div>';
      return;
    }
    box.innerHTML = ranked
      .map(({ clan, fit }) => {
        const game = G.getGame(clan.gameId);
        const extraBits = Object.values(clan.extras || {}).filter(Boolean).join(" · ");
        const gate = L.canJoin(clan, profile);
        let action = "<span class='hint'>Save profile first</span>";
        if (profile && !gate.ok) action = `<span class="stale">${escapeHtml(gate.error)}</span>`;
        else if (profile && clan.status === "open") {
          action = `<button class="btn" data-join="${escapeHtml(clan.id)}">Join</button>`;
        } else if (profile) {
          action = `<button class="btn" data-join="${escapeHtml(clan.id)}">Apply</button>`;
        }
        return `<article class="card">
          <div class="kicker">${escapeHtml(gameName(clan.gameId))} · ${escapeHtml(game.org)}</div>
          <div class="head"><h2>${escapeHtml(clan.name)}</h2>
            <span class="score">${fit.hardFail ? "—" : fit.score}</span></div>
          <p class="meta">${escapeHtml(clan.platform)} · cap ${escapeHtml(String(clan.cap))}
            ${extraBits ? " · " + escapeHtml(extraBits) : ""} · ${escapeHtml(clan.region)}</p>
          <div class="tags">
            <span class="${clan.status === "open" ? "open" : ""}">${escapeHtml(clan.status)}</span>
            <span>${escapeHtml(clan.lang)}</span>
            <span>${escapeHtml(String(clan.members))}/${escapeHtml(String(clan.cap))}</span>
          </div>
          <p>${escapeHtml(clan.blurb || "")}</p>
          <div class="row">${action}
            <button class="ghost" data-copy="${escapeHtml(clan.invite)}">Copy invite</button>
          </div>
        </article>`;
      })
      .join("");
  }

  function paintMine() {
    const profile = loadProfile();
    const box = $("mineList");
    if (!profile) {
      box.innerHTML = "<div class='empty'>Save a profile on Join first.</div>";
      return;
    }
    const mine = loadClans().filter((c) => c.ownerName === profile.name);
    if (!mine.length) {
      box.innerHTML = "<div class='empty'>No listings yet.</div>";
      return;
    }
    box.innerHTML = mine
      .map((clan) => {
        const pending = (clan.applications || []).filter((a) => a.state === "pending");
        const apps = pending.length
          ? pending
              .map(
                (a) => `<div class="row app">
              <span>${escapeHtml(a.name)} · ${escapeHtml(a.platform)}</span>
              <button class="btn" data-accept="${escapeHtml(clan.id)}" data-who="${escapeHtml(a.name)}">Accept</button>
              <button class="ghost" data-deny="${escapeHtml(clan.id)}" data-who="${escapeHtml(a.name)}">Deny</button>
            </div>`,
              )
              .join("")
          : "<p class='meta'>No pending applications.</p>";
        return `<article class="card">
          <h2>${escapeHtml(clan.name)}</h2>
          <p class="meta">${escapeHtml(gameName(clan.gameId))} · ${escapeHtml(clan.status)}</p>
          <button class="ghost" data-bump="${escapeHtml(clan.id)}">Bump</button>
          ${apps}
        </article>`;
      })
      .join("");
  }

  function paintParties() {
    const profile = loadProfile();
    const rows = L.filterParties(loadParties(), {
      gameId: $("yGame").value,
      modeId: $("yMode").value,
      platform: $("yPlatform").value,
      region: $("yRegion").value,
      openOnly: $("yOpen").checked,
    }).sort((a, b) => b.createdAt - a.createdAt);
    const box = $("partyList");
    if (!rows.length) {
      box.innerHTML = "<div class='empty'>No parties. Post one above.</div>";
      return;
    }
    box.innerHTML = rows
      .map((p) => {
        const left = p.size - p.members.length;
        const mine = profile && p.members.includes(profile.name);
        let action = "<span class='hint'>Save profile first</span>";
        if (profile && mine) {
          action = `<button class="ghost" data-pleave="${escapeHtml(p.id)}">Leave</button>`;
        } else if (profile && left <= 0) action = "<span class='stale'>Full</span>";
        else if (profile) {
          action = `<button class="btn" data-pjoin="${escapeHtml(p.id)}">Join · ${left} left</button>`;
        }
        return `<article class="card">
          <div class="kicker">${escapeHtml(gameName(p.gameId))} · ${escapeHtml(p.modeLabel)}</div>
          <div class="head"><h2>${escapeHtml(p.title)}</h2>${slots(p.members.length, p.size)}</div>
          <p class="meta">${escapeHtml(p.platform)} · ${escapeHtml(p.region)} · ${escapeHtml(p.starts || "now")}</p>
          <p>${escapeHtml(p.blurb || "")}</p>
          <p class="meta">${escapeHtml(p.members.join(" · "))}</p>
          <div class="row">${action}
            <button class="ghost" data-copy="${escapeHtml(p.invite)}">Copy invite</button>
          </div>
        </article>`;
      })
      .join("");
  }

  function paintDesk() {
    const profile = loadProfile();
    const clansBox = $("deskClans");
    const partiesBox = $("deskParties");
    if (!profile) {
      $("deskHint").textContent = "Save a player name on Clans first. Desk only shows what you own.";
      clansBox.innerHTML = "";
      partiesBox.innerHTML = "";
      return;
    }
    $("deskHint").textContent =
      "Editing as " + profile.name + ".";
    const mine = loadClans().filter((c) => c.ownerName === profile.name);
    if (!mine.length) {
      clansBox.innerHTML = "<div class='empty'>No clans under this name. Create one first.</div>";
    } else {
      clansBox.innerHTML = mine
        .map((clan) => {
          const apps = clan.applications || [];
          const pending = apps.filter((a) => a.state === "pending");
          const roster = (clan.membersList || [])
            .map((m) => {
              const kick =
                m.name === clan.ownerName
                  ? ""
                  : ` <button class="ghost" data-ckick="${escapeHtml(clan.id)}" data-who="${escapeHtml(m.name)}">Kick</button>`;
              return `<div class="row">${escapeHtml(m.name)} · ${escapeHtml(m.platform)}${kick}</div>`;
            })
            .join("");
          const appRows = apps.length
            ? apps
                .map((a) => {
                  const actions =
                    a.state === "pending"
                      ? `<button class="btn" data-accept="${escapeHtml(clan.id)}" data-who="${escapeHtml(a.name)}">Accept</button>
                         <button class="ghost" data-deny="${escapeHtml(clan.id)}" data-who="${escapeHtml(a.name)}">Deny</button>`
                      : "";
                  return `<div class="row"><span>${escapeHtml(a.name)} · ${escapeHtml(a.platform)} · ${escapeHtml(a.state)}</span>${actions}</div>`;
                })
                .join("")
            : "<p class='meta'>No applications yet.</p>";
          return `<article class="card">
            <div class="kicker">${escapeHtml(gameName(clan.gameId))} · ${pending.length} pending</div>
            <h2>${escapeHtml(clan.name)}</h2>
            <form data-cedit="${escapeHtml(clan.id)}">
              <div class="formgrid">
                <div><label>Invite</label><input name="invite" value="${escapeHtml(clan.invite)}" /></div>
                <div><label>Status</label>
                  <select name="status">
                    <option value="open"${clan.status === "open" ? " selected" : ""}>open</option>
                    <option value="apply"${clan.status === "apply" ? " selected" : ""}>apply</option>
                    <option value="closed"${clan.status === "closed" ? " selected" : ""}>closed</option>
                  </select>
                </div>
                <div><label>Hours</label><input name="when" value="${escapeHtml(clan.when || "")}" /></div>
                <div><label>Focus</label><input name="rank" value="${escapeHtml(clan.rank || "")}" /></div>
              </div>
              <div><label>Pitch</label><textarea name="blurb">${escapeHtml(clan.blurb || "")}</textarea></div>
              <div class="row" style="margin-top:8px">
                <button class="btn" type="submit">Save listing</button>
                <button class="ghost" type="button" data-bump="${escapeHtml(clan.id)}">Bump</button>
                <button class="ghost" type="button" data-cdel="${escapeHtml(clan.id)}">Delete listing</button>
              </div>
            </form>
            <h3>Applications</h3>${appRows}
            <h3>Roster</h3>${roster || "<p class='meta'>Empty roster.</p>"}
          </article>`;
        })
        .join("");
    }
    const hosted = loadParties().filter((p) => p.hostName === profile.name);
    if (!hosted.length) {
      partiesBox.innerHTML = "<div class='empty'>No hosted parties.</div>";
      return;
    }
    partiesBox.innerHTML = hosted
      .map((p) => {
        const members = p.members
          .map((m) => {
            const kick =
              m === p.hostName
                ? ""
                : ` <button class="ghost" data-pkick="${escapeHtml(p.id)}" data-who="${escapeHtml(m)}">Kick</button>`;
            return `<div class="row">${escapeHtml(m)}${kick}</div>`;
          })
          .join("");
        return `<article class="card">
          <div class="kicker">${escapeHtml(gameName(p.gameId))} · ${escapeHtml(p.modeLabel)} · ${p.members.length}/${p.size}</div>
          <form data-pedit="${escapeHtml(p.id)}">
            <div class="formgrid">
              <div><label>Title</label><input name="title" value="${escapeHtml(p.title)}" /></div>
              <div><label>Invite</label><input name="invite" value="${escapeHtml(p.invite)}" /></div>
              <div><label>Starts</label><input name="starts" value="${escapeHtml(p.starts || "")}" /></div>
            </div>
            <div><label>Note</label><textarea name="blurb">${escapeHtml(p.blurb || "")}</textarea></div>
            <div class="row" style="margin-top:8px">
              <button class="btn" type="submit">Save party</button>
              <button class="ghost" type="button" data-pdel="${escapeHtml(p.id)}">Close party</button>
            </div>
          </form>
          <h3>Members</h3>${members}
        </article>`;
      })
      .join("");
  }

  let chatChannel = "";
  let chatTimer = 0;

  function paintSidebar() {
    const profile = loadProfile();
    const name = profile && profile.name;
    if ($("whoBar")) $("whoBar").textContent = name || "";
    const clans = name
      ? loadClans().filter(
          (c) =>
            c.ownerName === name ||
            (c.membersList || []).some((m) => m.name === name),
        )
      : [];
    const parties = name ? loadParties().filter((p) => p.members.includes(name)) : [];
    if ($("sideClans")) {
      $("sideClans").innerHTML = clans.length
        ? clans
            .map(
              (c) =>
                '<button type="button" class="sidebtn' +
                (chatChannel === "clan:" + c.id ? " on" : "") +
                '" data-openchat="clan:' +
                escapeHtml(c.id) +
                '" data-label="' +
                escapeHtml(c.name) +
                '">' +
                escapeHtml(c.name) +
                "</button>",
            )
            .join("")
        : '<p class="hint">Join a clan to chat</p>';
    }
    if ($("sideParties")) {
      $("sideParties").innerHTML = parties.length
        ? parties
            .map(
              (p) =>
                '<button type="button" class="sidebtn' +
                (chatChannel === "party:" + p.id ? " on" : "") +
                '" data-openchat="party:' +
                escapeHtml(p.id) +
                '" data-label="' +
                escapeHtml(p.title) +
                '">' +
                escapeHtml(p.title) +
                "</button>",
            )
            .join("")
        : '<p class="hint">Join a party to chat</p>';
    }
  }

  function paintFriendsLists(data) {
    if (!$("friendOk")) return;
    const acc = data.accepted || [];
    const incoming = data.incoming || [];
    const outgoing = data.outgoing || [];
    const dmButtons = acc.length
      ? acc
          .map(function (n) {
            const ch =
              (window.KeldSocial &&
                loadProfile() &&
                window.KeldSocial.dmChannel(loadProfile().name, n)) ||
              "";
            return (
              '<button type="button" class="sidebtn' +
              (ch && ch === chatChannel ? " on" : "") +
              '" data-openchat="' +
              escapeHtml(ch) +
              '" data-label="' +
              escapeHtml(n) +
              '">' +
              escapeHtml(n) +
              "</button>"
            );
          })
          .join("")
      : '<p class="hint">No private chats yet</p>';
    $("friendOk").innerHTML = acc.length
      ? acc
          .map(
            (n) =>
              '<div class="conn"><span>' +
              escapeHtml(n) +
              '</span><button type="button" data-openchat="' +
              escapeHtml(
                (window.KeldSocial &&
                  loadProfile() &&
                  window.KeldSocial.dmChannel(loadProfile().name, n)) ||
                  "",
              ) +
              '" data-label="' +
              escapeHtml(n) +
              '">Open chat</button></div>',
          )
          .join("")
      : '<p class="pempty">No friends yet.</p>';
    if ($("friendDms")) $("friendDms").innerHTML = dmButtons;
    $("friendIn").innerHTML = incoming.length
      ? incoming
          .map(
            (n) =>
              '<div class="conn"><span>' +
              escapeHtml(n) +
              '</span><button type="button" data-fyes="' +
              escapeHtml(n) +
              '">Accept</button><button type="button" data-fno="' +
              escapeHtml(n) +
              '">Ignore</button></div>',
          )
          .join("")
      : '<p class="pempty">None.</p>';
    $("friendOut").innerHTML = outgoing.length
      ? outgoing.map((n) => "<p>" + escapeHtml(n) + " — waiting</p>").join("")
      : '<p class="pempty">None.</p>';
    if ($("dmList")) $("dmList").innerHTML = dmButtons;
  }

  function loadFriends() {
    if (!netOn() || !window.ClanNet.cache.profile) {
      paintFriendsLists({ accepted: [], incoming: [], outgoing: [] });
      return;
    }
    window.ClanNet.req("GET", "/api/friends")
      .then(paintFriendsLists)
      .catch(function () {
        paintFriendsLists({ accepted: [], incoming: [], outgoing: [] });
      });
  }

  function openChat(channel, label) {
    chatChannel = channel;
    if ($("chatTitle")) $("chatTitle").textContent = label || "Chat";
    showTab("chat");
    paintSidebar();
    loadFriends();
    pullChat();
    if (chatTimer) clearInterval(chatTimer);
    chatTimer = setInterval(pullChat, 2500);
  }

  function pullChat() {
    if (!chatChannel || !netOn()) return;
    window.ClanNet.req("GET", "/api/messages?channel=" + encodeURIComponent(chatChannel))
      .then(function (data) {
        const el = $("chatLog");
        if (!el) return;
        el.innerHTML = (data.messages || [])
          .map(function (m) {
            const when = new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              '<p class="chatrow"><b>' +
              escapeHtml(m.from) +
              "</b>" +
              escapeHtml(m.text) +
              "<em>" +
              when +
              "</em></p>"
            );
          })
          .join("") || '<p class="pempty">No messages yet.</p>';
        el.scrollTop = el.scrollHeight;
      })
      .catch(function (err) {
        setMsg("chatMsg", err.message, true);
      });
  }

  function paint() {
    paintProfile();
    paintChips();
    paintJoin();
    paintMine();
    paintParties();
    paintDesk();
    paintCounts();
    paintAuth();
    paintSidebar();
    loadFriends();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function bind() {
    fillSelect($("pPlatform"), L.PLATFORMS);
    fillSelect($("pRegion"), L.REGIONS);
    fillSelect($("pLang"), L.LANGS);
    if ($("ignGame")) {
      $("ignGame").innerHTML = G.GAMES.map(
        (g) => `<option value="${g.id}">${g.name}</option>`,
      ).join("");
      $("ignGame").addEventListener("change", () => {
        const p = loadProfile();
        const gid = $("ignGame").value;
        $("ignName").value = (p && p.igns && p.igns[gid]) || "";
      });
    }
    fillFilter($("fPlatform"), L.PLATFORMS);
    fillFilter($("fRegion"), L.REGIONS);
    fillFilter($("fLang"), L.LANGS);
    fillSelect($("cPlatform"), L.PLATFORMS);
    fillSelect($("cRegion"), L.REGIONS);
    fillSelect($("cLang"), L.LANGS);
    fillSelect($("xPlatform"), L.PLATFORMS);
    fillSelect($("xRegion"), L.REGIONS);
    fillSelect($("xLang"), L.LANGS);
    fillFilter($("yPlatform"), L.PLATFORMS);
    fillFilter($("yRegion"), L.REGIONS);

    attachPicker("filter", $("fGameInput"), $("fGameList"), $("fGame"), {
      allowEmpty: true,
      onChange: () => {
        paintJoin();
      },
    });
    attachPicker("create", $("cGameInput"), $("cGameList"), $("cGame"), {
      onChange: () => {
        syncCreateExtras();
      },
    });
    attachPicker("xgame", $("xGameInput"), $("xGameList"), $("xGame"), {
      onChange: (id) => syncPartyModes("xMode", id, false),
    });
    attachPicker("ygame", $("yGameInput"), $("yGameList"), $("yGame"), {
      allowEmpty: true,
      onChange: (id) => {
        syncPartyModes("yMode", id || G.GAMES[0].id, true);
        paintParties();
      },
    });

    const last = prefs().recent[0] || "warframe";
    pickers.create.setGame(last, true);
    pickers.xgame.setGame(last, true);
    syncCreateExtras();
    syncPartyModes("xMode", last, false);
    syncPartyModes("yMode", last, true);

    $("tabJoin").onclick = () => showTab("join");
    $("tabCreate").onclick = () => showTab("create");
    $("tabParty").onclick = () => showTab("party");
    $("tabDesk").onclick = () => showTab("desk");
    $("tabProfile").onclick = () => showTab("profile");
    if ($("tabFriends")) $("tabFriends").onclick = () => showTab("friends");
    if ($("sideFriends")) $("sideFriends").onclick = () => showTab("friends");
    if ($("jumpProfile")) $("jumpProfile").onclick = () => showTab("profile");
    document.body.addEventListener("click", (ev) => {
      const open = ev.target.closest("[data-openchat]");
      if (open && open.getAttribute("data-openchat")) {
        openChat(open.getAttribute("data-openchat"), open.getAttribute("data-label"));
      }
    });
    if ($("friendAdd")) {
      $("friendAdd").onclick = function () {
        if (!netOn()) {
          setMsg("friendsMsg", "Log in on the hosted site to add friends.", true);
          return;
        }
        window.ClanNet.req("POST", "/api/friends", { name: $("friendName").value })
          .then(function (data) {
            setMsg("friendsMsg", data.mode === "accepted" ? "You are friends." : "Request sent.", false);
            paintFriendsLists(data);
            paintSidebar();
          })
          .catch(function (err) {
            setMsg("friendsMsg", err.message, true);
          });
      };
    }
    if ($("friendsPane")) {
      $("friendsPane").addEventListener("click", (ev) => {
        const yes = ev.target.closest("[data-fyes]");
        const no = ev.target.closest("[data-fno]");
        if (!yes && !no) return;
        window.ClanNet.req("POST", "/api/friends/decide", {
          name: (yes || no).getAttribute(yes ? "data-fyes" : "data-fno"),
          accept: Boolean(yes),
        })
          .then(function (data) {
            paintFriendsLists(data);
            paintSidebar();
          })
          .catch(function (err) {
            setMsg("friendsMsg", err.message, true);
          });
      });
    }
    if ($("chatForm")) {
      $("chatForm").addEventListener("submit", (ev) => {
        ev.preventDefault();
        if (!chatChannel) return;
        window.ClanNet.req("POST", "/api/messages", {
          channel: chatChannel,
          text: $("chatText").value,
        })
          .then(function () {
            $("chatText").value = "";
            pullChat();
          })
          .catch(function (err) {
            setMsg("chatMsg", err.message, true);
          });
      });
    }
    if ($("authLogin")) {
      $("authLogin").onclick = function () {
        if (!netOn()) {
          setMsg("authMsg", "Not on the live site. Open the Render URL.", true);
          return;
        }
        if (!$("authName").value.trim() || !$("authPass").value) {
          setMsg("authMsg", "Type your name and password, then press Log in.", true);
          return;
        }
        window.ClanNet.req("POST", "/api/login", {
          name: $("authName").value,
          password: $("authPass").value,
        })
          .then(function (data) {
            window.ClanNet.setToken(data.token);
            window.ClanNet.cache.profile = data.profile;
            setMsg("authMsg", "Logged in as " + data.profile.name + ".", false);
            paint();
          })
          .catch(function (err) {
            setMsg("authMsg", "Login failed: " + err.message, true);
          });
      };
      $("authReg").onclick = function () {
        if (!netOn()) {
          setMsg("authMsg", "Not on the live site. Open the Render URL.", true);
          return;
        }
        if (!$("authName").value.trim() || $("authPass").value.length < 4) {
          setMsg("authMsg", "New account: pick a name and a password of 4+ characters.", true);
          return;
        }
        window.ClanNet.req("POST", "/api/register", {
          name: $("authName").value,
          password: $("authPass").value,
          platform: $("pPlatform").value || "PC",
          region: $("pRegion").value || "Middle East",
          lang: $("pLang").value || "English",
        })
          .then(function (data) {
            window.ClanNet.setToken(data.token);
            window.ClanNet.cache.profile = data.profile;
            setMsg("authMsg", "Account created. You are logged in as " + data.profile.name + ".", false);
            paint();
            showTab("profile");
          })
          .catch(function (err) {
            setMsg("authMsg", "Sign up failed: " + err.message, true);
          });
      };
      $("authOut").onclick = function () {
        window.ClanNet.setToken("");
        window.ClanNet.cache.profile = null;
        setMsg("authMsg", "Logged out.", false);
        paint();
      };
    }
    window.addEventListener("hashchange", () => showTab(currentTab()));

    document.addEventListener("click", (ev) => {
      const chip = ev.target.closest("[data-chip]");
      if (!chip) return;
      const id = chip.getAttribute("data-chip");
      const tab = currentTab();
      if (tab === "join") pickers.filter.setGame(id);
      else if (tab === "create") pickers.create.setGame(id);
      else pickers.ygame.setGame(id);
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "/" && ev.target.tagName !== "INPUT" && ev.target.tagName !== "TEXTAREA") {
        ev.preventDefault();
        const tab = currentTab();
        const target =
          tab === "create" ? $("cGameInput") : tab === "party" ? $("yGameInput") : $("fGameInput");
        target.focus();
      }
    });

    $("profileForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const res = L.validateProfile({
        name: $("pName").value,
        platform: $("pPlatform").value,
        region: $("pRegion").value,
        lang: $("pLang").value,
      });
      if (!res.ok) {
        setMsg("profileMsg", res.errors.join(". "), true);
        return;
      }
      const existing = loadProfile() || {};
      const igns = Object.assign({}, existing.igns || {});
      const gid = $("ignGame") && $("ignGame").value;
      const ign = $("ignName") ? $("ignName").value.trim() : "";
      if (gid && ign) igns[gid] = ign;
      if (gid && !ign) delete igns[gid];
      res.profile.igns = igns;
      res.profile.about = ($("pAbout") && $("pAbout").value.trim()) || "";
      res.profile.status = ($("pStatus") && $("pStatus").value.trim()) || "";
      res.profile.avatar = existing.avatar || "";
      res.profile.createdAt = existing.createdAt || Date.now();
      persistProfile(res.profile).then(function () { setMsg("profileMsg", "Saved.", false); paint(); }).catch(function (err) { setMsg("profileMsg", err.message, true); });
    });

    if ($("pAvatarFile")) {
      $("pAvatarFile").addEventListener("change", () => {
        const file = $("pAvatarFile").files && $("pAvatarFile").files[0];
        if (!file) return;
        if (file.size > 1048576) {
          setMsg("profileMsg", "Avatar must be under 1 MB.", true);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const existing = loadProfile();
          if (!existing) {
            setMsg("profileMsg", "Save a name first, then add the picture.", true);
            return;
          }
          existing.avatar = reader.result;
          persistProfile(existing).then(paintProfile).catch(function (err) { setMsg("profileMsg", err.message, true); });
        };
        reader.readAsDataURL(file);
      });
    }
    $("pBadges").addEventListener("click", (ev) => {
      if (ev.target.id !== "copyName") return;
      const p = loadProfile();
      if (!p) return;
      copyText(p.name);
      ev.target.textContent = "copied";
      setTimeout(() => {
        ev.target.textContent = "copy name";
      }, 1000);
    });
    $("pGamesView").addEventListener("click", (ev) => {
      const drop = ev.target.closest("[data-unlink]");
      if (drop) {
        ev.preventDefault();
        const existing = loadProfile();
        if (!existing || !existing.igns) return;
        delete existing.igns[drop.getAttribute("data-unlink")];
        persistProfile(existing).then(paintProfile).catch(function (err) { setMsg("profileMsg", err.message, true); });
        return;
      }
      const row = ev.target.closest("[data-game]");
      if (!row || !$("ignGame")) return;
      $("ignGame").value = row.getAttribute("data-game");
      const p = loadProfile();
      $("ignName").value = (p && p.igns && p.igns[$("ignGame").value]) || "";
      const fold = $("editFold");
      if (fold) fold.open = true;
    });
    if ($("clearAvatar")) {
      $("clearAvatar").onclick = () => {
        const existing = loadProfile();
        if (!existing) return;
        existing.avatar = "";
        persistProfile(existing).then(paintProfile).catch(function (err) { setMsg("profileMsg", err.message, true); });
      };
    }

    $("createForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const profile = loadProfile();
      if (!profile) {
        setMsg("createMsg", "Save a profile on Join first.", true);
        return;
      }
      const extras = extraPayload();
      const res = L.validateClan({
        gameId: $("cGame").value,
        name: $("cName").value,
        platform: $("cPlatform").value,
        region: $("cRegion").value,
        lang: $("cLang").value,
        rank: $("cRank").value,
        when: $("cWhen").value,
        blurb: $("cBlurb").value,
        status: $("cStatus").value,
        invite: $("cInvite").value,
        req: $("cReq").value,
        size: "1",
        ownerName: profile.name,
        extras,
        ...extras,
        membersList: [
          { name: profile.name, platform: profile.platform, joinedAt: Date.now() },
        ],
      });
      if (!res.ok) {
        setMsg("createMsg", res.errors.join(". "), true);
        return;
      }
      if (netOn()) {
        window.ClanNet.req("POST", "/api/clans", {
          gameId: $("cGame").value,
          name: $("cName").value,
          platform: $("cPlatform").value,
          region: $("cRegion").value,
          lang: $("cLang").value,
          rank: $("cRank").value,
          when: $("cWhen").value,
          blurb: $("cBlurb").value,
          status: $("cStatus").value,
          invite: $("cInvite").value,
          req: $("cReq").value,
          extras,
        })
          .then(function () {
            return pullLists();
          })
          .then(function () {
            setMsg("createMsg", res.clan.name + " is live.", false);
            paint();
            showTab("join");
          })
          .catch(function (err) {
            setMsg("createMsg", err.message, true);
          });
        return;
      }
      writeJson(CLANS_KEY, [res.clan].concat(loadClans()));
      setMsg("createMsg", res.clan.name + " is live.", false);
      paint();
      showTab("join");
    });

    $("partyForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const profile = loadProfile();
      if (!profile) {
        setMsg("partyMsg", "Save a profile on Join first.", true);
        return;
      }
      const res = L.validateParty({
        gameId: $("xGame").value,
        modeId: $("xMode").value,
        title: $("xTitle").value,
        platform: $("xPlatform").value,
        region: $("xRegion").value,
        lang: $("xLang").value,
        blurb: $("xBlurb").value,
        invite: $("xInvite").value,
        starts: $("xStarts").value,
        hostName: profile.name,
      });
      if (!res.ok) {
        setMsg("partyMsg", res.errors.join(". "), true);
        return;
      }
      if (netOn()) {
        window.ClanNet.req("POST", "/api/parties", {
          gameId: $("xGame").value,
          modeId: $("xMode").value,
          title: $("xTitle").value,
          platform: $("xPlatform").value,
          region: $("xRegion").value,
          lang: $("xLang").value,
          blurb: $("xBlurb").value,
          invite: $("xInvite").value,
          starts: $("xStarts").value,
        })
          .then(function () {
            return pullLists();
          })
          .then(function () {
            setMsg("partyMsg", "Posted · " + res.party.size + " slots.", false);
            paint();
          })
          .catch(function (err) {
            setMsg("partyMsg", err.message, true);
          });
        return;
      }
      writeJson(PARTIES_KEY, [res.party].concat(loadParties()));
      setMsg("partyMsg", "Posted · " + res.party.size + " slots.", false);
      paintParties();
      paintCounts();
    });

    ["fPlatform", "fRegion", "fLang", "fStatus"].forEach((id) => {
      $(id).addEventListener("change", paintJoin);
    });
    ["yMode", "yPlatform", "yRegion", "yOpen"].forEach((id) => {
      $(id).addEventListener("change", paintParties);
    });

    document.body.addEventListener("click", (ev) => {
      const copy = ev.target.closest("[data-copy]");
      if (copy) {
        copyText(copy.getAttribute("data-copy"));
        copy.textContent = "Copied";
        setTimeout(() => {
          copy.textContent = "Copy invite";
        }, 1200);
      }
    });

    $("joinList").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-join]");
      if (!btn) return;
      const rows = loadClans();
      const clan = rows.find((c) => c.id === btn.getAttribute("data-join"));
      if (netOn()) {
        window.ClanNet.req("POST", "/api/clans/" + clan.id + "/join")
          .then(function (res) {
            if (res.mode === "joined" && res.invite) window.open(res.invite, "_blank", "noopener");
            setMsg("joinMsg", res.mode === "joined" ? "Joined." : "Application sent.", false);
            return pullLists();
          })
          .then(paint)
          .catch(function (err) {
            setMsg("joinMsg", err.message, true);
          });
        return;
      }
      const res = L.applyJoin(clan, loadProfile());
      if (!res.ok) {
        setMsg("joinMsg", res.error, true);
        paint();
        return;
      }
      writeJson(CLANS_KEY, replaceById(rows, res.clan));
      if (res.mode === "joined") window.open(res.invite, "_blank", "noopener");
      setMsg("joinMsg", res.mode === "joined" ? "Joined." : "Application sent.", false);
      paint();
    });

    $("mineList").addEventListener("click", (ev) => {
      const acc = ev.target.closest("[data-accept]");
      const den = ev.target.closest("[data-deny]");
      const bump = ev.target.closest("[data-bump]");
      const rows = loadClans();
      if (acc || den) {
        const el = acc || den;
        const clan = rows.find(
          (c) => c.id === el.getAttribute(acc ? "data-accept" : "data-deny"),
        );
        const res = L.decideApplication(clan, el.getAttribute("data-who"), Boolean(acc));
        if (!res.ok) {
          setMsg("createMsg", res.error, true);
          return;
        }
        writeJson(CLANS_KEY, replaceById(rows, res.clan));
        paint();
      }
      if (bump) {
        const clan = rows.find((c) => c.id === bump.getAttribute("data-bump"));
        clan.bumped = Date.now();
        writeJson(CLANS_KEY, replaceById(rows, clan));
        paint();
      }
    });

    $("partyList").addEventListener("click", (ev) => {
      const join = ev.target.closest("[data-pjoin]");
      const leave = ev.target.closest("[data-pleave]");
      const rows = loadParties();
      if (join) {
        const party = rows.find((p) => p.id === join.getAttribute("data-pjoin"));
        if (netOn()) {
          window.ClanNet.req("POST", "/api/parties/" + party.id + "/join")
            .then(function (res) {
              if (res.invite) window.open(res.invite, "_blank", "noopener");
              setMsg("partyMsg", res.full ? "Full. Invite opened." : "You're in.", false);
              return pullLists();
            })
            .then(paint)
            .catch(function (err) {
              setMsg("partyMsg", err.message, true);
            });
          return;
        }
        const res = L.joinParty(party, loadProfile());
        if (!res.ok) {
          setMsg("partyMsg", res.error, true);
          paintParties();
          return;
        }
        writeJson(PARTIES_KEY, replaceById(rows, res.party));
        window.open(res.invite, "_blank", "noopener");
        setMsg("partyMsg", res.full ? "Full. Invite opened." : "You're in.", false);
        paintParties();
        paintCounts();
      }
      if (leave) {
        const profile = loadProfile();
        const party = rows.find((p) => p.id === leave.getAttribute("data-pleave"));
        if (netOn()) {
          window.ClanNet.req("DELETE", "/api/parties/" + party.id)
            .then(pullLists)
            .then(paint)
            .catch(function (err) {
              setMsg("partyMsg", err.message, true);
            });
          return;
        }
        const res = L.leaveParty(party, profile.name);
        if (!res.ok) {
          setMsg("partyMsg", res.error, true);
          return;
        }
        const next = res.dissolved
          ? rows.filter((p) => p.id !== party.id)
          : replaceById(rows, res.party);
        writeJson(PARTIES_KEY, next);
        paintParties();
        paintCounts();
      }
    });

    $("deskClans").addEventListener("submit", (ev) => {
      const form = ev.target.closest("[data-cedit]");
      if (!form) return;
      ev.preventDefault();
      const rows = loadClans();
      const clan = rows.find((c) => c.id === form.getAttribute("data-cedit"));
      const patch = {
        invite: form.invite.value,
        status: form.status.value,
        when: form.when.value,
        rank: form.rank.value,
        blurb: form.blurb.value,
      };
      if (netOn()) {
        window.ClanNet.req("PATCH", "/api/clans/" + clan.id, patch)
          .then(pullLists)
          .then(function () {
            setMsg("deskMsg", "Listing saved.", false);
            paint();
          })
          .catch(function (err) {
            setMsg("deskMsg", err.message, true);
          });
        return;
      }
      const res = L.updateClan(clan, patch);
      if (!res.ok) {
        setMsg("deskMsg", res.errors.join(". "), true);
        return;
      }
      writeJson(CLANS_KEY, replaceById(rows, res.clan));
      setMsg("deskMsg", "Listing saved.", false);
      paint();
    });
    $("deskClans").addEventListener("click", (ev) => {
      const acc = ev.target.closest("[data-accept]");
      const den = ev.target.closest("[data-deny]");
      const bump = ev.target.closest("[data-bump]");
      const kick = ev.target.closest("[data-ckick]");
      const del = ev.target.closest("[data-cdel]");
      let rows = loadClans();
      if (acc || den) {
        const el = acc || den;
        const clan = rows.find((c) => c.id === el.getAttribute(acc ? "data-accept" : "data-deny"));
        if (netOn()) {
          window.ClanNet.req("POST", "/api/clans/" + clan.id + "/decide", {
            name: el.getAttribute("data-who"),
            accept: Boolean(acc),
          })
            .then(pullLists)
            .then(paint)
            .catch(function (err) {
              setMsg("deskMsg", err.message, true);
            });
          return;
        }
        const res = L.decideApplication(clan, el.getAttribute("data-who"), Boolean(acc));
        if (!res.ok) {
          setMsg("deskMsg", res.error, true);
          return;
        }
        writeJson(CLANS_KEY, replaceById(rows, res.clan));
        paint();
      }
      if (bump) {
        const clan = rows.find((c) => c.id === bump.getAttribute("data-bump"));
        clan.bumped = Date.now();
        writeJson(CLANS_KEY, replaceById(rows, clan));
        paint();
      }
      if (kick) {
        const clan = rows.find((c) => c.id === kick.getAttribute("data-ckick"));
        const res = L.kickClanMember(clan, kick.getAttribute("data-who"));
        if (!res.ok) {
          setMsg("deskMsg", res.error, true);
          return;
        }
        writeJson(CLANS_KEY, replaceById(rows, res.clan));
        paint();
      }
      if (del) {
        rows = rows.filter((c) => c.id !== del.getAttribute("data-cdel"));
        writeJson(CLANS_KEY, rows);
        setMsg("deskMsg", "Listing removed.", false);
        paint();
      }
    });
    $("deskParties").addEventListener("submit", (ev) => {
      const form = ev.target.closest("[data-pedit]");
      if (!form) return;
      ev.preventDefault();
      const rows = loadParties();
      const party = rows.find((p) => p.id === form.getAttribute("data-pedit"));
      const res = L.updateParty(party, {
        title: form.title.value,
        invite: form.invite.value,
        starts: form.starts.value,
        blurb: form.blurb.value,
      });
      if (!res.ok) {
        setMsg("deskMsg", res.errors.join(". "), true);
        return;
      }
      writeJson(PARTIES_KEY, replaceById(rows, res.party));
      setMsg("deskMsg", "Party saved.", false);
      paint();
    });
    $("deskParties").addEventListener("click", (ev) => {
      const kick = ev.target.closest("[data-pkick]");
      const del = ev.target.closest("[data-pdel]");
      let rows = loadParties();
      if (kick) {
        const party = rows.find((p) => p.id === kick.getAttribute("data-pkick"));
        const res = L.kickPartyMember(party, kick.getAttribute("data-who"));
        if (!res.ok) {
          setMsg("deskMsg", res.error, true);
          return;
        }
        rows = res.dissolved
          ? rows.filter((p) => p.id !== party.id)
          : replaceById(rows, res.party);
        writeJson(PARTIES_KEY, rows);
        paint();
      }
      if (del) {
        rows = rows.filter((p) => p.id !== del.getAttribute("data-pdel"));
        writeJson(PARTIES_KEY, rows);
        setMsg("deskMsg", "Party closed.", false);
        paint();
      }
    });

    $("resetData").onclick = () => {
      localStorage.removeItem(CLANS_KEY);
      localStorage.removeItem(PARTIES_KEY);
      paint();
    };

    showTab(currentTab());
    paint();
  }

  function start() {
    paintAuth();
    const go = function () {
      bind();
    };
    if (!window.ClanNet) {
      go();
      return;
    }
    window.ClanNet.boot().then(go).catch(go);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
