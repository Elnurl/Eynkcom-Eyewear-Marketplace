# EYNƏK / eynek.store — açıq işlər və məhsul axını (yeniləmə: 2025-11-23)

## İstifadəçinin prioritet siyahısı

1. **SMS bildirişi** — alıcı və satıcı
2. **E-mail bildirişi** — alıcı + operator/admin (sənin üçün mağaza/sifariş mailləri)
3. **Mobil UI** — daha sadə vitrin/checkout/sifariş
4. **Çatdırılma** — Bolt inteqrasiyası, qiymət, kuryer axını
5. **Online ödəniş** — pulların bölüşdürülməsi: platforma, **kuryer (Bolt)**, **satıcı**
6. **VTO** — tryon-wa: yerləşdirmə, templlər, PD, marketplace sync (hələ toxunma)
7. **Horizon** — məhsul/kataloq doldurulması (import, şəkillər)

## Danışıqda qalan / deploy gözləyən (kodda var və ya yaxın)

- Checkout xəritə autocomplete + metro (deploy edilib və ya gözləyir)
- Ödəniş **failed** bildirişi + redirect `order/?payment=failed` (commit gözləyir)
- Epoint: Render `EPOINT_*`, kabinet URL/callback
- Satıcı **hesablaşma** paneli (qazanc/komissiya) — real pul köçürməsi yoxdur, admin `settlementReference`
- Lokal dev: `DATABASE_URL`

## Təsvir edilən alıcı axını (Variant B + Bolt + Epoint)

1. Alıcı saytda sifariş verir (kuryer / mağazadan götürmə).
2. Sorğu **mağazaya** gedir; mağaza **stoku təsdiq/ləğv** edir.
3. Mağaza **çatdırılma ünvanına** baxır; **Bolt “Open with Bolt”** (və ya ekvivalent) — mağaza öz lokasiyasını / ünvanı seçir, alıcının xəritədə qeyd etdiyi nöqtə Bolt-da ötürülür.
4. **Kuryer qiyməti** + məhsul yekunu hesablanır → alıcıya **15 dəq** ödəniş pəncərəsi → **Epoint**.
5. Ödəniş Epoint tacir balansına düşür; **split** hələ müzakirə:
   - **Kuryer (Bolt):** ayın axırında Bolt-a toplu ödəniş?
   - **Satıcı:** ay sonu bank / dərhal bank / Epoint split — **qərar gözləyir**.

## Açıq biznes/qərar mövzuları

| Mövzu | Variantlar |
|--------|------------|
| Satıcı ödənişi | Ay sonu bank · dərhal köçürmə · Epoint split-request |
| Kuryer (Bolt) | Ay sonu faktura · Bolt API avtomatik |
| SMS | Sinch (plugin) / başqa provayder, hadisələr: sifariş, təsdiq, çatdırılma, ödəniş |
| Komissiya | Epoint ~3% + marketplace komissiya satıcıdan |

## Siyahıda yox, amma arxa planda

- Guest order + kart ödənişi axını (işləyir, test olundu)
- Bolt PDF təqdimat / Variant B sənədləri
- Vitrin böyük hero + demo mağazalar (lokal fallback)
- Qonaq sifariş izləmə tokeni (# hash)