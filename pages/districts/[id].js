// pages/districts/[id].js

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import {
  Container,
  Spinner,
  Table,
  Button,
  Form,
  Row,
  Col,
  Card,
} from 'react-bootstrap';
import useSWR, { mutate } from 'swr';

const fetcher = ([key, id]) => {
  if (key === 'institutions' && id) {
    return supabase.from('kurum_kayit').select('*').eq('district_id', parseInt(id, 10)).then(({ data }) => data || []);
  }
  if (key === 'district' && id) {
    return supabase.from('districts').select('id, name').eq('id', parseInt(id, 10)).single().then(({ data }) => data || null);
  }
  return null;
};

export default function DistrictDetail() {
  const router = useRouter();
  const { id } = router.query;

  // Ev sahibi ve misafir kurum seçimi için state'ler
  const [hostInstitution, setHostInstitution] = useState('');
  const [guestInstitution, setGuestInstitution] = useState('');

  // Filtreler
  const [filterName, setFilterName] = useState("");
  const [filterInternet, setFilterInternet] = useState("Tümü");
  const [filterInfra, setFilterInfra] = useState("Tümü");

  // DEBUG: id ve fetcher logu
  useEffect(() => {
    console.log('District page id:', id);
  }, [id]);

  const { data: district, error: districtError, isLoading: districtLoading } = useSWR(id ? ['district', id] : null, fetcher);
  const { data: institutionsData = [], error: institutionsError, isLoading: institutionsLoading, mutate: mutateInstitutions } = useSWR(id ? ['institutions', id] : null, fetcher);

  useEffect(() => {
    console.log('district:', district);
    console.log('institutionsData:', institutionsData);
    console.log('districtError:', districtError);
    console.log('institutionsError:', institutionsError);
  }, [district, institutionsData, districtError, institutionsError]);

  // Districts list for select
  const { data: districts = [] } = useSWR('districts', async (key) => {
    const { data } = await supabase.from('districts').select('id, name').order('name', { ascending: true });
    return data || [];
  });

  // Modern District Selection UI
  const selDistrict = id ? String(id) : 'Tümü';

  // ──────────── A) İlçe Adını Çekme ────────────
  // useEffect(() => {
  //   if (!id) return;
  //
  //   const fetchDistrict = async () => {
  //     setLoadingDistrict(true);
  //     const { data, error } = await supabase
  //       .from('districts')
  //       .select('name')
  //       .eq('id', id)
  //       .single();
  //
  //     if (error) {
  //       console.error('İlçe çekme hatası:', error);
  //       setDistrictName('Bilinmiyor');
  //     } else {
  //       setDistrictName(data?.name || 'Bilinmiyor');
  //     }
  //     setLoadingDistrict(false);
  //   };
  //
  //   fetchDistrict();
  // }, [id]);

  // ──────────── B) Kurum Verilerini Çekme ────────────
  // useEffect(() => {
  //   if (!id) return;
  //
  //   const fetchInstitutions = async () => {
  //     setLoadingInstitutions(true);
  //     const { data, error } = await supabase
  //       .from('institutions')
  //       .select(`
  //         id,
  //         code,
  //         name,
  //         address,
  //         internet_connection_type,
  //         infra_type,
  //         vestel_black_boards,
  //         vestel_grey_boards,
  //         arcelik_boards,
  //         aidata_boards
  //       `)
  //       .eq('district_id', id)
  //       .order('id', { ascending: true });
  //
  //     if (error) {
  //       console.error('Kurum çekme hatası:', error);
  //       setInstitutions([]);
  //     } else {
  //       setInstitutions(data || []);
  //     }
  //     setLoadingInstitutions(false);
  //   };
  //
  //   fetchInstitutions();
  // }, [id]);

  // ──────────── C) İstatistikleri Hesaplama (useMemo) ────────────
  const stats = useMemo(() => {
    const safeInstitutions = institutionsData || [];
    const result = {
      totalInstitutions: 0,
      totalBoards: 0,
      brands: {
        vestel_black: 0,
        vestel_grey: 0,
        arcelik: 0,
        aidata: 0,
      },
      infraCounts: {
        'Faz 1': 0,
        'Faz 2': 0,
        'Faz 3': 0,
        'Faz 1250': 0,
        'Sıva Altı': 0,
        'Kendi İmkanlarıyla': 0,
        'Yok': 0,
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
    result.totalInstitutions = safeInstitutions.length;
    let hostInfraCount = 0;
    let guestInfraCount = 0;
    safeInstitutions.forEach((inst) => {
      const vb = parseInt(inst.vestel_black_boards || 0, 10);
      const vg = parseInt(inst.vestel_grey_boards  || 0, 10);
      const ab = parseInt(inst.arcelik_boards      || 0, 10);
      const ad = parseInt(inst.aidata_boards       || 0, 10);
      result.brands.vestel_black += vb;
      result.brands.vestel_grey  += vg;
      result.brands.arcelik      += ab;
      result.brands.aidata       += ad;
      result.totalBoards += vb + vg + ab + ad;
      // Altyapı ve faz tipi (anasayfa ile aynı mantık)
      const faz = (inst.faz || '').trim().toLowerCase();
      const altyapi = (inst.altyapi || '').trim().toLowerCase();
      const infraType = (inst.infra_type || '').trim().toLowerCase();
      let infraKey = 'Yok';
      if (faz === 'faz 1') infraKey = 'Faz 1';
      else if (faz === 'faz 2') infraKey = 'Faz 2';
      else if (faz === 'faz 3') infraKey = 'Faz 3';
      else if (faz === 'faz 1250') infraKey = 'Faz 1250';
      else if (faz === 'faz 4') infraKey = 'Faz 4';
      else if (faz.startsWith('uyum')) infraKey = 'Uyumlaştırma';
      else if (altyapi.includes('sıva') || altyapi.includes('siva') || infraType.includes('sıva') || infraType.includes('siva')) infraKey = 'Sıva Altı';
      else if (altyapi.includes('kendi') || infraType.includes('kendi')) infraKey = 'Kendi İmkanlarıyla';
      // Anasayfa ile birebir aynı altyapı yok mantığı:
      if (infraKey === 'Yok') {
        if (!inst.related_institution_id || inst.related_institution_id === 0) {
          result.infraCounts[infraKey]++;
        }
      } else {
        result.infraCounts[infraKey]++;
      }
      // İnternet bağlantı tipi (anasayfa ile aynı mantık)
      const rawInternet = (inst.internet_connection_type || inst.internet_type || '').trim().toLowerCase();
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
      if (inst.status === 'ev_sahibi' && inst.infra_owner === 'misafir') guestInfraCount++;
    });
    result.hostInfraCount = hostInfraCount;
    result.guestInfraCount = guestInfraCount;
    return result;
  }, [institutionsData]);

  // ──────────── D) Filtrelenmiş Kurumlar (useMemo) ────────────
  const filteredInstitutions = useMemo(() => {
    const safeInstitutions = institutionsData || [];
    const noFilters =
      !filterName.trim() &&
      filterInternet === "Tümü" &&
      filterInfra === "Tümü";
    if (noFilters) return [];
    return safeInstitutions.filter((inst) => {
      // İsim filtresi
      const nameMatch = inst.name?.toLowerCase().includes(filterName.toLowerCase());
      // İnternet filtresi
      const internetMatch =
        filterInternet === "Tümü" ||
        (inst.internet_connection_type || "")
          .toLowerCase()
          .includes(filterInternet.toLowerCase());
      // Altyapı filtresi
      const instInfra = (inst.infra_type || inst.altyapi || "").trim().toLowerCase();
      const infraFilterLower = filterInfra.trim().toLowerCase();
      const infraMatch =
        filterInfra === "Tümü" ? true : instInfra === infraFilterLower;
      return nameMatch && internetMatch && infraMatch;
    });
  }, [institutionsData, filterName, filterInternet, filterInfra]);

  // SWR mutate ile kurumlar güncellensin (id veya refresh parametresi değişince)
  useEffect(() => {
    if (id) {
      mutateInstitutions();
    }
  }, [id]);

  useEffect(() => {
    if (router.query.refresh && id) {
      mutateInstitutions();
    }
  }, [router.query.refresh, id]);

  // Ev sahibi kurum seçildiğinde misafir kurum seçimini aktif et
  useEffect(() => {
    setGuestInstitution('');
  }, [hostInstitution]);

  // ──────────── E) Render ────────────
  return (
    <Container className="py-4">
      {/* Modern District Selection at the top */}
      <Card className="mb-4 shadow-lg border-0 bg-gradient" style={{background: 'linear-gradient(90deg, #e3f0ff 0%, #f6faff 100%)', borderRadius: '1.5rem'}}>
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap flex-md-nowrap">
          <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-gradient me-3" style={{width: 56, height: 56, minWidth: 56}}>
            <i className="fas fa-map-marked-alt fa-2x text-white"></i>
          </div>
          <div className="flex-grow-1">
            <Form.Group controlId="districtSelect" className="mb-0">
              <Form.Label className="fw-bold fs-5 text-primary mb-2">İlçe Seçimi</Form.Label>
              <Form.Select
                value={selDistrict}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  if (selectedValue === 'Tümü') {
                    router.push('/');
                  } else {
                    router.push(`/districts/${selectedValue}`);
                  }
                }}
                className="form-select-lg fw-bold border-0 shadow-sm px-4 py-3 rounded-pill bg-white text-primary"
                style={{fontSize: '1.15rem', minWidth: 220, maxWidth: 340, outline: 'none'}}
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
      {/* 1) Başlık */}
      {/*
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-primary mb-0">
          {districtLoading ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : districtError ? (
            <span className="text-danger">İlçe yüklenirken hata oluştu</span>
          ) : district && district.name ? (
            <>
              <i className="fas fa-map-marker-alt me-2"></i>
              {district.name} İlçesi
            </>
          ) : (
            <span className="text-muted">İlçe bulunamadı (id: {id})</span>
          )}
        </h1>
          <Button
            variant="primary"
            className="rounded-pill px-4"
            onClick={() => router.push('/')}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Anasayfaya Dön
          </Button>
        </div>
      */}
      {districtError && (
        <div className="alert alert-danger">District fetch error: {districtError.message}</div>
      )}
      {institutionsError && (
        <div className="alert alert-danger">Institutions fetch error: {institutionsError.message}</div>
      )}
      {institutionsLoading && (
        <div className="text-center my-4"><Spinner animation="border" /></div>
      )}

      {/* ─── Bilgi Kartları ─── */}
      {/* 1. Ana sayfadaki bilgi kartlarının ve görsel özelliklerinin aynısını district detay sayfasındaki bilgi kartlarına uygula. */}
        {/* KURUMLAR başlığı */}
      <Row className="g-4 mb-5">
        <Col xs={12}>
          <h5 style={{ color: 'red', fontWeight: 'bold', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-building"></i>
            KURUMLAR
          </h5>
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
      </Row>
        {/* TAHTA DURUMU başlığı */}
      <Row className="g-4 mb-5">
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
                {stats.brands.vestel_black}
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
                {stats.brands.vestel_grey}
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
                {stats.brands.arcelik}
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
                {stats.brands.aidata}
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
      <Row className="g-4 mb-5">
        <Col xs={12} md={4} lg={3}>
          <Card className="h-100 border-0 shadow-sm hover-card">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center">
              <div className="icon-circle bg-success mb-3">
                <i className="fas fa-network-wired text-white"></i>
              </div>
              <Card.Title className="text-success fw-bold">Faz 1</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Faz 1']}
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
              <Card.Title className="text-primary fw-bold">Faz 2</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Faz 2']}
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
              <Card.Title className="text-info fw-bold">Faz 3</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Faz 3']}
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
              <Card.Title className="text-warning fw-bold">Faz 1250</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Faz 1250']}
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
              <Card.Title className="fw-bold" style={{ color: '#8e24aa' }}>Faz 4</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Faz 4'] ?? 0}
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
              <Card.Title className="fw-bold" style={{ color: '#ff9800' }}>Sıva Altı</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Sıva Altı']}
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
              <Card.Title className="fw-bold" style={{ color: '#4caf50' }}>Kendi İmkanlarıyla</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Kendi İmkanlarıyla']}
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
              <Card.Title className="fw-bold" style={{ color: '#e53935' }}>Yok</Card.Title>
              <Card.Text className="display-4 fw-bold text-dark">
                {stats.infraCounts['Yok']}
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
                {stats.guestInfraCount}
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
              <div className="icon-circle bg-success mb-3">
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
