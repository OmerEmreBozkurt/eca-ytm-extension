// ECA Bot — YouTube Music: bot API istekleri (content script / popup buraya mesaj atar).
// Bot sunucusu CORS başlığı göndermiyor; istekler bu service worker'dan, kullanıcının
// ayarlarda izin verdiği bot adresine yapılır.

const REQUESTED_BY = "YT Music";

// Hızlı tıklamalar sırayla gitsin: her istek bir öncekinin bitmesini bekler.
let chain = Promise.resolve();
function serialized(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

class FriendlyError extends Error {}

async function getConfig() {
  const { botUrl, token } = await chrome.storage.local.get(["botUrl", "token"]);
  if (!botUrl || !token) {
    throw new FriendlyError("Önce eklenti ayarlarından bot adresini ve token'ı gir.");
  }
  const origin = new URL(botUrl).origin;
  if (!(await chrome.permissions.contains({ origins: [origin + "/*"] }))) {
    throw new FriendlyError("Bot adresine erişim izni yok. Eklenti ayarlarında Kaydet'e basıp izin ver.");
  }
  return { botUrl, token };
}

async function botFetch(path, { method = "GET", body } = {}) {
  const { botUrl, token } = await getConfig();
  let res;
  try {
    res = await fetch(botUrl + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    throw new FriendlyError("Bota ulaşılamadı (" + botUrl + ").");
  }
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  if (res.ok) return data || {};

  const detail = (data && data.detail) || {};
  const code = typeof detail === "object" ? detail.code : null;
  if (res.status === 401) throw new FriendlyError("Token hatalı — eklenti ayarlarını kontrol et.");
  if (code === "VOICE_NOT_CONNECTED") throw new FriendlyError("Bot ses kanalında değil — Discord'da /join yaz.");
  if (code === "UI_DISABLED") throw new FriendlyError("Botun web paneli kapalı (WEB_UI_TOKEN yok).");
  const message = typeof detail === "object" ? detail.error : detail;
  throw new FriendlyError("Bot hatası: " + (message || "HTTP " + res.status));
}

const handlers = {
  add: (msg) =>
    serialized(() =>
      botFetch("/api/queue/add", {
        method: "POST",
        body: { tracks: msg.tracks, requested_by: REQUESTED_BY },
      })
    ).then((r) => ({ added: r.added })),

  addCollection: (msg) =>
    serialized(() =>
      botFetch("/api/queue/add-collection", {
        method: "POST",
        body: { id: msg.id, requested_by: REQUESTED_BY },
      })
    ).then((r) => ({ added: r.added, collection: r.collection })),

  status: async () => {
    const [status, now] = await Promise.all([botFetch("/api/status"), botFetch("/api/now")]);
    return { status, now: now.now };
  },

  autoplay: (msg) =>
    botFetch("/api/autoplay", { method: "POST", body: { enabled: !!msg.enabled } }).then((r) => ({
      autoplay: !!(r.status && r.status.autoplay),
    })),
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = handlers[msg && msg.type];
  if (!handler) return false;
  handler(msg).then(
    (result) => sendResponse({ ok: true, ...result }),
    (err) =>
      sendResponse({
        ok: false,
        error: err instanceof FriendlyError ? err.message : "Beklenmeyen hata: " + err.message,
      })
  );
  return true; // yanıt asenkron
});
