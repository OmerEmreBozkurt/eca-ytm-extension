const state = document.getElementById("state");
const details = document.getElementById("details");
const nowTitle = document.getElementById("now-title");
const autoplay = document.getElementById("autoplay");

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

async function refresh() {
  const res = await chrome.runtime.sendMessage({ type: "status" });
  if (!res.ok) {
    state.textContent = res.error;
    state.className = "error";
    details.hidden = true;
    return;
  }
  const s = res.status;
  state.className = "muted";
  state.textContent =
    (s.guild_name || "Sunucu") + " · " + (s.voice_channel ? "🔊 " + s.voice_channel : "ses kanalında değil");
  nowTitle.textContent = res.now && res.now.name ? res.now.name : s.is_loading ? "Yükleniyor…" : "—";
  autoplay.checked = !!s.autoplay;
  details.hidden = false;
}

autoplay.addEventListener("change", async () => {
  autoplay.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "autoplay", enabled: autoplay.checked });
  autoplay.disabled = false;
  if (!res.ok) {
    autoplay.checked = !autoplay.checked;
    state.textContent = res.error;
    state.className = "error";
  }
});

refresh();
