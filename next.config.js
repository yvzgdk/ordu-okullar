/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      // ─── Kurum İşlemleri ───
      { source: '/kurum-ekle', destination: '/institutions' },
      { source: '/kurumlar/ekle', destination: '/institutions' },
      { source: '/kurumlar/misafir-ekle', destination: '/institutions/guest-add' },
      { source: '/kurumlar/detay', destination: '/institutions/detail' },
      { source: '/kurumlar/duzenle', destination: '/institutions/edit' },
      { source: '/kurumlar/toplu-ice-aktar', destination: '/institutions/bulk-import' },
      { source: '/kurumlar/bilgi/:id', destination: '/institutions/:id' },
      { source: '/kurumlar', destination: '/institutions/detail' },

      // ─── Etkileşimli Tahta (ET) İşlemleri ───
      { source: '/tahtalar/ekle', destination: '/boards/add' },
      { source: '/tahtalar/liste', destination: '/boards/details' },
      { source: '/tahtalar/transfer', destination: '/boards/transfer' },
      { source: '/tahtalar/ihtiyac', destination: '/boards/needs' },
      { source: '/tahtalar/fazlalik', destination: '/boards/surplus' },
      { source: '/tahtalar', destination: '/boards/details' },

      // ─── BTR & YOS Öğretmen İşlemleri ───
      { source: '/btr-ogretmenleri', destination: '/btr/edit' },
      { source: '/btr/liste', destination: '/btr/edit' },
      { source: '/yos-ogretmenleri', destination: '/btr/edit' },
      { source: '/yos/liste', destination: '/btr/edit' },
      { source: '/btr-ekle', destination: '/btr/add' },
      { source: '/yos-ekle', destination: '/btr/add' },
      { source: '/yos/ekle', destination: '/btr/add' },
      { source: '/btr/gorevlendir', destination: '/btr/add' },

      // ─── İlçe, Rapor ve Sistem ───
      { source: '/ilceler', destination: '/districts' },
      { source: '/ilceler/:id', destination: '/districts/:id' },
      { source: '/raporlar', destination: '/reports' },
      { source: '/giris', destination: '/login' },
      { source: '/profil', destination: '/profile' },
      { source: '/yonetim-paneli', destination: '/dashboard' }
    ];
  }
};

module.exports = nextConfig;
