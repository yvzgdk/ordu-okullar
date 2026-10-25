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
    <Container fluid className="px-0">
      {/* ─── Hero / Bilgi ve Filtre Başlığı ─── */}
      <Card className="mb-4 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '1.25rem', color: '#fff' }}>
        <Card.Body className="p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 52, height: 52, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '1.4rem' }}>
              <i className="fas fa-layer-group"></i>
            </div>
            <div>
              <h4 className="fw-bold mb-1 text-white">Ordu Fatih Projesi Genel Durum Paneli</h4>
              <p className="text-white-50 mb-0 small">İl geneli okullar, akıllı tahtalar ve ağ altyapı istatistikleri</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-white-50 fw-semibold d-none d-sm-inline">İlçe Seçimi:</span>
            <Form.Select
              value={selDistrict}
              onChange={(e) => {
                const selectedValue = e.target.value;
                setSelDistrict(selectedValue);
                setFilterName('');
                setFilterInternet('Tümü');
                setFilterInfra('Tümü');
              }}
              className="form-select bg-dark text-white border-secondary rounded-pill px-3 py-2"
              style={{ minWidth: 220, fontSize: '0.92rem' }}
              aria-label="İlçe Seçimi"
            >
              <option value="Tümü">Tüm İlçeler (Ordu Geneli)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Form.Select>
          </div>
        </Card.Body>
      </Card>

      {/* ─── 1. KURUMLAR BÖLÜMÜ ─── */}
      <div className="section-header-modern">
        <div className="d-flex align-items-center gap-2">
          <div className="section-icon-badge bg-primary-soft">
            <i className="fas fa-school"></i>
          </div>
          <h5 className="section-title mb-0">Kurum & Okul İstatistikleri</h5>
        </div>
        <span className="text-muted small">{selDistrict === 'Tümü' ? 'Ordu Geneli' : districts.find(d => String(d.id) === String(selDistrict))?.name}</span>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">{selDistrict === 'Tümü' ? 'Toplam İlçe' : 'Seçili İlçe'}</span>
              <div className="kpi-icon-box bg-primary-soft">
                <i className="fas fa-map-marker-alt"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.totalDistricts}</div>
            <div className="kpi-footer">
              <i className="fas fa-check-circle text-success me-1"></i> Aktif İlçe
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Toplam Kurum</span>
              <div className="kpi-icon-box bg-success-soft">
                <i className="fas fa-building-columns"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.totalInstitutions}</div>
            <div className="kpi-footer">
              <i className="fas fa-school text-primary me-1"></i> Okul & Kurum Kayıtlı
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Ev Sahibi Kurum</span>
              <div className="kpi-icon-box bg-info-soft">
                <i className="fas fa-user-shield"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.hostInstitutions}</div>
            <div className="kpi-footer">
              <span className="badge bg-success-subtle text-success">Müstakil Bina</span>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Misafir Kurum</span>
              <div className="kpi-icon-box bg-warning-soft">
                <i className="fas fa-house-chimney-user"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.guestInstitutions}</div>
            <div className="kpi-footer">
              <span className="badge bg-warning-subtle text-warning">Ortak Bina</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── Grafikler ─── */}
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="h-100 shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-dark mb-0"><i className="fas fa-network-wired text-primary me-2"></i>Altyapı Dağılımı</h6>
                <span className="badge bg-light text-muted border">Yüzde Oranları</span>
              </div>
              <BoardPhaseChart data={stats.infraCounts} type="doughnut" />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100 shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-dark mb-0"><i className="fas fa-tv text-info me-2"></i>Etkileşimli Tahta Dağılımı</h6>
                <span className="badge bg-light text-muted border">Marka Sayıları</span>
              </div>
              <BoardPhaseChart data={stats.brands} type="bar" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ─── 2. TAHTA DURUMU BÖLÜMÜ ─── */}
      <div className="section-header-modern">
        <div className="d-flex align-items-center gap-2">
          <div className="section-icon-badge bg-info-soft">
            <i className="fas fa-chalkboard"></i>
          </div>
          <h5 className="section-title mb-0">Etkileşimli Tahta (ET) Dağılımı</h5>
        </div>
        <span className="text-muted small">Marka ve Model Sayıları</span>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Toplam Tahta</span>
              <div className="kpi-icon-box bg-info-soft">
                <i className="fas fa-chalkboard"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.totalBoards}</div>
            <div className="kpi-footer">
              <i className="fas fa-tv text-info me-1"></i> Tüm Markalar
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Vestel Siyah</span>
              <div className="kpi-icon-box bg-dark-soft">
                <i className="fas fa-tv"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.brands['Vestel Siyah']}</div>
            <div className="kpi-footer text-muted">Faz 1 & Faz 2</div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Vestel Gri</span>
              <div className="kpi-icon-box bg-dark-soft">
                <i className="fas fa-tv"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.brands['Vestel Gri']}</div>
            <div className="kpi-footer text-muted">Faz 2 Gri Kasa</div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Arçelik</span>
              <div className="kpi-icon-box bg-danger-soft">
                <i className="fas fa-tv"></i>
              </div>
            </div>
            <div className="kpi-value">{stats.brands['Arçelik']}</div>
            <div className="kpi-footer text-danger">Faz 3 Arçelik</div>
          </div>
        </Col>
      </Row>

      {/* ─── 3. ALTYAPI DURUMU ─── */}
      <div className="section-header-modern">
        <div className="d-flex align-items-center gap-2">
          <div className="section-icon-badge bg-success-soft">
            <i className="fas fa-network-wired"></i>
          </div>
          <h5 className="section-title mb-0">Ağ & Altyapı Fazları</h5>
        </div>
        <span className="text-muted small">Fatih Projesi Kapsamı</span>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={6} sm={4} lg={2}>
          <div className="modern-kpi-card text-center p-3 h-100">
            <div className="kpi-label mb-2">FAZ 1</div>
            <div className="kpi-value fs-2 text-success mb-0">{stats.infraCounts['FAZ 1']}</div>
            <div className="small text-muted mt-2">Okul</div>
          </div>
        </Col>
        <Col xs={6} sm={4} lg={2}>
          <div className="modern-kpi-card text-center p-3 h-100">
            <div className="kpi-label mb-2">FAZ 2</div>
            <div className="kpi-value fs-2 text-primary mb-0">{stats.infraCounts['FAZ 2']}</div>
            <div className="small text-muted mt-2">Okul</div>
          </div>
        </Col>
        <Col xs={6} sm={4} lg={2}>
          <div className="modern-kpi-card text-center p-3 h-100">
            <div className="kpi-label mb-2">FAZ 3</div>
            <div className="kpi-value fs-2 text-info mb-0">{stats.infraCounts['FAZ 3']}</div>
            <div className="small text-muted mt-2">Okul</div>
          </div>
        </Col>
        <Col xs={6} sm={4} lg={2}>
          <div className="modern-kpi-card text-center p-3 h-100">
            <div className="kpi-label mb-2">FAZ 1250</div>
            <div className="kpi-value fs-2 text-warning mb-0">{stats.infraCounts['FAZ 1250']}</div>
            <div className="small text-muted mt-2">Okul</div>
          </div>
        </Col>
        <Col xs={6} sm={4} lg={2}>
          <div className="modern-kpi-card text-center p-3 h-100">
            <div className="kpi-label mb-2" style={{ color: '#8e24aa' }}>FAZ 4</div>
            <div className="kpi-value fs-2 mb-0" style={{ color: '#8e24aa' }}>{stats.infraCounts['FAZ 4'] ?? 0}</div>
            <div className="small text-muted mt-2">Okul</div>
          </div>
        </Col>
        <Col xs={6} sm={4} lg={2}>
          <div className="modern-kpi-card text-center p-3 h-100">
            <div className="kpi-label mb-2 text-danger">YOK</div>
            <div className="kpi-value fs-2 text-danger mb-0">{stats.infraCounts['YOK'] ?? 0}</div>
            <div className="small text-muted mt-2">Okul</div>
          </div>
        </Col>
      </Row>

      {/* ─── 4. İNTERNET DURUMU ─── */}
      <div className="section-header-modern">
        <div className="d-flex align-items-center gap-2">
          <div className="section-icon-badge bg-warning-soft">
            <i className="fas fa-globe"></i>
          </div>
          <h5 className="section-title mb-0">İnternet Bağlantı Türleri</h5>
        </div>
        <span className="text-muted small">VPN & Genişbant Dağılımı</span>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={4}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Fatih VPN (Fiber)</span>
              <div className="kpi-icon-box bg-primary-soft">
                <i className="fas fa-globe"></i>
              </div>
            </div>
            <div className="kpi-value text-primary">{stats.internetCounts.fiber}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-primary-subtle text-primary">Fiber Altyapı</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={4}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">MEB ADSL / VDSL</span>
              <div className="kpi-icon-box bg-success-soft">
                <i className="fas fa-broadcast-tower"></i>
              </div>
            </div>
            <div className="kpi-value text-success">{stats.internetCounts.adsl}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-success-subtle text-success">Bakır Hat</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={4}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">GSM / LTE</span>
              <div className="kpi-icon-box bg-info-soft">
                <i className="fas fa-mobile-alt"></i>
              </div>
            </div>
            <div className="kpi-value text-info">{stats.internetCounts.gsm}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-info-subtle text-info">Mobil Şebeke</span>
            </div>
          </div>
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
  if (type.includes('faz 1250')) return 'warning';
  if (type.includes('sıva')) return 'dark';
  if (type.includes('kendi')) return 'secondary';
  return 'danger';
}
