// ECA Bot — YouTube Music: şarkı satırlarına, kartlara ve albüm/playlist başlığına "+" butonu ekler.
// YT Music aynı satır öğesini sayfa değişince başka şarkı için yeniden kullanıyor; bu yüzden
// hedef (şarkı/albüm/playlist) butona kaydedilmez, tıklama anında DOM'dan okunur.
(function () {
  "use strict";

  const ROW = "ytmusic-responsive-list-item-renderer";
  const CARD = "ytmusic-two-row-item-renderer";
  const HEADER = "ytmusic-responsive-header-renderer";
  const SKIP_INSIDE = "ytmusic-search-suggestions-section"; // arama kutusunun açılır önerileri

  // ---------- Hedefi bul ----------

  function parseHref(href) {
    if (!href) return null;
    const url = new URL(href, location.origin);
    const v = url.searchParams.get("v");
    if (url.pathname === "/watch" && /^[A-Za-z0-9_-]{11}$/.test(v || "")) return { kind: "song", videoId: v };
    const browse = url.pathname.match(/^\/browse\/((?:MPRE|VL)[A-Za-z0-9_-]+)$/);
    if (browse) return { kind: browse[1].startsWith("MPRE") ? "album" : "playlist", id: browse[1] };
    const list = url.searchParams.get("list");
    if (url.pathname === "/playlist" && list) return { kind: "playlist", id: list };
    return null; // sanatçı, podcast vb.
  }

  function texts(nodes) {
    const seen = new Set();
    for (const n of nodes) {
      const t = n.textContent.trim();
      if (t) seen.add(t);
    }
    return [...seen].join(", ");
  }

  function isAlbumPage() {
    // YT Music albüm adresini (/browse/MPRE...) albümün kendi listesine (OLAK5uy_...) çeviriyor
    const list = new URL(location.href).searchParams.get("list") || "";
    return location.pathname.startsWith("/browse/MPRE") || (location.pathname === "/playlist" && list.startsWith("OLAK5uy_"));
  }

  function pageArtists() {
    // Albüm sayfasında şarkı satırlarında sanatçı yok; başlıktaki sanatçıyı kullan
    if (!isAlbumPage()) return "";
    const header = document.querySelector(HEADER);
    return header ? texts(header.querySelectorAll('a[href^="channel/"], a[href*="/channel/"]')) : "";
  }

  function rowTarget(row) {
    const link = row.querySelector(".title a[href]") || row.querySelector(":scope > a.yt-simple-endpoint[href]");
    const target = parseHref(link && link.getAttribute("href"));
    if (target && target.kind === "song") {
      const title = row.querySelector(".title");
      target.title = title ? title.textContent.trim() : "";
      target.artists = texts(row.querySelectorAll('.flex-columns a[href^="channel/"]')) || pageArtists();
    }
    return target;
  }

  function cardTarget(card) {
    const link = card.querySelector("a.image-wrapper[href]") || card.querySelector(".title a[href]");
    const target = parseHref(link && link.getAttribute("href"));
    if (target && target.kind === "song") {
      const title = card.querySelector(".title");
      target.title = title ? title.textContent.trim() : "";
      target.artists = texts(card.querySelectorAll('.subtitle a[href^="channel/"]'));
    }
    return target;
  }

  function pageTarget() {
    const url = new URL(location.href);
    const browse = url.pathname.match(/^\/browse\/(MPRE[A-Za-z0-9_-]+)$/);
    if (browse) return { kind: "album", id: browse[1] };
    const list = url.searchParams.get("list");
    if (url.pathname === "/playlist" && list) return { kind: isAlbumPage() ? "album" : "playlist", id: list };
    return null;
  }

  // ---------- Bota gönder ----------

  function send(target) {
    const msg =
      target.kind === "song"
        ? { type: "add", tracks: [{ video_id: target.videoId, title: target.title, artists: target.artists }] }
        : { type: "addCollection", id: target.id };
    return chrome.runtime.sendMessage(msg).catch(() => ({
      ok: false,
      error: "Eklenti yeniden yüklendi — sayfayı yenile.",
    }));
  }

  let toastTimer = null;
  function toast(text, ok) {
    let el = document.getElementById("eca-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "eca-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle("eca-error", !ok);
    el.classList.add("eca-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("eca-show"), ok ? 2500 : 5000);
  }

  async function onClick(event, button, getTarget) {
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.state === "busy") return;
    const target = getTarget();
    if (!target) return;
    const label = button.dataset.label;
    button.dataset.state = "busy";
    button.textContent = "…";
    const result = await send(target);
    if (result && result.ok) {
      button.dataset.state = "done";
      button.textContent = "✓";
      if (target.kind === "song") {
        toast("Kuyruğa eklendi: " + (target.artists ? target.artists + " - " : "") + target.title, true);
      } else {
        const name = result.collection ? result.collection.title + ": " : "";
        toast(name + result.added + " şarkı kuyruğa eklendi", true);
      }
    } else {
      button.dataset.state = "error";
      button.textContent = "!";
      toast((result && result.error) || "Eklenemedi", false);
    }
    // Satır başka şarkıya geçebilir; durumu bir süre sonra sıfırla
    setTimeout(() => {
      button.dataset.state = "";
      button.textContent = label;
    }, 2500);
  }

  function makeButton(className, label, title, getTarget) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "eca-add " + className;
    button.textContent = label;
    button.title = title;
    button.dataset.label = label;
    button.addEventListener("click", (e) => onClick(e, button, getTarget), true);
    // YT Music satıra tıklamayı "çal" olarak algılamasın
    for (const type of ["mousedown", "mouseup", "pointerdown", "pointerup", "dblclick"]) {
      button.addEventListener(type, (e) => e.stopPropagation());
    }
    return button;
  }

  function buttonTitle(target) {
    return target && target.kind !== "song" ? "Tüm şarkıları bot kuyruğuna ekle" : "Bot kuyruğuna ekle";
  }

  // ---------- Sayfayı tara ----------

  function ensureRowButton(row) {
    if (row.closest(SKIP_INSIDE)) return;
    let button = row.querySelector(":scope > .eca-add");
    if (!button) {
      button = makeButton("eca-row", "+", "", () => rowTarget(row));
      const menu = row.querySelector(":scope > ytmusic-menu-renderer");
      row.insertBefore(button, menu || null);
    }
    const target = rowTarget(row);
    button.hidden = !target;
    button.title = buttonTitle(target);
  }

  function ensureCardButton(card) {
    let button = card.querySelector(":scope > .eca-add");
    if (!button) {
      button = makeButton("eca-card", "+", "", () => cardTarget(card));
      card.appendChild(button);
    }
    const target = cardTarget(card);
    button.hidden = !target;
    button.title = buttonTitle(target);
  }

  function ensureHeaderButton() {
    const target = pageTarget();
    const header = document.querySelector(HEADER);
    const actions = header && header.querySelector("#action-buttons");
    let button = document.querySelector(".eca-header");
    if (!actions || !target) {
      if (button) button.hidden = true;
      return;
    }
    if (!button || !actions.contains(button)) {
      if (button) button.remove();
      button = makeButton("eca-header", "+ Bota ekle", "", pageTarget);
      actions.appendChild(button);
    }
    button.hidden = false;
    button.title = buttonTitle(target);
  }

  function ensure(host) {
    if (host.matches(ROW)) ensureRowButton(host);
    else ensureCardButton(host);
  }

  function fullScan() {
    document.querySelectorAll(ROW + "," + CARD).forEach(ensure);
    ensureHeaderButton();
  }

  // Sadece değişen satır/kartları güncelle: oynatıcı çubuğu saniyede birkaç kez değişiyor,
  // her seferinde tüm sayfayı taramak gereksiz.
  const dirty = new Set();
  let headerDirty = false;
  let scheduled = false;

  function flush() {
    scheduled = false;
    dirty.forEach((host) => host.isConnected && ensure(host));
    dirty.clear();
    if (headerDirty) {
      headerDirty = false;
      ensureHeaderButton();
    }
  }

  function markFrom(node) {
    const el = node instanceof Element ? node : node && node.parentElement;
    if (!el || el.closest(".eca-add")) return;
    const host = el.closest(ROW + "," + CARD);
    if (host) dirty.add(host);
    if (el.closest(HEADER)) headerDirty = true;
  }

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      markFrom(m.target);
      for (const n of m.addedNodes) {
        if (!(n instanceof Element) || n.classList.contains("eca-add")) continue;
        if (n.matches(ROW + "," + CARD)) dirty.add(n);
        n.querySelectorAll(ROW + "," + CARD).forEach((host) => dirty.add(host));
        if (n.matches(HEADER) || n.querySelector(HEADER)) headerDirty = true;
      }
    }
    if ((dirty.size || headerDirty) && !scheduled) {
      scheduled = true;
      setTimeout(flush, 150);
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href"],
  });

  // SPA gezinmesi: başlık aynı öğe olarak kalabiliyor, hepsini bir kez yeniden değerlendir
  window.addEventListener("yt-navigate-finish", () => setTimeout(fullScan, 300));
  fullScan();
})();
