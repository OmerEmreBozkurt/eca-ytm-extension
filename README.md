# ECA Bot — YouTube Music eklentisi

YouTube Music'te gezinirken gördüğün şarkıları, çalmadan, tek tıkla
[ECA_BOT](https://github.com/SeferCinar/ECA_BOT) Discord botunun kuyruğuna ekler.
Chrome, Edge, Brave ve Opera'da çalışır.

- **Şarkı satırları** (ana sayfa, arama, albüm, playlist): ⋮ menüsünün solundaki **+**
- **Kartlar** (albüm/playlist/şarkı kapakları): fareyle üzerine gelince sağ üstte **+**;
  albüm ve playlist kartında tüm şarkıları ekler
- **Albüm / playlist sayfası**: başlıktaki **+ Bota ekle** tüm şarkıları ekler
- **Eklenti ikonu**: botun bağlı olduğu kanal, çalan şarkı ve **Autoplay** aç/kapat

Hızlıca art arda tıkladığın şarkılar tıklama sırasıyla kuyruğa girer; bot şarkının ses
adresini çalma sırası gelince alır.

## Gereksinimler

- Botun web paneli açık olmalı (`WEB_UI_TOKEN` tanımlı) ve tarayıcından adresine erişebilmelisin.
- Bot, hızlı ekleme özelliğinin geldiği sürümde ya da daha yenisinde olmalı
  (`feat: instant queue adds and YouTube Music browse API`).

## Kurulum

1. Repoyu indir:
   ```bash
   git clone https://github.com/OmerEmreBozkurt/eca-ytm-extension.git
   ```
2. Tarayıcıda `chrome://extensions` aç (Edge: `edge://extensions`), sağ üstten **Geliştirici modu**'nu aç.
3. **Paketlenmemiş öğe yükle** → indirdiğin `eca-ytm-extension` klasörünü seç.
4. Açılan ayarlar sayfasına (açılmazsa eklentinin **Ayrıntılar → Uzantı seçenekleri**):
   - **Bot web paneli adresi:** ör. `https://eca.ornek.com`
   - **WEB_UI_TOKEN:** Coolify'daki değer
   - **Kaydet ve test et** → tarayıcı bot adresine erişim izni sorar, **İzin ver** de.
   "✓ Bağlandı" görünürse hazır.
5. YouTube Music sekmesi açıksa sayfayı yenile.

## Güncelleme

```bash
git pull
```
Sonra `chrome://extensions` sayfasında eklentinin ↻ (yeniden yükle) butonuna bas ve YouTube Music'i yenile.

## Sorun giderme

| Bildirim | Çözüm |
|---|---|
| Bot ses kanalında değil | Discord'da `/join` yaz ya da web panelinden bir kanala bağla |
| Token hatalı | Ayarlardaki `WEB_UI_TOKEN` değerini kontrol et |
| Bot adresine erişim izni yok | Ayarlarda **Kaydet ve test et**'e basıp izni ver |
| Eklenti yeniden yüklendi — sayfayı yenile | Eklenti güncellendi; YouTube Music sekmesini yenile |
| **+** butonları görünmüyor | YouTube Music sayfa yapısını değiştirmiş olabilir; `content.js` içindeki seçicilere bakmak gerekir |

## Nasıl çalışır

- `content.js`: YouTube Music sayfasındaki `ytmusic-responsive-list-item-renderer` (satır),
  `ytmusic-two-row-item-renderer` (kart) ve `ytmusic-responsive-header-renderer` (başlık) öğelerine
  buton ekler. Hangi şarkı/albüm/playlist olduğu tıklama anında öğenin bağlantısından okunur
  (`watch?v=`, `browse/MPRE…`, `playlist?list=`).
- `background.js`: istekleri sırayla botun web API'sine gönderir:
  `POST /api/queue/add`, `POST /api/queue/add-collection`, `GET /api/status`, `GET /api/now`,
  `POST /api/autoplay`. Bunlar değişirse eklenti de güncellenmeli.
- Token yalnızca bu tarayıcıda (`chrome.storage.local`) saklanır, senkronize edilmez.
