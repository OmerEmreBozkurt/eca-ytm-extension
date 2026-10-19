const form = document.getElementById("form");
const botUrl = document.getElementById("bot-url");
const token = document.getElementById("token");
const result = document.getElementById("result");

function show(text, ok) {
  result.textContent = text;
  result.className = "result " + (ok ? "ok" : "error");
  result.hidden = false;
}

function normalizeUrl(raw) {
  const url = new URL(raw.trim());
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("http(s) adresi olmalı");
  return url.origin + url.pathname.replace(/\/+$/, "");
}

chrome.storage.local.get(["botUrl", "token"]).then((cfg) => {
  botUrl.value = cfg.botUrl || "";
  token.value = cfg.token || "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  let url;
  try {
    url = normalizeUrl(botUrl.value);
  } catch (err) {
    show("Geçersiz adres: " + err.message, false);
    return;
  }
  // Bot CORS başlığı göndermiyor: eklentinin bu adrese istek atabilmesi için izin gerekli
  const granted = await chrome.permissions.request({ origins: [new URL(url).origin + "/*"] });
  if (!granted) {
    show("Bot adresine erişim izni verilmedi; eklenti bota istek atamaz.", false);
    return;
  }
  await chrome.storage.local.set({ botUrl: url, token: token.value.trim() });
  botUrl.value = url;

  const res = await chrome.runtime.sendMessage({ type: "status" });
  if (!res.ok) {
    show("Kaydedildi ama bota bağlanılamadı: " + res.error, false);
    return;
  }
  const s = res.status;
  const voice = s.voice_channel ? "ses kanalı: " + s.voice_channel : "şu an ses kanalında değil";
  show("✓ Bağlandı: " + (s.guild_name || "sunucu") + " (" + voice + ")", true);
});
