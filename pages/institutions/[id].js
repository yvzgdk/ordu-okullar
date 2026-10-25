// pages/institutions/[id].js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Button
} from 'react-bootstrap';

// jsPDF ve html2canvas importları
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function InstitutionDetailPage() {
  const router = useRouter();
  const { id } = router.query; // URL'den kurum ID'sini alıyoruz

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bu ref, PDF'e dönüştüreceğimiz HTML kısmını işaret eder
  const detailRef = useRef(null);

  // Print meta info (date, url) for print header
  const [printMeta, setPrintMeta] = useState({ date: '', url: '' });
  useEffect(() => {
    const now = new Date();
    setPrintMeta({
      date: now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      url: window.location.href
    });
  }, []);

  // Toplam tahta sayısını hesapla (tüm tahta tipleri için)
  const totalBoards =
    (institution?.vestel_black || institution?.vestel_black_boards || 0) +
    (institution?.vestel_grey || institution?.vestel_grey_boards || 0) +
    (institution?.arcelik || institution?.arcelik_boards || 0) +
    (institution?.aidata || institution?.aidata_boards || 0);

  // ─────────────────────────────────────────────────────────────────────
  // 1) Supabase'ten kurum detayını çek
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    async function fetchInstitution() {
      setLoading(true);
      console.log('Fetching institution with id:', id);
      // Kurum ve ilçe adını birlikte çek
      const { data: institutionData, error: institutionError } = await supabase
        .from('kurum_kayit')
        .select(`*, district:districts(name)`) // join ile district tablosundan adını çek
        .eq('id', id)
        .single();

      if (institutionError) {
        console.error('Kurum bilgisi çekilemedi:', institutionError);
        setInstitution(null);
        setLoading(false);
        return;
      }

      // Eğer kurum ev sahibi ise, misafir kurumları getir
      if (institutionData.status === 'ev_sahibi') {
        const { data: guestData } = await supabase
          .from('kurum_kayit')
          .select('id, name, code')
          .eq('related_institution_id', id);
        institutionData.guests = guestData || [];
      }
      // Eğer kurum misafir ise, ev sahibi kurumu getir
      else if (institutionData.status === 'misafir' && institutionData.related_institution_id) {
        const { data: hostData } = await supabase
          .from('kurum_kayit')
          .select('id, name, code')
          .eq('id', institutionData.related_institution_id)
          .single();
        institutionData.host = hostData;
      }

      // BTR kayıtlarını çek (YOS Bilgileri)
      const { data: btrData, error: btrError } = await supabase
        .from('btr_records')
        .select('*')
        .or(`institution_id.eq.${id},institution_id_2.eq.${id}`);
      
      if (btrError) {
        console.error('BTR bilgileri çekilemedi:', btrError);
      }
      institutionData.btr_records = btrData || [];

      // district nesnesinden adı al
      institutionData.district_name = institutionData.district?.name || '-';

      console.log('Fetched institution data:', institutionData);
      setInstitution(institutionData);
      setLoading(false);
    }

    fetchInstitution();
  }, [id]);

  // ─────────────────────────────────────────────────────────────────────
  // 2) "Yazdır" Butonu: window.print() kullanacak
  // ─────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────────────
  // 3) "PDF Olarak Kaydet" Butonu: html2canvas + jsPDF ile PDF oluşturacak
  // ─────────────────────────────────────────────────────────────────────
  const handleSaveAsPDF = async () => {
    if (!detailRef.current) return;

    // 1) detailRef.current içindeki HTML'ı canvas'a dönüştürüp
    // 2) jsPDF ile PDF oluşturacağız
    try {
      // html2canvas parametreleri: 
      // - useCORS: resim/ikonlar CORS sorununa takılmasın diye
      // - scale: PDF'de net görüntü için piksel ölçeğini biraz yükseltiyoruz
      const canvas = await html2canvas(detailRef.current, {
        useCORS: true,
        scale: 2
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Yüksekliği, en-boy oranını koruyacak şekilde ayarlıyoruz
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Birden fazla sayfa gerekirse (örneğin içerik A4'ten uzunsa) 
      // şu şekilde bölmek de mümkün, ama basit kurulumda tek sayfa yeterli olur:
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // PDF'i indir
      pdf.save(`${institution?.name || 'kurum'}_detay.pdf`);
    } catch (err) {
      console.error('PDF oluşturulurken hata:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // 4) Render kısmı
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Container className="py-4">
      <Row className="g-4">
        {/* Temel Bilgiler */}
        <Col md={6} lg={4}>
          <Card className="shadow h-100">
            <Card.Header className="bg-primary text-white fw-bold">Temel Bilgiler</Card.Header>
            <Card.Body>
              <div><b>İlçe:</b> {institution?.district_name || '-'}</div>
              <div><b>Kurum Kodu:</b> {institution?.code || '-'}</div>
              <div><b>Kurum Adı:</b> {institution?.name || '-'}</div>
              <div><b>Bina Derslik Sayısı:</b> {institution?.bds ?? '-'}</div>
              <div><b>Bina Durumu:</b> {institution?.status === 'ev_sahibi' ? 'Ev Sahibi' : institution?.status === 'misafir' ? 'Misafir' : '-'}</div>
              {institution?.status === 'misafir' && institution?.host && (
                <div><b>Ev Sahibi Kurum:</b> {`${institution.host.name || '-'}${institution.host.code ? ' - ' + institution.host.code : ''}`}</div>
              )}
              {institution?.status === 'ev_sahibi' && Array.isArray(institution?.guests) && (
                <div><b>Misafir Kurum:</b> {
                  institution.guests.length > 0
                    ? institution.guests.map(g => `${g.name} - ${g.code || ''}`).join(', ')
                    : 'Misafir kurum yok'
                }</div>
              )}
            </Card.Body>
          </Card>
        </Col>
        {/* Altyapı Bilgileri */}
        <Col md={6} lg={4}>
          <Card className="shadow h-100">
            <Card.Header className="bg-info text-white fw-bold">Altyapı Bilgileri</Card.Header>
            <Card.Body>
              <div><b>Altyapı:</b> {
                institution?.has_infrastructure !== undefined
                  ? (institution.has_infrastructure ? 'Var' : 'Yok')
                  : (typeof institution?.altyapi === 'string'
                      ? (institution.altyapi.trim().toLowerCase() === 'yok' || institution.altyapi.trim() === '' ? 'Yok' : 'Var')
                      : '-')
              }</div>
              <div><b>Altyapı Tipi:</b> {
                institution?.faz && institution.faz.trim().toLowerCase().startsWith('faz')
                  ? 'Fatih Projesi'
                  : (institution?.altyapi || '-')
              }</div>
              <div><b>Faz:</b> {institution?.faz || '-'}</div>
              <div><b>Fatih Projesi:</b> {institution?.is_fatih ? 'Evet' : 'Hayır'}</div>
              <div><b>İnternet Tipi:</b> {institution?.internet_type || '-'}</div>
            </Card.Body>
          </Card>
        </Col>
        {/* Ekipman Bilgileri */}
        <Col md={6} lg={4}>
          <Card className="shadow h-100">
            <Card.Header className="bg-warning text-white fw-bold">Ekipman Bilgileri</Card.Header>
            <Card.Body>
              <div><b>Toplam ET Sayısı:</b> {totalBoards}</div>
              <div><b>Vestel Siyah:</b> {institution?.vestel_black_boards || 0}</div>
              <div><b>Vestel Gri:</b> {institution?.vestel_grey_boards || 0}</div>
              <div><b>Arçelik:</b> {institution?.arcelik_boards || 0}</div>
              <div><b>Aidata:</b> {institution?.aidata_boards || 0}</div>
            </Card.Body>
          </Card>
        </Col>
        {/* LAB Bilgileri */}
        <Col md={6} lg={4}>
          <Card className="shadow h-100">
            <Card.Header className="bg-secondary text-white fw-bold">LAB Bilgileri</Card.Header>
            <Card.Body>
              <div><b>BT Sınıfı:</b> {institution?.has_bt_class ? 'Var' : 'Yok'}</div>
              {institution?.has_bt_class && (() => {
                let labs = [];
                if (typeof institution.bt_labs === 'string') {
                  try { labs = JSON.parse(institution.bt_labs); } catch(e){}
                } else if (Array.isArray(institution.bt_labs)) {
                  labs = institution.bt_labs;
                }
                
                if (labs.length === 0) return <div className="text-muted mt-2">Detay girilmemiş.</div>;
                
                const totalPc = labs.reduce((sum, l) => sum + (parseInt(l.pc_count, 10) || 0), 0);
                
                return (
                  <div className="mt-2">
                    <div><b>Toplam Lab:</b> {labs.length}</div>
                    <div><b>Toplam PC:</b> {totalPc}</div>
                    <hr className="my-2"/>
                    {labs.map((lab, i) => (
                      <div key={i} className="mb-2 p-2 bg-light rounded shadow-sm" style={{ fontSize: '0.9rem' }}>
                        <div><i className="fas fa-desktop text-secondary me-2"></i><b>Lab {i+1}</b></div>
                        <div><b>PC Sayısı:</b> {lab.pc_count || '-'}</div>
                        <div><b>Durum:</b> <span className="text-capitalize">{lab.lab_status || '-'}</span></div>
                        <div><b>Kaynak:</b> <span className="text-capitalize">{lab.lab_source || '-'}</span></div>
                        <div><b>Tahta:</b> <span className="text-capitalize">{lab.has_board || '-'}</span></div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card.Body>
          </Card>
        </Col>
        {/* YOS Bilgileri */}
        <Col md={6} lg={4}>
          <Card className="shadow h-100">
            <Card.Header className="bg-dark text-white fw-bold">YOS Bilgileri</Card.Header>
            <Card.Body>
              {institution?.btr_records && institution.btr_records.length > 0 ? (
                institution.btr_records.map((btr, i) => (
                  <div key={i} className={i > 0 ? 'mt-3 pt-3 border-top' : ''}>
                    <div><i className="fas fa-user-tie text-primary me-2"></i><b>{btr.name} {btr.surname}</b></div>
                    <div className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                      <div className="mb-1"><i className="fas fa-phone-alt me-2"></i>{btr.phone || '-'}</div>
                      <div className="mb-1"><i className="fas fa-envelope me-2"></i>{btr.email || '-'}</div>
                      <div>
                        <i className="fas fa-info-circle me-2"></i>
                        <span className={`badge ${btr.status === 'Aktif' ? 'bg-success' : 'bg-secondary'} px-2`}>
                          {btr.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted d-flex align-items-center justify-content-center h-100">
                  <span>Görevli öğretmen bulunamadı.</span>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        {/* İletişim Bilgileri */}
        <Col md={6} lg={4}>
          <Card className="shadow h-100">
            <Card.Header className="bg-success text-white fw-bold">İletişim</Card.Header>
            <Card.Body>
              <div><b>Yetkili:</b> {institution?.director || '-'}</div>
              <div><b>Telefon:</b> {institution?.director_phone || '-'}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

// Yardımcı fonksiyonlar
function getInternetBadgeColor(type) {
  if (!type) return 'secondary';
  type = type.toLowerCase();
  if (type.includes('fiber')) return 'success';
  if (type.includes('adsl')) return 'warning';
  if (type.includes('gsm')) return 'info';
  return 'secondary';
}

function getInfraBadgeColor(type) {
  if (!type) return 'secondary';
  type = type.toLowerCase();
  if (type.includes('faz 1')) return 'success';
  if (type.includes('faz 2')) return 'primary';
  if (type.includes('faz 3')) return 'info';
  if (type.includes('faz 4')) return 'warning';
  if (type.includes('sıva')) return 'dark';
  if (type.includes('kendi')) return 'secondary';
  return 'danger';
}
