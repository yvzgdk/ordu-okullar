// pages/index.js

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import {
  Container,
  Spinner,
  Row,
  Col,
  Card,
  Form,
  Table,
  Button,
  InputGroup,
} from 'react-bootstrap';
import useSWR, { mutate } from 'swr';
import BoardPhaseChart from '../components/BoardPhaseChart';

// SWR ve fetcher fonksiyonunu eski haline döndür:
const fetcher = async (key) => {
  if (key === 'institutions') {
    const { data } = await supabase.from('kurum_kayit').select('*');
    return data || [];
  }
  if (key === 'districts') {
    const { data } = await supabase.from('districts').select('id, name').order('name', { ascending: true });
    return data || [];
  }
  return null;
};

// 1. Add a placeholder context7mcp fetch function at the top (simulate DB fetch)
async function fetchGuestInfraCount() {
  // Simulate context7mcp DB fetch for 'Misafir Kurum Altyapısını Kullanan Ev Sahibi Kurum'
  // In real usage, replace with actual context7mcp fetch logic
  // Example: return await context7mcp.fetchGuestInfraCount();
  return null; // fallback to local calculation if not available
}

export default function Home() {
  const router = useRouter();

  // ─── 1) İlçeler ve Tüm Kurum Verilerini Çekme (SWR ile) ───
  const { data: districts = [] } = useSWR('districts', fetcher);
  const { data: institutions = [], mutate: mutateInstitutions } = useSWR('institutions', fetcher);

  // Add guestInfraCount state
  const [guestInfraCount, setGuestInfraCount] = useState(null);
  useEffect(() => {
    fetchGuestInfraCount().then((val) => {
      if (typeof val === 'number') setGuestInfraCount(val);
      else setGuestInfraCount(null);
    });
  }, []);

  // ─── 2) Seçilen İlçe ve Filtreler ───
  const [selDistrict, setSelDistrict] = useState('Tümü');
  const [filterName, setFilterName] = useState('');
  const [filterInternet, setFilterInternet] = useState('Tümü');
  const [filterInfra, setFilterInfra] = useState('Tümü');

  // ─── 3) Seçilen İlçeye Göre Filtrelenmiş Kurumlar ───
  const filteredByDistrict = useMemo(() => {
    if (selDistrict === 'Tümü') return institutions;
    const selectedDistrictId = parseInt(selDistrict, 10);
    return institutions.filter(
      (inst) => inst.district_id === selectedDistrictId
    );
  }, [institutions, selDistrict]);

  // ─── 4) Kartlarda Gösterilecek İstatistikleri Hesaplama ───
  const stats = useMemo(() => {
    const result = {
      totalDistricts: selDistrict === 'Tümü' ? districts.length : 1,
      totalInstitutions: 0,
      totalBoards: 0,
      brands: {
        'Vestel Siyah': 0,
        'Vestel Gri': 0,
        'Arçelik': 0,
        'Aidata': 0,
      },
      infraCounts: {
        'FAZ 1': 0,
        'FAZ 2': 0,
        'FAZ 3': 0,
        'FAZ 1250': 0,
        'FAZ 4': 0,
        'KENDİ': 0,
        'SIVA ALTI': 0,
        'YOK': 0,
      },
      internetCounts: {
        fiber: 0,
        adsl: 0,
        gsm: 0,
      },
      hostInstitutions: 0, // Ev sahibi kurum
      guestInstitutions: 0, // Misafir kurum
      hostInfraCount: 0,
    };

    // "filteredByDistrict" listesindeki kurumları say
    result.totalInstitutions = filteredByDistrict.length;

    let hostInfraCount = 0;
    filteredByDistrict.forEach((inst) => {
      // Marka bazlı tahtalar
      const vb = parseInt(inst.vestel_black_boards || 0, 10);
      const vg = parseInt(inst.vestel_grey_boards || 0, 10);
      const ab = parseInt(inst.arcelik_boards || 0, 10);
      const ad = parseInt(inst.aidata_boards || 0, 10);

      result.brands['Vestel Siyah'] += vb;
      result.brands['Vestel Gri'] += vg;
      result.brands['Arçelik'] += ab;
      result.brands['Aidata'] += ad;

      result.totalBoards += (inst.total_boards !== undefined ? parseInt(inst.total_boards, 10) : (vb + vg + ab + ad));

      // Altyapı ve faz tipi (sadece faz ve altyapi)
      const faz = (inst.faz || '').trim().toLowerCase();
      const altyapi = (inst.altyapi || '').trim().toLowerCase();
      let infraKey = 'YOK';
      if (faz === 'faz 1') infraKey = 'FAZ 1';
      else if (faz === 'faz 2') infraKey = 'FAZ 2';
      else if (faz === 'faz 3') infraKey = 'FAZ 3';
      else if (faz === 'faz 1250') infraKey = 'FAZ 1250';
      else if (faz === 'faz 4') infraKey = 'FAZ 4';
      else if (faz.startsWith('uyum')) infraKey = 'FAZ 4';
      else if (altyapi.includes('sıva') || altyapi.includes('siva')) infraKey = 'SIVA ALTI';
      else if (altyapi.includes('kendi')) infraKey = 'KENDİ';
      // SADECE 'Yok' için özel kontrol uygula, diğerleri için eski mantık
      if (infraKey === 'YOK') {
        if (!inst.related_institution_id || inst.related_institution_id === 0) {
          result.infraCounts[infraKey]++;
        }
      } else {
        result.infraCounts[infraKey]++;
      }

      // İnternet bağlantı tipi
      const rawInternet = (inst.internet_type || '')
        .trim()
        .toLowerCase();
      if (
        rawInternet.includes('fiber') ||
        rawInternet.includes('fatih') ||
        rawInternet.includes('vpn')
      ) {
        result.internetCounts.fiber++;
      }
      if (rawInternet.includes('adsl')) {
        result.internetCounts.adsl++;
      }
      if (rawInternet.includes('gsm')) {
        result.internetCounts.gsm++;
      }
      // Ev sahibi ve misafir kurum sayısı
      if (inst.status === 'ev_sahibi') result.hostInstitutions++;
      if (inst.status === 'misafir') result.guestInstitutions++;
      // Ev Sahibi Kurum Altyapısı Kullanan Misafir Kurum
      if (inst.status === 'misafir' && inst.infra_owner === 'ev_sahibi') hostInfraCount++;
    });
    result.hostInfraCount = hostInfraCount;

    // İstatistik hesaplamasında yeni kart için sayaç ekle
    let guestInfraCount = 0;
    filteredByDistrict.forEach((inst) => {
      // Ev Sahibi Kurum Altyapısı Kullanan Misafir Kurum
      if (inst.status === 'ev_sahibi' && inst.infra_owner === 'misafir') guestInfraCount++;
    });
    result.guestInfraCount = guestInfraCount;

    return result;
  }, [filteredByDistrict, districts.length, selDistrict]);

  // ─── 5) Kurum Filtreleme (İsim / İnternet / Altyapı) ───
  //     Ancak: Eğer kullanıcı henüz hiçbir filtre yazmadıysa => boş liste dön
  const displayedInstitutions = useMemo(() => {
    // Hiçbir filtre uygulanmadıysa (boş metin + "Tümü" seçili dropdown'lar) => []
    const noFilters =
      !filterName.trim() &&
      filterInternet === 'Tümü' &&
      filterInfra === 'Tümü';

    if (noFilters) {
      return [];
    }

    // Aksi halde, filteredByDistrict listesini filtrelemeye devam et
    return filteredByDistrict.filter((inst) => {
      // İsim filtresi
      const nameMatch = inst.name
        .toLowerCase()
        .includes(filterName.toLowerCase());

      // İnternet filtresi
      const internetMatch =
        filterInternet === 'Tümü' ||
        (inst.internet_type || '')
          .toLowerCase()
          .includes(filterInternet.toLowerCase());

      // Altyapı filtresi
      const instInfra = (inst.infrastructure || inst.altyapi || '').trim().toLowerCase();
      let infraMatch = false;
      if (filterInfra === 'Tümü') {
        infraMatch = true;
      } else if (filterInfra === 'KENDİ') {
        infraMatch = instInfra.includes('kendi');
      } else if (filterInfra === 'SIVA ALTI') {
        infraMatch = instInfra.includes('sıva') || instInfra.includes('siva');
      } else if (filterInfra === 'FAZ 4') {
        infraMatch = instInfra === 'faz 4' || instInfra.startsWith('uyum');
      } else {
        infraMatch = instInfra === filterInfra.toLowerCase();
      }

      return nameMatch && internetMatch && infraMatch;
    });
  }, [filteredByDistrict, filterName, filterInternet, filterInfra]);

  // ──────────── 6) Render (JSX) ────────────
  return (
    <Container className="py-4">
      <Card className="mb-4 shadow-lg border-0 bg-gradient" style={{ background: 'linear-gradient(90deg, #e3f0ff 0%, #f6faff 100%)', borderRadius: '1.5rem' }}>
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap flex-md-nowrap">
          <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-gradient me-3" style={{ width: 56, height: 56, minWidth: 56 }}>
            <i className="fas fa-map-marked-alt fa-2x text-white"></i>
          </div>
          <div className="flex-grow-1">
            <Form.Group controlId="selectDistrict" className="mb-0">
              <Form.Label className="fw-bold fs-5 text-primary mb-2">İlçe Seçimi</Form.Label>
              <Form.Select
                value={selDistrict}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  setSelDistrict(selectedValue);
                  setFilterName('');
                  setFilterInternet('Tümü');
                  setFilterInfra('Tümü');
                  if (selectedValue !== 'Tümü') {
                    router.push(`/districts/${selectedValue}`);
                  }
                }}
                className="form-select-lg"
                style={{ fontSize: '1.15rem', minWidth: 220, maxWidth: 340, outline: 'none' }}
                aria-label="İlçe Seçimi"
              >
                <option value="Tümü">Tüm İlçeler</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        </Card.Body>
      </Card>

      {/* ─── Grafikler ─── */}
      <Row className="g-4 mb-5">
        <Col md={6}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body>
              <h5 className="card-title text-center mb-3">Altyapı Dağılımı</h5>
              <BoardPhaseChart data={stats.infraCounts} type="doughnut" />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body>
              <h5 className="card-title text-center mb-3">ET Dağılımı</h5>
              <BoardPhaseChart data={stats.brands} type="bar" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ─── Bilgi Kartları ─── */}
      <Row className="g-4 mb-5">
        {/* KURUMLAR başlığı */}
        <Col xs={12}>
          <h5 style={{ color: 'red', fontWeight: 'bold', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-building"></i>
            KURUMLAR
          </h5>
        </Col>
        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-primary mb-3">
                <i className="fas fa-map-marker-alt text-white"></i>
              </div>
              <Card.Title className="text-primary fw-bold">
                {selDistrict === 'Tümü' ? 'Toplam İlçe' : 'Seçili İlçe'}
              </Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.totalDistricts}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-success mb-3">
                <i className="fas fa-school text-white"></i>
              </div>
              <Card.Title className="text-success fw-bold">Toplam Kurum</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.totalInstitutions}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-info mb-3">
                <i className="fas fa-user-shield text-white"></i>
              </div>
              <Card.Title className="text-info fw-bold">Ev Sahibi Kurum</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.hostInstitutions}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-warning mb-3">
                <i className="fas fa-user-friends text-white"></i>
              </div>
              <Card.Title className="text-warning fw-bold">Misafir Kurum</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.guestInstitutions}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12}>
          <h5 style={{ color: 'red', fontWeight: 'bold', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-chalkboard"></i>
            TAHTA DURUMU
          </h5>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-info mb-3">
                <i className="fas fa-chalkboard text-white"></i>
              </div>
              <Card.Title className="text-info fw-bold">Toplam Tahta</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.totalBoards}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-dark mb-3">
                <i className="fas fa-tv text-white"></i>
              </div>
              <Card.Title className="text-dark fw-bold">Vestel Siyah</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.brands['Vestel Siyah']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-secondary mb-3">
                <i className="fas fa-tv text-white"></i>
              </div>
              <Card.Title className="text-secondary fw-bold">Vestel Gri</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.brands['Vestel Gri']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-danger mb-3">
                <i className="fas fa-tv text-white"></i>
              </div>
              <Card.Title className="text-danger fw-bold">Arçelik</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.brands['Arçelik']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-warning mb-3">
                <i className="fas fa-tv text-white"></i>
              </div>
              <Card.Title className="text-warning fw-bold">Aidata</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.brands['Aidata']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* ALTYAPI DURUMU başlığı */}
      <Row>
        <Col xs={12}>
          <h5 style={{ color: 'red', fontWeight: 'bold', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-network-wired"></i>
            ALTYAPI DURUMU
          </h5>
        </Col>
      </Row>
      {/* Faz 1 ve sonrası kartlar yeni satırda */}
      <Row className="g-4 mb-5">
        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-success mb-3">
                <i className="fas fa-network-wired text-white"></i>
              </div>
              <Card.Title className="text-success fw-bold">FAZ 1</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['FAZ 1']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-primary mb-3">
                <i className="fas fa-network-wired text-white"></i>
              </div>
              <Card.Title className="text-primary fw-bold">FAZ 2</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['FAZ 2']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-info mb-3">
                <i className="fas fa-network-wired text-white"></i>
              </div>
              <Card.Title className="text-info fw-bold">FAZ 3</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['FAZ 3']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-warning mb-3">
                <i className="fas fa-network-wired text-white"></i>
              </div>
              <Card.Title className="text-warning fw-bold">FAZ 1250</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['FAZ 1250']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle mb-3" style={{ background: '#8e24aa' }}>
                <i className="fas fa-bolt text-white"></i>
              </div>
              <Card.Title className="fw-bold" style={{ color: '#8e24aa' }}>FAZ 4</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['FAZ 4'] ?? 0}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle mb-3" style={{ background: '#ff9800' }}>
                <i className="fas fa-tools text-white"></i>
              </div>
              <Card.Title className="fw-bold" style={{ color: '#ff9800' }}>SIVA ALTI</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['SIVA ALTI']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle mb-3" style={{ background: '#4caf50' }}>
                <i className="fas fa-hammer text-white"></i>
              </div>
              <Card.Title className="fw-bold" style={{ color: '#4caf50' }}>KENDİ</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['KENDİ']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle mb-3" style={{ background: '#e53935' }}>
                <i className="fas fa-times-circle text-white"></i>
              </div>
              <Card.Title className="fw-bold" style={{ color: '#e53935' }}>YOK</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['YOK']}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Ev Sahibi Kurum Altyapısı */}
        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle mb-3" style={{ background: '#43a047' }}>
                <i className="fas fa-home text-white"></i>
              </div>
              <Card.Title className="fw-bold" style={{ color: '#43a047' }}>Ev Sahibi Kurum Altyapısı Kullanan Misafir Kurum</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.hostInfraCount}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle mb-3" style={{ background: '#1976d2' }}>
                <i className="fas fa-random text-white"></i>
              </div>
              <Card.Title className="fw-bold" style={{ color: '#1976d2' }}>Misafir Kurum Altyapısını Kullanan Ev Sahibi Kurum</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {guestInfraCount !== null ? guestInfraCount : stats.guestInfraCount}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* İNTERNET DURUMU başlığı */}
      <Row>
        <Col xs={12}>
          <h5 style={{ color: 'red', fontWeight: 'bold', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-globe"></i>
            İNTERNET DURUMU
          </h5>
        </Col>
      </Row>
      {/* Fiber bağlantı ve sonrası kartlar yeni satırda */}
      <Row className="g-4 mb-5">
        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-primary mb-3">
                <i className="fas fa-globe text-white"></i>
              </div>
              <Card.Title className="text-primary fw-bold">Fatih VPN</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.internetCounts.fiber}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-warning mb-3">
                <i className="fas fa-broadcast-tower text-white"></i>
              </div>
              <Card.Title className="text-success fw-bold">MEB ADSL</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.internetCounts.adsl}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-info mb-3">
                <i className="fas fa-mobile-alt text-white"></i>
              </div>
              <Card.Title className="text-info fw-bold">GSM Bağlantı</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.internetCounts.gsm}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .hover-card {
          transition: transform 0.2s ease-in-out;
        }
        .hover-card:hover {
          transform: translateY(-5px);
        }
        .icon-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-circle i {
          font-size: 24px;
        }
      `}</style>
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
  if (type.includes('faz 1250')) return 'warning';
  if (type.includes('sıva')) return 'dark';
  if (type.includes('kendi')) return 'secondary';
  return 'danger';
}
