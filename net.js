/* Shared API client. No-op if the server is not running. */
(function () {
  const TOKEN_KEY = "clanboard.v2.token";
  const cache = {
    online: false,
    token: localStorage.getItem(TOKEN_KEY) || "",
    profile: null,
    clans: [],
    parties: [],
  };

  async function req(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (cache.token) headers.Authorization = "Bearer " + cache.token;
    const res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      data = {};
    }
    if (!res.ok) {
      const msg =
        (data.errors && data.errors[0]) || data.error || "Request failed (" + res.status + ")";
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  async function boot() {
    try {
      const health = await req("GET", "/api/health");
      cache.online = Boolean(health.ok);
    } catch (err) {
      cache.online = false;
      return cache;
    }
    const [clans, parties] = await Promise.all([req("GET", "/api/clans"), req("GET", "/api/parties")]);
    cache.clans = clans.clans || [];
    cache.parties = parties.parties || [];
    if (cache.token) {
      try {
        const me = await req("GET", "/api/me");
        cache.profile = me.profile;
      } catch (err) {
        cache.token = "";
        cache.profile = null;
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    return cache;
  }

  async function refreshLists() {
    if (!cache.online) return;
    const [clans, parties] = await Promise.all([req("GET", "/api/clans"), req("GET", "/api/parties")]);
    cache.clans = clans.clans || [];
    cache.parties = parties.parties || [];
  }

  function setToken(token) {
    cache.token = token || "";
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  window.ClanNet = { cache, req, boot, refreshLists, setToken };
})();
