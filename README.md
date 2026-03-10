# Paydos Tur - Biyometrik Fotoğraf Aracı

Telefondan biyometrik vize fotoğrafı çekme web uygulaması.

## Özellikler

- 📷 Telefon kamerasından canlı çekim (ön/arka kamera)
- 🎯 Yüz hizalama rehber çerçevesi (oval + göz/çene çizgileri)
- ⚠️ Gerçek zamanlı yüz doğrulama uyarıları
- 🌍 5 ülke preset'i: Schengen, ABD, Çin, İngiltere, Rusya
- 👤 Müşteri adı girişi (dosya adına yazılır)
- 💾 Dijital çıktı (600 DPI JPEG)
- 🖨️ Baskıya hazır 10×15cm şablon
- 🕐 Fotoğraf geçmişi (son 20 çekim)

## Kurulum & Deploy

### Yerel geliştirme:
```bash
npm install
npm run dev
```

### Netlify Deploy:

1. GitHub'a push et:
```bash
git init
git add .
git commit -m "Paydos Foto v1.0"
git remote add origin https://github.com/onder-pay/paydos-foto.git
git push -u origin main
```

2. Netlify'da:
   - "Add new site" → "Import an existing project"
   - GitHub repo seç: `onder-pay/paydos-foto`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Deploy!

3. Custom domain (`foto.paydostur.com`):
   - Netlify → Domain settings → Add custom domain
   - DNS'e CNAME kaydı ekle: `foto` → `paydos-foto.netlify.app`

## Ülke Ölçüleri

| Ülke       | Boyut      | DPI |
|------------|-----------|-----|
| Schengen   | 35×45mm   | 600 |
| ABD        | 51×51mm   | 600 |
| Çin        | 33×48mm   | 600 |
| İngiltere  | 35×45mm   | 600 |
| Rusya      | 35×45mm   | 600 |

## Sonraki Adımlar

- [ ] Paydos CRM entegrasyonu (müşteri kartına fotoğraf bağlama)
- [ ] Firebase'e fotoğraf yükleme
- [ ] Arka plan AI temizleme (opsiyonel)
- [ ] PWA offline desteği
