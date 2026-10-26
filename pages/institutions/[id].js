// pages/institutions/[id].js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Button,
  Badge,
  Table,
  ProgressBar
} from 'react-bootstrap';

// jsPDF ve html2canvas importları
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function InstitutionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [institution, setInstitution] = useState(null);
  const [detailedBoards, setDetailedBoards] = useState([]);
  const [boardNeeds, setBoardNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const detailRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────
  // 1) Supabase'ten Kurum ve İlişkili Tüm Verileri Çek
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    async function fetchAllInstitutionDetails() {
      setLoading(true);

      try {
        // A) Kurum verisini çek
        let { data: instData, error: instErr } = await supabase
          .from('kurum_kayit')
          .select(`*, district:districts(id, name)`)
          .eq('id', id)
          .maybeSingle();

        // Eğer join bir şekilde başarısız olduysa tekil kurum çekip ilçeyi manuel eşleştir
        if (instErr || !instData) {
          const { data: fallbackData } = await supabase
            .from('kurum_kayit')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (fallbackData) {
            instData = fallbackData;
            if (fallbackData.district_id) {
              const { data: distData } = await supabase
                .from('districts')
                .select('id, name')
                .eq('id', fallbackData.district_id)
                .maybeSingle();
              instData.district = distData;
            }
          }
        }

        if (!instData) {
          setInstitution(null);
          setLoading(false);
          return;
        }

        // B) İlişkili Kurumlar (Ev Sahibi / Misafir)
        if (instData.status === 'ev_sahibi') {
          const { data: guestData } = await supabase
            .from('kurum_kayit')
            .select('id, name, code, district_id')
            .eq('related_institution_id', id);
          instData.guests = guestData || [];
        } else if (instData.status === 'misafir' && instData.related_institution_id) {
          const { data: hostData } = await supabase
            .from('kurum_kayit')
            .select('id, name, code, district_id')
            .eq('id', instData.related_institution_id)
            .maybeSingle();
          instData.host = hostData;
        }

        // C) YOS / BTR Kayıtları
        const { data: btrData } = await supabase
          .from('btr_records')
          .select('*')
          .or(`institution_id.eq.${id},institution_id_2.eq.${id}`);
        instData.btr_records = btrData || [];

        // D) Sınıf Bazında Kayıtlı Etkileşimli Tahtalar (et_detay)
        const { data: boardsData } = await supabase
          .from('et_detay')
          .select('*')
          .eq('institution_id', id)
          .order('id', { ascending: false });
        setDetailedBoards(boardsData || []);

        // E) Okulun ET İhtiyaç Talepleri (et_ihtiyac)
        const { data: needsData } = await supabase
          .from('et_ihtiyac')
          .select('*')
          .eq('institution_id', id)
          .order('id', { ascending: false });
        setBoardNeeds(needsData || []);

        // İlçe adını garantiye al
        instData.district_name = instData.district?.name || '-';

        setInstitution(instData);
      } catch (err) {
        console.error('Veri yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllInstitutionDetails();
  }, [id]);

  // Toplam tahta sayısını hesapla
  const totalBoards =
    (institution?.vestel_black_boards || 0) +
    (institution?.vestel_grey_boards || 0) +
    (institution?.arcelik_boards || 0) +
    (institution?.aidata_boards || 0) ||
    institution?.total_boards ||
    0;

  // ─────────────────────────────────────────────────────────────────────
  // 2) Yazdır ve PDF İndir İşlemleri
  // ─────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPDF = async () => {
    if (!detailRef.current) return;
    setPdfGenerating(true);

    try {
      const canvas = await html2canvas(detailRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${institution?.code || 'kurum'}_${institution?.name || 'detay'}.pdf`);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      alert('PDF oluşturulurken bir hata meydana geldi: ' + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" style={{ width: 48, height: 48 }} />
        <h5 className="mt-3 text-secondary fw-semibold">Kurum detayları yükleniyor...</h5>
      </Container>
    );
  }

  if (!institution) {
    return (
      <Container className="py-5 text-center">
        <div className="rounded-circle bg-danger-soft d-inline-flex p-4 mb-3">
          <i className="fas fa-school-circle-xmark fa-3x text-danger"></i>
        </div>
        <h4 className="fw-bold text-dark">Kurum Bulunamadı</h4>
        <p className="text-muted">İstediğiniz kurum sistemde kayıtlı değil veya silinmiş olabilir.</p>
        <Link href="/kurumlar" className="btn btn-primary rounded-pill px-4">
          <i className="fas fa-arrow-left me-2"></i>Kurum Listesine Dön
        </Link>
      </Container>
    );
  }

  // Faz Rozet Rengi
  const getFazBadge = (faz) => {
    const f = (faz || '').toLowerCase();
    if (!f || f === 'faz yok' || f === 'yok') {
      return <Badge bg="secondary" className="px-2 py-1">Faz Yok</Badge>;
    }
    if (f.includes('faz 1250')) return <Badge bg="warning" text="dark" className="px-2 py-1">Faz 1250</Badge>;
    if (f.includes('faz 1')) return <Badge bg="success" className="px-2 py-1">Faz 1</Badge>;
    if (f.includes('faz 2')) return <Badge bg="primary" className="px-2 py-1">Faz 2</Badge>;
    if (f.includes('faz 4')) return <Badge bg="dark" className="px-2 py-1">Faz 4</Badge>;
    if (f.includes('uyum')) return <Badge bg="info" className="px-2 py-1">Uyumlaştırma</Badge>;
    return <Badge bg="secondary" className="px-2 py-1">{faz}</Badge>;
  };

  return (
    <Container fluid className="px-0">
      {/* ─── YAZDIRMA VE PDF ALANI ─── */}
      <div ref={detailRef} className="institution-detail-container pb-5">
        {/* ─── 1. ÜST HERO / BAŞLIK KARTI ─── */}
        <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
          <div className="p-4 border-bottom bg-light">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-4 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 56, height: 56, fontSize: '1.6rem' }}
                >
                  <i className="fas fa-school"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                    <h3 className="fw-bold mb-0 text-dark">{institution.name}</h3>
                    {institution.status === 'ev_sahibi' ? (
                      <Badge bg="success" className="px-2 py-1 fw-semibold">
                        <i className="fas fa-building me-1"></i>Ev Sahibi Kurum
                      </Badge>
                    ) : (
                      <Badge bg="warning" text="dark" className="px-2 py-1 fw-semibold">
                        <i className="fas fa-house-chimney-user me-1"></i>Misafir Kurum
                      </Badge>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-3 text-muted small flex-wrap">
                    <span>
                      <i className="fas fa-barcode text-secondary me-1"></i>
                      MEB Kodu: <strong className="text-dark">{institution.code || '-'}</strong>
                    </span>
                    <span>
                      <i className="fas fa-map-location-dot text-primary me-1"></i>
                      İlçe: <strong className="text-dark">{institution.district_name}</strong>
                    </span>
                    <span>
                      <i className="fas fa-layer-group text-info me-1"></i>
                      Faz: {getFazBadge(institution.faz)}
                    </span>
                    <span>
                      <i className="fas fa-door-open text-warning me-1"></i>
                      Derslik (BDS): <strong className="text-dark">{institution.bds ?? '-'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="d-flex align-items-center gap-2 flex-wrap d-print-none">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                >
                  <i className="fas fa-print"></i>
                  <span>Yazdır</span>
                </Button>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pdfGenerating}
                  onClick={handleSaveAsPDF}
                  className="rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                >
                  {pdfGenerating ? (
                    <Spinner size="sm" animation="border" />
                  ) : (
                    <i className="fas fa-file-pdf text-danger"></i>
                  )}
                  <span>PDF İndir</span>
                </Button>

                <Link
                  href="/kurumlar/duzenle"
                  className="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                >
                  <i className="fas fa-edit"></i>
                  <span>Düzenle</span>
                </Link>

                <Link
                  href="/kurumlar"
                  className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                >
                  <i className="fas fa-arrow-left"></i>
                  <span>Kurum Listesi</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ─── 2. ÜST KPI ÖZET KARTLARI ─── */}
          <Card.Body className="p-3 bg-white">
            <Row className="g-3">
              {/* Toplam ET */}
              <Col xs={12} sm={6} md={3}>
                <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between h-100">
                  <div>
                    <span className="text-muted small d-block">Toplam ET Sayısı</span>
                    <h4 className="fw-bold mb-0 text-dark">{totalBoards} <small style={{ fontSize: '0.85rem' }}>Adet</small></h4>
                  </div>
                  <div className="rounded-circle bg-warning-soft text-warning d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                    <i className="fas fa-chalkboard"></i>
                  </div>
                </div>
              </Col>

              {/* Altyapı & Faz */}
              <Col xs={12} sm={6} md={3}>
                <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between h-100">
                  <div>
                    <span className="text-muted small d-block">Altyapı Durumu</span>
                    <h5 className="fw-bold mb-0 text-dark">
                      {institution.has_infrastructure ? (
                        <span className="text-success"><i className="fas fa-check-circle me-1"></i>Altyapı Var</span>
                      ) : (
                        <span className="text-muted"><i className="fas fa-circle-xmark me-1"></i>Altyapı Yok</span>
                      )}
                    </h5>
                  </div>
                  <div className="rounded-circle bg-info-soft text-info d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                    <i className="fas fa-network-wired"></i>
                  </div>
                </div>
              </Col>

              {/* İnternet Tipi */}
              <Col xs={12} sm={6} md={3}>
                <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between h-100">
                  <div>
                    <span className="text-muted small d-block">İnternet Bağlantısı</span>
                    <h6 className="fw-bold mb-0 text-dark text-truncate" style={{ maxWidth: 160 }}>
                      {institution.internet_type || 'Belirtilmedi'}
                    </h6>
                  </div>
                  <div className="rounded-circle bg-primary-soft text-primary d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                    <i className="fas fa-wifi"></i>
                  </div>
                </div>
              </Col>

              {/* YOS Öğretmeni */}
              <Col xs={12} sm={6} md={3}>
                <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between h-100">
                  <div>
                    <span className="text-muted small d-block">Yetkili Okul Sorumlusu</span>
                    <h6 className="fw-bold mb-0 text-dark text-truncate" style={{ maxWidth: 160 }}>
                      {institution.btr_records && institution.btr_records.length > 0 ? (
                        <span className="text-success">
                          <i className="fas fa-user-check me-1"></i>{institution.btr_records[0].name} {institution.btr_records[0].surname}
                        </span>
                      ) : (
                        <span className="text-muted">Görevli Yok</span>
                      )}
                    </h6>
                  </div>
                  <div className="rounded-circle bg-success-soft text-success d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                    <i className="fas fa-chalkboard-user"></i>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ─── 3. DETAY KARTLARI (2x3 GRID) ─── */}
        <Row className="g-4 mb-4">
          {/* KART 1: TEMEL BİLGİLER */}
          <Col md={6} lg={4}>
            <Card className="modern-card h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="fas fa-info-circle text-primary"></i>
                <h6 className="mb-0 fw-bold text-dark">Temel Kurum & Bina Bilgileri</h6>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">İlçe:</span>
                    <strong className="text-dark">{institution.district_name}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Kurum Kodu:</span>
                    <Badge bg="dark">{institution.code || '-'}</Badge>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Kurum Adı:</span>
                    <strong className="text-dark text-end" style={{ maxWidth: 200 }}>{institution.name}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Derslik Sayısı (BDS):</span>
                    <strong className="text-dark">{institution.bds ?? '-'}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Bina Durumu:</span>
                    <Badge bg={institution.status === 'ev_sahibi' ? 'success' : 'warning'}>
                      {institution.status === 'ev_sahibi' ? 'Ev Sahibi' : 'Misafir'}
                    </Badge>
                  </div>

                  {/* Misafir ise Ev Sahibi Kurum */}
                  {institution.status === 'misafir' && institution.host && (
                    <div className="p-2 bg-light rounded-3 mt-1">
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Bağlı Bulunduğu Ev Sahibi:</div>
                      <Link href={`/kurumlar/bilgi/${institution.host.id}`} className="fw-bold text-primary text-decoration-none d-block">
                        <i className="fas fa-building me-1"></i>{institution.host.name} ({institution.host.code})
                      </Link>
                    </div>
                  )}

                  {/* Ev Sahibi ise Bünyesindeki Misafirler */}
                  {institution.status === 'ev_sahibi' && institution.guests && institution.guests.length > 0 && (
                    <div className="p-2 bg-light rounded-3 mt-1">
                      <div className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>Bünyesindeki Misafir Kurumlar:</div>
                      {institution.guests.map(g => (
                        <Link key={g.id} href={`/kurumlar/bilgi/${g.id}`} className="d-block small text-dark fw-semibold text-decoration-none py-1 border-bottom">
                          <i className="fas fa-user-friends text-secondary me-1"></i>{g.name} ({g.code})
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* CBS Koordinatları */}
                  {(institution.cbs1 || institution.cbs2) && (
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted">CBS Koordinatları:</span>
                      <span className="text-dark font-monospace">{institution.cbs1 || '-'} , {institution.cbs2 || '-'}</span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* KART 2: ALTYAPI VE AĞ BİLGİLERİ */}
          <Col md={6} lg={4}>
            <Card className="modern-card h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="fas fa-network-wired text-info"></i>
                <h6 className="mb-0 fw-bold text-dark">Altyapı ve Ağ Bilgileri</h6>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Altyapı Durumu:</span>
                    <Badge bg={institution.has_infrastructure ? 'success' : 'secondary'}>
                      {institution.has_infrastructure ? 'Mevcut' : 'Yok'}
                    </Badge>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Fatih Projesi Kapsamı:</span>
                    <Badge bg={institution.is_fatih ? 'primary' : 'secondary'}>
                      {institution.is_fatih ? 'Fatih Kapsamında' : 'Kapsam Dışı'}
                    </Badge>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Proje Fazı:</span>
                    <div>{getFazBadge(institution.faz)}</div>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Altyapı Tipi:</span>
                    <strong className="text-dark">{institution.altyapi || '-'}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Altyapı Sahibi:</span>
                    <strong className="text-dark">{institution.infra_owner || '-'}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">İnternet Bağlantısı:</span>
                    <Badge bg="light" className="text-dark border">{institution.internet_type || '-'}</Badge>
                  </div>
                  {institution.altyapi_planlama && (
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted">Altyapı Planlama:</span>
                      <span className="text-secondary">{institution.altyapi_planlama}</span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* KART 3: ETKİLEŞİMLİ TAHTA ENVANTERİ */}
          <Col md={6} lg={4}>
            <Card className="modern-card h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-chalkboard text-warning"></i>
                  <h6 className="mb-0 fw-bold text-dark">Etkileşimli Tahta Envanteri</h6>
                </div>
                <Badge bg="primary" className="px-2 py-1">Toplam {totalBoards}</Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span><i className="fas fa-tv text-dark me-2"></i>Vestel Siyah Tahta:</span>
                    <strong className="text-dark">{institution.vestel_black_boards || 0} Adet</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span><i className="fas fa-tv text-secondary me-2"></i>Vestel Gri Tahta:</span>
                    <strong className="text-dark">{institution.vestel_grey_boards || 0} Adet</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span><i className="fas fa-tv text-danger me-2"></i>Arçelik Tahta:</span>
                    <strong className="text-dark">{institution.arcelik_boards || 0} Adet</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span><i className="fas fa-tv text-primary me-2"></i>Aidata Tahta:</span>
                    <strong className="text-dark">{institution.aidata_boards || 0} Adet</strong>
                  </div>

                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Tahtaların Sahibi:</span>
                    <strong className="text-dark">{institution.board_owner || '-'}</strong>
                  </div>

                  {/* Hızlı İşlem Bağlantıları */}
                  <div className="d-flex gap-2 mt-2 pt-2 border-top">
                    <Link href={`/tahtalar/transfer`} className="btn btn-outline-primary btn-sm flex-grow-1 rounded-pill" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-arrows-split-up-and-left me-1"></i>Tahta Transfer Et
                    </Link>
                    <Link href={`/tahtalar/ihtiyac`} className="btn btn-outline-warning btn-sm flex-grow-1 rounded-pill" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-plus me-1"></i>İhtiyaç Bildir
                    </Link>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* KART 4: BT SINIFI VE LABORATUVAR BİLGİLERİ */}
          <Col md={6} lg={4}>
            <Card className="modern-card h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="fas fa-desktop text-success"></i>
                <h6 className="mb-0 fw-bold text-dark">BT Sınıfı & Laboratuvar</h6>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between py-1 border-bottom small mb-2">
                  <span className="text-muted">BT Sınıfı Durumu:</span>
                  <Badge bg={institution.has_bt_class ? 'success' : 'secondary'}>
                    {institution.has_bt_class ? 'Mevcut' : 'Yok'}
                  </Badge>
                </div>

                {institution.has_bt_class ? (() => {
                  let labs = [];
                  if (typeof institution.bt_labs === 'string') {
                    try { labs = JSON.parse(institution.bt_labs); } catch(e){}
                  } else if (Array.isArray(institution.bt_labs)) {
                    labs = institution.bt_labs;
                  }

                  if (labs.length === 0) {
                    return <div className="text-muted small py-2">Laboratuvar detayları henüz girilmemiş.</div>;
                  }

                  const totalPc = labs.reduce((sum, l) => sum + (parseInt(l.pc_count, 10) || 0), 0);

                  return (
                    <div>
                      <div className="d-flex justify-content-between small text-muted mb-2">
                        <span>Toplam Lab: <strong>{labs.length}</strong></span>
                        <span>Toplam PC: <strong>{totalPc}</strong></span>
                      </div>
                      <div className="d-flex flex-column gap-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {labs.map((lab, i) => (
                          <div key={i} className="p-2 bg-light rounded-3 border small">
                            <div className="fw-bold text-dark mb-1">
                              <i className="fas fa-desktop text-success me-1"></i>Lab {i + 1}
                            </div>
                            <div className="d-flex justify-content-between text-muted">
                              <span>PC Sayısı: <strong className="text-dark">{lab.pc_count || '-'}</strong></span>
                              <span>Durum: <strong>{lab.lab_status || '-'}</strong></span>
                            </div>
                            <div className="d-flex justify-content-between text-muted mt-1">
                              <span>Kaynak: {lab.lab_source || '-'}</span>
                              <span>Tahta: {lab.has_board === 'var' ? 'Var' : 'Yok'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-muted small py-4 text-center">
                    <i className="fas fa-ban fa-2x mb-2 text-secondary d-block"></i>
                    Okulda faal bir BT sınıfı / Laboratuvarı bulunmamaktadır.
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* KART 5: YOS / BTR GÖREVLENDİRME BİLGİLERİ */}
          <Col md={6} lg={4}>
            <Card className="modern-card h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-chalkboard-user text-primary"></i>
                  <h6 className="mb-0 fw-bold text-dark">Yetkili Okul Sorumlusu (YOS)</h6>
                </div>
                <Link href="/yos-ekle" className="btn btn-outline-primary btn-sm rounded-pill py-0 px-2" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-plus me-1"></i>YOS Ata
                </Link>
              </Card.Header>
              <Card.Body className="p-3">
                {institution.btr_records && institution.btr_records.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {institution.btr_records.map((btr, i) => (
                      <div key={btr.id || i} className={`small ${i > 0 ? 'pt-3 border-top' : ''}`}>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <strong className="text-dark" style={{ fontSize: '0.95rem' }}>
                            <i className="fas fa-user-tie text-primary me-2"></i>
                            {btr.name} {btr.surname}
                          </strong>
                          <Badge bg={btr.status === 'Aktif' ? 'success' : 'secondary'}>
                            {btr.status || 'Aktif'}
                          </Badge>
                        </div>

                        {btr.brans && (
                          <div className="mb-1 text-muted">
                            <span className="badge bg-light text-dark border me-1">Branş:</span>
                            <strong>{btr.brans}</strong>
                          </div>
                        )}

                        <div className="mb-1">
                          <a href={`tel:${btr.phone}`} className="text-decoration-none text-dark fw-semibold">
                            <i className="fas fa-phone-alt text-success me-2"></i>
                            {btr.phone || '-'}
                          </a>
                        </div>

                        {btr.email && (
                          <div className="mb-1">
                            <a href={`mailto:${btr.email}`} className="text-decoration-none text-muted">
                              <i className="fas fa-envelope text-info me-2"></i>
                              {btr.email}
                            </a>
                          </div>
                        )}

                        {btr.assignment_date && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Görevlendirme: {new Date(btr.assignment_date).toLocaleDateString('tr-TR')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted small">
                    <i className="fas fa-user-slash fa-2x mb-2 text-secondary d-block"></i>
                    Bu kuruma görevlendirilmiş YOS öğretmeni bulunamadı.
                    <div className="mt-2">
                      <Link href="/yos-ekle" className="btn btn-outline-primary btn-sm rounded-pill px-3">
                        <i className="fas fa-user-plus me-1"></i>YOS Görevlendir
                      </Link>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* KART 6: KURUM YÖNETİMİ VE İLETİŞİM */}
          <Col md={6} lg={4}>
            <Card className="modern-card h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="fas fa-address-book text-success"></i>
                <h6 className="mb-0 fw-bold text-dark">Kurum Yönetimi & İletişim</h6>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Kurum Müdürü / Yetkili:</span>
                    <strong className="text-dark">{institution.director || '-'}</strong>
                  </div>

                  <div className="d-flex justify-content-between py-1 border-bottom align-items-center">
                    <span className="text-muted">Müdür İletişim Tel:</span>
                    {institution.director_phone ? (
                      <a href={`tel:${institution.director_phone}`} className="text-decoration-none fw-bold text-success">
                        <i className="fas fa-phone me-1"></i>{institution.director_phone}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </div>

                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Kayıt Tarihi:</span>
                    <span className="text-muted">
                      {institution.created_at ? new Date(institution.created_at).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </div>

                  <div className="p-3 bg-light rounded-3 mt-2 border">
                    <div className="small fw-semibold text-dark mb-1">
                      <i className="fas fa-circle-info text-primary me-1"></i>Bilgi Notu
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Okul yönetim veya telefon bilgilerinde değişiklik olduğunda Kurumu Düzenle ekranından anında güncelleyebilirsiniz.
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ─── 4. SINIF BAZINDA DETAYLI TAHTALAR LİSTESİ ─── */}
        <Card className="modern-card border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-warning-soft text-warning p-2 rounded-circle">
                <i className="fas fa-chalkboard"></i>
              </span>
              <div>
                <h6 className="mb-0 fw-bold text-dark">Okulun Sınıf / Mekan Bazlı Etkileşimli Tahtaları ({detailedBoards.length})</h6>
                <small className="text-muted">Bu okulda kayıtlı fiziksel tahtaların konum, model ve çalışma durumu</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Link href="/tahtalar/ekle" className="btn btn-outline-primary btn-sm rounded-pill px-3">
                <i className="fas fa-plus me-1"></i>Yeni Tahta Ekle
              </Link>
            </div>
          </Card.Header>
          <div className="table-responsive">
            <Table hover className="align-middle mb-0" size="sm">
              <thead className="bg-light text-secondary small text-uppercase">
                <tr>
                  <th style={{ width: 40 }} className="text-center">#</th>
                  <th>Bina</th>
                  <th>Kat</th>
                  <th>Sınıf / Mekan</th>
                  <th>Model</th>
                  <th>Boyut / Yön</th>
                  <th>Durum</th>
                  <th>Çalışıyor Mu?</th>
                </tr>
              </thead>
              <tbody>
                {detailedBoards.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted small">
                      <i className="fas fa-chalkboard fa-2x mb-2 text-secondary d-block"></i>
                      Bu kuruma ait kat/sınıf bazında tekil tahta kaydı henüz girilmemiş.
                    </td>
                  </tr>
                ) : (
                  detailedBoards.map((b, idx) => (
                    <tr key={b.id || idx}>
                      <td className="text-center text-muted small">{idx + 1}</td>
                      <td><strong>{b.bina || 'Ana Bina'}</strong></td>
                      <td>{b.kat || '-'}</td>
                      <td className="fw-semibold text-primary">{b.sinif_lab || '-'}</td>
                      <td>
                        <Badge bg="light" className="text-dark border">{b.et_tipi || '-'}</Badge>
                      </td>
                      <td>{b.et_boyutu || b.et_yonu || '-'}</td>
                      <td>
                        <Badge bg={b.et_durumu === 'Fazlalık' ? 'warning' : 'success'}>
                          {b.et_durumu || 'Kullanımda'}
                        </Badge>
                      </td>
                      <td>
                        {b.calisiyor_mu !== false ? (
                          <Badge bg="success-soft" className="text-success"><i className="fas fa-check me-1"></i>Çalışıyor</Badge>
                        ) : (
                          <Badge bg="danger-soft" className="text-danger"><i className="fas fa-wrench me-1"></i>Arızalı</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>

        {/* ─── 5. OKULUN ET İHTİYAÇLARI (VARSA) ─── */}
        {boardNeeds.length > 0 && (
          <Card className="modern-card border-0 shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-clipboard-question text-danger"></i>
                <h6 className="mb-0 fw-bold text-dark">Bildirilen ET İhtiyaç Talepleri ({boardNeeds.length})</h6>
              </div>
              <Link href="/tahtalar/ihtiyac" className="btn btn-outline-warning btn-sm rounded-pill px-3">
                İhtiyaç Yönetimi
              </Link>
            </Card.Header>
            <div className="table-responsive">
              <Table hover className="align-middle mb-0" size="sm">
                <thead className="bg-light text-secondary small text-uppercase">
                  <tr>
                    <th>Bina / Kat</th>
                    <th>Sınıf / Mekan</th>
                    <th>İstenen Boyut & Yön</th>
                    <th>Durum</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {boardNeeds.map((need) => (
                    <tr key={need.id}>
                      <td>{need.bina || 'Ana Bina'} / {need.kat || '-'}</td>
                      <td className="fw-bold text-dark">{need.sinif_lab}</td>
                      <td><Badge bg="info">{need.et_boyutu || need.et_yonu || '-'}</Badge></td>
                      <td>
                        <Badge bg={need.durum === 'Karşılandı' ? 'success' : 'warning'}>
                          {need.durum || 'Beklemede'}
                        </Badge>
                      </td>
                      <td className="small text-muted">{need.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </Container>
  );
}
