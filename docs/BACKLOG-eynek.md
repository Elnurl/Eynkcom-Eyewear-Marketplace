# EYNƏK / eynek.store — açıq işlər və məhsul axını (yeniləmə: 2026-11-26)

## Qərarlaşmış əməliyyat modeli (kod gözləyir)

### Kuryer və vaxt

- Kuryeri **satıcı çağırmır** — **platforma (sən)** sifarişi verir və nəzarət edir.
- **Kod (lokal):** satıcı paneldə «Kuryer çağır» yoxdur; axın stok təsdiqi → hazırlanma → **Hazırdır**; admin `/seller-admin/orders` → **Çatdırılma üçün gözləyənlər** (Bolt aç + çatdırıldı bağla).
- Bolt-da **API yoxdur**; hər kuryer sifarişi **əl ilə** nəzarət edilir.
- Çatdırılma **alışın eyni günü olmur** — **ən tezi növbəti gün**.
- **Həftəsonu** sifariş verilibsə → çatdırılma **ən tezi növbəti həftə içi** gündə.
- Standart vaxt pəncərələri (özün müəyyən edəcəksən) — hər vaxtın özünə görə ödəniş/əlavə ola bilər (gələcək).
- **Checkout UI:** «Çatdırılma tarixi və vaxtı» kartı — **ünvan/qeyd kartının altında**, **ödəniş üsulunun üstündə**; saytın commerce dizaynında; müvəqqəti pəncərələr `09:00–15:00` və `15:00–21:00` (tarixlər dinamik).

### Ödəniş qaydaları

- **Çatdırılma seçilibsə** → ödəniş **mütləq onlayn** (Epoint). **Qapıda ödəniş yoxdur.** *(checkout UI + API enforce — lokal)*
- **Mağazadan götürmə** (özü götürəcək) → **nağd** mümkündür *(və ya online)*.
- Məhsul məbləği **≥ 200 AZN** → çatdırılma **pulsuz**.
- **&lt; 200 AZN** → çatdırılma haqqı Bakı/Abşeron orta xərcə görə **6–10 AZN** aralığında dəqiqləşdiriləcək; **müvəqqəti standart: 8 AZN**.
- **Kod (lokal):** checkout xülasəsi + sifariş yaradılarkən `deliveryTotalQepik` / satıcı sətirində platforma tarifi; satıcı Bolt məbləğini əl ilə yazmır.

### Standart (reseptsiz) sifariş axını

1. Alıcı sifariş verir + (çatdırılmada) **məhsul + çatdırılma** onlayn ödəyir.
2. Satıcı **stokda var** təsdiqləyir.
3. Sifariş **hazırlanma** statusuna keçir; satıcı **hazırdır** göstərir.
4. Platforma kuryeri sifariş edir və çatdırır.

### Optik eynək + resept axını (yalnız optik)

1. Checkout-da alıcı resepti **qeyd edir**: PDF yükləyir və ya şəkil çəkir (yalnız optik eynək alınanda). **Gün eynəyində resept bloku yoxdur.**
2. Satıcı (optik mağaza) resepti görür, məhsulu hazırlayır → **hazırlanma** → **hazırdır**.
3. **Reseptlə sorğu göndəriləndə ödəniş əvvəlcə olmur** — satıcı məhsulu təsdiqləyəndən sonra alıcıda **«Ödəniş et»** düyməsi açılır; ödəniş sonra edilir.
4. Ödənişdən sonra platforma kuryer / təhvil (çatdırılma və ya götürmə qaydalarına uyğun).
5. **Kod (lokal):** checkout resept kartı + `/api/storage/uploads/prescription` + deliveryNote `[prescription:…]`; satıcı/alıcı baxışı; ödəniş `awaiting_payment` sonrası.

### Hüquqi

- [ ] **Epoint müqavilə / şərtlər** mətnləri satıcı və alıcı üçün təqdim etdiyimiz **şərtlər / hüquqi sənədlərə** əlavə olunacaq (yadda saxlanılıb — sənəd + sonra kod/UI).

### Açık / hələ dəqiqləşməyən

| Mövzu | Status |
|--------|--------|
| Satıcıya pul: ay sonu / dərhal / Epoint split | **Hələ qərar yoxdur** — yaxın günlərdə dəqiqləşəcək |
| Bolt ödənişi | API yoxdur; **özün nəzarət** (əl ilə / ay sonu faktura) |
| SMS | Şirkətlə danışıq; razılıq olsa bərpa; **həftə gözləmədə** |
| Çatdırılma 6–10 AZN dəqiq qiymət | Müvəqqəti **8 AZN**; sonra dəqiqləşdiriləcək |
| Çox-optika səbət (hər mağazaya ayrı çatdırılma) | Əvvəlki plan; bu sessiya təsdiqlənmədi — ayrıca qərar |

### Bir səbət, bir neçə optika (köhnə plan — ayrıca təsdiq lazım)

- [ ] Hər optika = ayrı bağlama = ayrı çatdırılma haqqı
- [ ] Səbətdə göstərmək: `A optikasından: X AZN`, `B optikasından: X AZN`
- [ ] Mətn: eyni optikadan əlavə məhsul — çatdırılma yenə bir dəfə (siyasət dəqiqləşdirilsin)

### Mobil tətbiq (native) — gələcək

- [ ] iOS/Android sonra; hazırkı işlər yalnız **veb**
- [ ] Mobilə keçəndə çatdırılma, resept, SMS, ödəniş yenidən nəzərdən keçiriləcək

---

## İstifadəçinin prioritet siyahısı (yenilənmiş istiqamət)

1. **Çatdırılma + ödəniş qaydaları** (8 AZN / 200+ pulsuz, onlayn məcburi, növbəti gün, kuryer platforma)
2. **Reseptli optik axını** (upload → satıcı təsdiqi → sonra ödəniş)
3. **Epoint mətnləri** hüquqi sənədlərə
4. **Email** (artıq böyük hissəsi var)
5. **SMS** — şirkət razılığı gözləmədə
6. **Mobil UI (veb)**
7. **Satıcı ödəniş split** — qərar gözləyir
8. **VTO** — hələ toxunma
9. **Horizon** / kataloq
10. **Native app** — sonra

## Danışıqda qalan / texniki qalıqlar

- Ödəniş **failed** bildirişi + redirect
- Epoint: Render `EPOINT_*`, kabinet URL/callback
- Satıcı hesablaşma paneli (qazanc/komissiya) — real köçürmə yox
- Lokal `DATABASE_URL`

## Köhnə Variant B qeydi (köhnəlib — istinad)

Əvvəlki model: satıcı Bolt çağırırdı, eyni gün / 15 dəq ödəniş pəncərəsi. **Yeni model yuxarıdakı bölmədir** — kuryer platforma, növbəti gün, resept üçün gecikmiş ödəniş.

## Siyahıda yox, amma arxa planda

- Guest order + kart ödənişi axını (işləyir)
- Bolt PDF təqdimat
- Qonaq sifariş izləmə tokeni (# hash)
