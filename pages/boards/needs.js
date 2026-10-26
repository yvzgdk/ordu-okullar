import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Table, Badge, InputGroup, Modal } from 'react-bootstrap';

const KAT_OPTIONS = [
  'ZEMİN', 'GİRİŞ', 
  '1.KAT', '2.KAT', '3.KAT', '4.KAT', '5.KAT',
  '1.KAT A', '1.KAT B', '2.KAT A', '2.KAT B', 
  '3.KAT A', '3.KAT B', '4.KAT A', '4.KAT B', 
  '5.KAT A', '5.KAT B', 'BODRUM'
];

const BOYUT_YON_OPTIONS = ['Sol 3.40', 'Sağ 3.40', 'Sol 2.60', 'Sağ 2.60'];

export default function BoardNeedsPage() {
  const [districts, setDistricts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  
  // Form State'leri
  const [formDistrictId, setFormDistrictId] = useState('');
  const [formInstitutionId, setFormInstitutionId] = useState('');
  const [formSinifLab, setFormSinifLab] = useState('');
  const [formBina, setFormBina] = useState('Ana Bina');
  const [formKat, setFormKat] = useState('');
  const [formEtBoyutu, setFormEtBoyutu] = useState('Sol 3.40');
  const [formDurum, setFormDurum] = useState('Beklemede');
  const [formAciklama, setFormAciklama] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Tablo Filtreleme State'leri
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterDurum, setFilterDurum] = useState('Tümü');
  
  // Modal / Pop-Up State'leri
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFormCollapse, setShowFormCollapse] = useState(true);

  // 1. İlçeler ve Kurumları Çek
  useEffect(() => {
    async function fetchDistrictsAndInstitutions() {
      const { data: dData } = await supabase
        .from('districts')
        .select('id, name')
        .order('name', { ascending: true });
      if (dData) setDistricts(dData);

      const { data: iData } = await supabase
        .from('kurum_kayit')
        .select('id, name, code, district_id')
        .order('name', { ascending: true });
      if (iData) setInstitutions(iData);
    }
    fetchDistrictsAndInstitutions();
  }, []);

  // 2. İhtiyaç Verilerini Çek
  const fetchNeeds = useCallback(async () => {
    setLoadingNeeds(true);
    const { data, error } = await supabase
      .from('et_ihtiyac')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) {
      setNeeds(data || []);
    }
    setLoadingNeeds(false);
  }, []);

  useEffect(() => {
    fetchNeeds();
  }, [fetchNeeds]);

  // Yardımcı fonksiyonlar
  const getInstitutionObj = useCallback((id) => {
    return institutions.find(i => String(i.id) === String(id));
  }, [institutions]);

  const getDistrictName = useCallback((districtId) => {
    const d = districts.find(item => String(item.id) === String(districtId));
    return d ? d.name : '-';
  }, [districts]);

  // Forma bağlı dinamik kurum listesi (seçilen ilçeye göre)
  const availableFormInstitutions = useMemo(() => {
    if (!formDistrictId) return institutions;
    return institutions.filter(i => String(i.district_id) === String(formDistrictId));
  }, [institutions, formDistrictId]);

  // Seçilen form kurumu
  const selectedFormInst = useMemo(() => {
    return institutions.find(i => String(i.id) === String(formInstitutionId));
  }, [institutions, formInstitutionId]);

  // İstatistiksel Özetler
  const stats = useMemo(() => {
    const total = needs.length;
    const beklemede = needs.filter(n => n.durum === 'Beklemede' || !n.durum).length;
    const karsilandi = needs.filter(n => n.durum === 'Karşılandı').length;
    const acil = needs.filter(n => n.durum === 'Acil').length;
    const uniqueSchools = new Set(needs.map(n => n.institution_id)).size;
    return { total, beklemede, karsilandi, acil, uniqueSchools };
  }, [needs]);

  // Filtrelenmiş Liste
  const filteredNeeds = useMemo(() => {
    return needs.filter(item => {
      const inst = getInstitutionObj(item.institution_id);
      
      // Kelime Arama
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const instMatch = (inst?.name || '').toLowerCase().includes(q) || (inst?.code || '').toLowerCase().includes(q);
        const sinifMatch = (item.sinif_lab || '').toLowerCase().includes(q);
        const aciklamaMatch = (item.aciklama || '').toLowerCase().includes(q);
        if (!instMatch && !sinifMatch && !aciklamaMatch) return false;
      }
      
      // İlçe Filtresi
      if (filterDistrict) {
        if (String(item.district_id || inst?.district_id) !== String(filterDistrict)) return false;
      }
      
      // Durum Filtresi
      if (filterDurum !== 'Tümü') {
        if (item.durum !== filterDurum) return false;
      }
      
      return true;
    });
  }, [needs, getInstitutionObj, filterSearch, filterDistrict, filterDurum]);

  // ─── 1. Butona Basıldığında Doğrulama ve Onay Pop-up'ı Başlatma ───
  const handleInitiateSave = () => {
    if (!formInstitutionId) {
      setValidationMessage('Lütfen önce etkileşimli tahta ihtiyacı olan Okulu seçiniz.');
      setShowValidationModal(true);
      return;
    }
    if (!formSinifLab.trim()) {
      setValidationMessage('Lütfen ihtiyacı olan Sınıf / Laboratuvar bilgisini giriniz (Örn: 9/A, Bilişim Lab).');
      setShowValidationModal(true);
      return;
    }

    // Doğrulamalar başarılı -> Onay modalını aç
    setShowConfirmModal(true);
  };

  // ─── 2. Onay Modalı Onaylandığında Kesin Kaydetme ───
  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);

    try {
      const selectedInst = institutions.find(i => String(i.id) === String(formInstitutionId));
      const districtId = formDistrictId || selectedInst?.district_id || null;

      const payload = {
        district_id: districtId,
        institution_id: parseInt(formInstitutionId, 10),
        bina: formBina || 'Ana Bina',
        kat: formKat || '',
        sinif_lab: formSinifLab.trim(),
        et_yonu: formEtBoyutu.startsWith('Sol') ? 'Sol' : 'Sağ',
        et_boyutu: formEtBoyutu || 'Sol 3.40',
        durum: formDurum || 'Beklemede',
        aciklama: formAciklama.trim() || null
      };

      const { error } = await supabase.from('et_ihtiyac').insert([payload]);
      if (error) throw error;

      // Başarı detayını ayarla
      setSuccessDetails({
        schoolName: selectedInst?.name || 'Okul',
        sinifLab: payload.sinif_lab,
        boyut: payload.et_boyutu,
        bina: payload.bina,
        kat: payload.kat || 'Belirtilmedi'
      });

      // Form alanlarını temizle
      setFormSinifLab('');
      setFormKat('');
      setFormAciklama('');

      // Listeyi anında yenile
      fetchNeeds();

      // Başarı modalını göster
      setShowSuccessModal(true);
    } catch (err) {
      setValidationMessage('Kayıt oluşturulurken veritabanı hatası oluştu: ' + err.message);
      setShowValidationModal(true);
    } finally {
      setSaving(false);
    }
  };

  // ─── Durum Güncelleme (Hızlıca Karşılandı Yap) ───
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('et_ihtiyac')
      .update({ durum: newStatus })
      .eq('id', id);
    if (!error) {
      fetchNeeds();
    } else {
      alert('Güncelleme hatası: ' + error.message);
    }
  };

  // ─── İhtiyaç Kaydını Silme ───
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('et_ihtiyac').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchNeeds();
    } catch (err) {
      alert('Silme sırasında hata oluştu: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="rounded-3 bg-warning-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
            <i className="fas fa-clipboard-question text-warning"></i>
          </span>
          <div>
            <h4 className="fw-bold mb-0 text-dark">ET İhtiyaç Yönetimi & Talepler</h4>
            <span className="text-muted small">İl genelinde etkileşimli tahta ihtiyacı olan derslik ve okulların talep havuzu</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button 
            variant={showFormCollapse ? "primary" : "outline-primary"}
            size="sm" 
            className="rounded-pill px-3 d-inline-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowFormCollapse(!showFormCollapse)}
          >
            <i className={`fas fa-${showFormCollapse ? 'minus' : 'plus'}`}></i>
            <span>{showFormCollapse ? 'Formu Gizle' : 'Yeni İhtiyaç Talebi Ekle'}</span>
          </Button>
          <Link href="/tahtalar/fazlalik" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-boxes-stacked"></i>
            <span>ET Fazlalık Havuzu</span>
          </Link>
          <Link href="/tahtalar/transfer" className="btn btn-success-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-arrows-split-up-and-left"></i>
            <span>Tahta Transferi</span>
          </Link>
        </div>
      </div>

      {/* ─── ÜST KPI KARTLARI (ÖZET GÖRSELLEŞTİRME) ─── */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Toplam İhtiyaç</span>
              <div className="kpi-icon-box bg-warning-soft">
                <i className="fas fa-chalkboard"></i>
              </div>
            </div>
            <div className="kpi-value text-dark">{stats.total}</div>
            <div className="kpi-footer text-muted">
              <span>Kayıtlı Derslik Talebi</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Bekleyen Talepler</span>
              <div className="kpi-icon-box bg-warning-soft">
                <i className="fas fa-clock text-warning"></i>
              </div>
            </div>
            <div className="kpi-value text-warning">{stats.beklemede}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-warning-subtle text-warning">Temin Bekliyor</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Acil Talepler</span>
              <div className="kpi-icon-box bg-danger-soft">
                <i className="fas fa-triangle-exclamation text-danger"></i>
              </div>
            </div>
            <div className="kpi-value text-danger">{stats.acil}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-danger-subtle text-danger">Öncelikli</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Karşılanan</span>
              <div className="kpi-icon-box bg-success-soft">
                <i className="fas fa-circle-check text-success"></i>
              </div>
            </div>
            <div className="kpi-value text-success">{stats.karsilandi}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-success-subtle text-success">Transfer Yapıldı</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── YENİ İHTİYAÇ GİRİŞ FORMU KARTI ─── */}
      {showFormCollapse && (
        <div className="form-section-card mb-5">
          <div className="form-section-header">
            <div className="d-flex align-items-center gap-2">
              <span className="section-icon-badge bg-primary-soft">
                <i className="fas fa-plus text-primary"></i>
              </span>
              <div>
                <div className="section-title">Yeni Etkileşimli Tahta İhtiyaç Talebi Girişi</div>
                <div className="text-muted small">İhtiyacı olan okul, sınıf, tahta yönü ve boyutu bilgilerini giriniz</div>
              </div>
            </div>
            <span className="badge-pill badge-pill-info">Talep Formu</span>
          </div>

          <div className="p-4">
            <Form onSubmit={e => { e.preventDefault(); handleInitiateSave(); }}>
              <Row className="g-3">
                {/* 1. İlçe Seçimi */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formDistrictId"
                      value={formDistrictId}
                      onChange={e => {
                        setFormDistrictId(e.target.value);
                        setFormInstitutionId('');
                      }}
                    >
                      <option value="">Tüm İlçeler (19 İlçe)</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formDistrictId">
                      <i className="fas fa-map-marker-alt me-2 text-muted"></i>İlçe Seçimi
                    </label>
                  </Form.Floating>
                </Col>

                {/* 2. Kurum Seçimi */}
                <Col md={8}>
                  <Form.Floating>
                    <Form.Select
                      id="formInstitutionId"
                      value={formInstitutionId}
                      onChange={e => setFormInstitutionId(e.target.value)}
                      required
                      className={formInstitutionId ? 'border-primary fw-semibold' : ''}
                    >
                      <option value="">
                        {formDistrictId 
                          ? `-- ${getDistrictName(formDistrictId)} İlçesindeki Okulu Seçiniz (${availableFormInstitutions.length} Okul) --` 
                          : `-- Okul Seçiniz (${availableFormInstitutions.length} Okul) --`}
                      </option>
                      {availableFormInstitutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} {inst.code ? `(Kod: ${inst.code})` : ''} - [{getDistrictName(inst.district_id)}]
                        </option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formInstitutionId">
                      <i className="fas fa-school me-2 text-primary"></i>İhtiyacı Olan Okul *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 3. İhtiyacı Olan Sınıf / Laboratuvar */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      id="formSinifLab"
                      placeholder="Örn: 9/A, Bilişim Lab, Fen Lab"
                      value={formSinifLab}
                      onChange={e => setFormSinifLab(e.target.value)}
                      required
                    />
                    <label htmlFor="formSinifLab">
                      <i className="fas fa-chalkboard-user me-2 text-muted"></i>İhtiyacı Olan Sınıf / Derslik *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 4. Bina */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formBina"
                      value={formBina}
                      onChange={e => setFormBina(e.target.value)}
                    >
                      <option value="Ana Bina">Ana Bina</option>
                      <option value="Ek Bina">Ek Bina</option>
                      <option value="Atölye Binası">Atölye Binası</option>
                    </Form.Select>
                    <label htmlFor="formBina">
                      <i className="fas fa-building me-2 text-muted"></i>Bina
                    </label>
                  </Form.Floating>
                </Col>

                {/* 5. Kat */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formKat"
                      value={formKat}
                      onChange={e => setFormKat(e.target.value)}
                    >
                      <option value="">Kat Seçiniz (İsteğe Bağlı)</option>
                      {KAT_OPTIONS.map(ko => (
                        <option key={ko} value={ko}>{ko}</option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formKat">
                      <i className="fas fa-stairs me-2 text-muted"></i>Kat
                    </label>
                  </Form.Floating>
                </Col>

                {/* 6. Tahta Boyutu & Yönü */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formEtBoyutu"
                      value={formEtBoyutu}
                      onChange={e => setFormEtBoyutu(e.target.value)}
                    >
                      {BOYUT_YON_OPTIONS.map(bo => (
                        <option key={bo} value={bo}>{bo}</option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formEtBoyutu">
                      <i className="fas fa-expand me-2 text-muted"></i>Tahta Yönü & Boyutu
                    </label>
                  </Form.Floating>
                </Col>

                {/* 7. Öncelik / Talep Durumu */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formDurum"
                      value={formDurum}
                      onChange={e => setFormDurum(e.target.value)}
                    >
                      <option value="Beklemede">Normal (Beklemede)</option>
                      <option value="Acil">Acil Öncelikli</option>
                      <option value="İncelemede">İlçe İncelemesinde</option>
                    </Form.Select>
                    <label htmlFor="formDurum">
                      <i className="fas fa-flag me-2 text-muted"></i>Talep Önceliği
                    </label>
                  </Form.Floating>
                </Col>

                {/* 8. Açıklama / Gerekçe */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      id="formAciklama"
                      placeholder="Gerekçe veya ek not..."
                      value={formAciklama}
                      onChange={e => setFormAciklama(e.target.value)}
                    />
                    <label htmlFor="formAciklama">
                      <i className="fas fa-note-sticky me-2 text-muted"></i>Açıklama / Not
                    </label>
                  </Form.Floating>
                </Col>
              </Row>

              <div className="d-flex align-items-center justify-content-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleInitiateSave}
                  disabled={saving}
                  className="rounded-pill px-5 shadow fw-semibold d-inline-flex align-items-center gap-2"
                  style={{ height: 48, fontSize: '1rem' }}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" animation="border" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      <span>İhtiyaç Talebini Kaydet</span>
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* ─── KAYITLI İHTİYAÇLAR LİSTESİ VE GELİŞMİŞ FİLTRELEME ─── */}
      <div className="form-section-card mb-5">
        <div className="form-section-header flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="section-icon-badge bg-warning-soft">
              <i className="fas fa-list text-warning"></i>
            </span>
            <div>
              <div className="section-title">Kayıtlı Etkileşimli Tahta İhtiyaçları Listesi</div>
              <div className="text-muted small">İl genelinde sisteme girilen tüm tahta ihtiyaçları ve durumları</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge-pill badge-pill-info">
              {filteredNeeds.length} / {needs.length} Kayıt
            </span>
          </div>
        </div>

        {/* Filtreleme Çubuğu */}
        <div className="p-3 bg-light border-bottom">
          <Row className="g-2 align-items-center">
            {/* 1. Kelime Arama */}
            <Col xs={12} md={4}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0">
                  <i className="fas fa-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Okul adı, kod, sınıf veya not ara..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>

            {/* 2. İlçe Filtresi */}
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={filterDistrict}
                onChange={e => setFilterDistrict(e.target.value)}
              >
                <option value="">Tüm İlçeler (19 İlçe)</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Form.Select>
            </Col>

            {/* 3. Durum Filtresi */}
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={filterDurum}
                onChange={e => setFilterDurum(e.target.value)}
              >
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Beklemede">Beklemede (Temin Edilecek)</option>
                <option value="Acil">Acil</option>
                <option value="İncelemede">İncelemede</option>
                <option value="Karşılandı">Karşılandı (Tamamlandı)</option>
              </Form.Select>
            </Col>

            {/* 4. Sıfırla / Yenile */}
            <Col xs={12} md={2} className="d-flex justify-content-end">
              {(filterSearch || filterDistrict || filterDurum !== 'Tümü') ? (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => { setFilterSearch(''); setFilterDistrict(''); setFilterDurum('Tümü'); }}
                  className="rounded-pill w-100"
                >
                  <i className="fas fa-rotate-left me-1"></i>Filtreleri Sıfırla
                </Button>
              ) : (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={fetchNeeds}
                  className="rounded-pill w-100"
                >
                  <i className="fas fa-arrows-rotate me-1"></i>Yenile
                </Button>
              )}
            </Col>
          </Row>
        </div>

        {/* Tablo Alanı */}
        <div className="p-0">
          {loadingNeeds ? (
            <div className="text-center py-5">
              <Spinner animation="border" size="sm" className="me-2 text-warning" />
              <span className="text-muted">İhtiyaç kayıtları yükleniyor...</span>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{ minWidth: 260 }}>İlçe & Kurum Adı</th>
                    <th style={{ minWidth: 160 }}>İhtiyaç Duyulan Sınıf</th>
                    <th style={{ minWidth: 140 }}>Bina & Kat</th>
                    <th style={{ minWidth: 140 }}>Tahta Yönü / Boyutu</th>
                    <th style={{ minWidth: 120 }}>Durum</th>
                    <th style={{ minWidth: 110 }}>Kayıt Tarihi</th>
                    <th style={{ minWidth: 140 }} className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNeeds.map(item => {
                    const inst = getInstitutionObj(item.institution_id);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-dark">
                              {inst ? inst.name : `Kurum ID: ${item.institution_id}`}
                            </span>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <span className="badge bg-light text-muted border small">
                                {getDistrictName(item.district_id || inst?.district_id)}
                              </span>
                              {inst?.code && (
                                <span className="text-muted small font-monospace">#{inst.code}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-bold text-primary">{item.sinif_lab}</span>
                          {item.aciklama && (
                            <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: 220 }} title={item.aciklama}>
                              <i className="fas fa-info-circle me-1"></i>{item.aciklama}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="text-dark small fw-semibold">{item.bina || 'Ana Bina'}</span>
                          <span className="text-muted small ms-1">({item.kat || '-'})</span>
                        </td>
                        <td>
                          <span className="badge bg-primary-soft text-primary border border-primary-subtle font-monospace fw-semibold px-2 py-1">
                            {item.et_boyutu || 'Sol 3.40'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-pill ${
                            item.durum === 'Karşılandı' ? 'badge-pill-success' :
                            item.durum === 'Acil' ? 'badge-pill-danger' :
                            item.durum === 'İncelemede' ? 'badge-pill-info' : 'badge-pill-warning'
                          }`}>
                            {item.durum || 'Beklemede'}
                          </span>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {new Date(item.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex align-items-center gap-1">
                            {/* Hızlı Karşılandı Yap veya Beklemeye Al */}
                            {item.durum !== 'Karşılandı' ? (
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                                style={{ width: 32, height: 32 }}
                                title="İhtiyacı Karşılandı Olarak İşaretle"
                                onClick={() => handleStatusChange(item.id, 'Karşılandı')}
                              >
                                <i className="fas fa-check fa-sm"></i>
                              </Button>
                            ) : (
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                                style={{ width: 32, height: 32 }}
                                title="Beklemeye Geri Al"
                                onClick={() => handleStatusChange(item.id, 'Beklemede')}
                              >
                                <i className="fas fa-rotate-left fa-sm"></i>
                              </Button>
                            )}

                            {/* Doğrudan Bu Okula Transfer Başlat */}
                            <Link
                              href="/tahtalar/transfer"
                              className="btn btn-outline-primary btn-sm rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="Bu Okula Tahta Transferi Yap"
                            >
                              <i className="fas fa-arrows-split-up-and-left fa-sm"></i>
                            </Link>

                            {/* Silme Butonu */}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="Talebi Sil"
                              onClick={() => {
                                setItemToDelete(item);
                                setShowDeleteModal(true);
                              }}
                            >
                              <i className="fas fa-trash-can fa-sm"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredNeeds.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <i className="fas fa-clipboard-check fa-3x text-muted mb-3 opacity-50"></i>
                          <h6 className="fw-bold mb-1">Kayıt Bulunamadı</h6>
                          <p className="small text-muted mb-0">
                            {filterSearch || filterDistrict || filterDurum !== 'Tümü'
                              ? 'Arama kriterlerinize uygun ihtiyaç talebi bulunamadı.'
                              : 'Henüz kayıtlı bir akıllı tahta ihtiyaç talebi bulunmuyor. Yukarıdaki formdan yeni talep ekleyebilirsiniz.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ─── POP-UP 1: EKSİK ALAN / DOĞRULAMA UYARI MODALI ─── */}
      {/* ============================================================ */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-warning text-dark border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-triangle-exclamation fa-lg text-dark"></i>
              <h5 className="modal-title fw-bold mb-0">Eksik Bilgi Uyarısı</h5>
            </div>
            <button type="button" className="btn-close" onClick={() => setShowValidationModal(false)}></button>
          </div>
          <div className="modal-body p-4 text-center">
            <div className="avatar-mini mx-auto mb-3 bg-warning-soft text-warning" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-circle-exclamation"></i>
            </div>
            <h6 className="fw-bold mb-2 text-dark">Lütfen Alanı Doldurunuz</h6>
            <p className="text-muted mb-0">{validationMessage}</p>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-center">
            <Button variant="primary" className="rounded-pill px-4" onClick={() => setShowValidationModal(false)}>
              Tamam, Seçiyorum
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* ─── POP-UP 2: İŞLEMİ ONAYLIYOR MUSUNUZ? (EMİN MİSİNİZ?) ─── */}
      {/* ============================================================ */}
      <Modal show={showConfirmModal} onHide={() => !saving && setShowConfirmModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-primary text-white border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-question-circle fa-lg"></i>
              <h5 className="modal-title fw-bold mb-0">İhtiyaç Talebi Onayı</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" disabled={saving} onClick={() => setShowConfirmModal(false)}></button>
          </div>
          <div className="modal-body p-4">
            <div className="text-center mb-3">
              <div className="avatar-mini mx-auto mb-2 bg-primary-soft text-primary" style={{ width: 60, height: 60, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-clipboard-question"></i>
              </div>
              <h6 className="fw-bold text-dark mb-1">Talebi Onaylıyor musunuz?</h6>
              <p className="text-muted small mb-0">Aşağıdaki ihtiyaç talebi sisteme kaydedilecek ve takip listesine eklenecektir:</p>
            </div>

            <Card className="border shadow-none rounded-3 mb-3 bg-light">
              <Card.Body className="p-3">
                <div className="mb-2">
                  <div className="small text-muted fw-bold text-uppercase">Okul Bilgisi:</div>
                  <div className="fw-bold text-dark">{selectedFormInst?.name}</div>
                  <div className="small text-muted">İlçe: {getDistrictName(selectedFormInst?.district_id)} | Kod: {selectedFormInst?.code || '-'}</div>
                </div>
                <hr className="my-2" />
                <div className="row g-2 small">
                  <div className="col-6">
                    <span className="text-muted">Sınıf/Derslik:</span> <strong className="text-primary">{formSinifLab}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Yön & Boyut:</span> <strong className="font-monospace text-dark">{formEtBoyutu}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Bina / Kat:</span> <strong>{formBina} ({formKat || 'Belirtilmedi'})</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Öncelik:</span> <strong>{formDurum}</strong>
                  </div>
                  {formAciklama && (
                    <div className="col-12 mt-1">
                      <span className="text-muted">Açıklama:</span> <em>"{formAciklama}"</em>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-end gap-2">
            <Button variant="secondary" className="rounded-pill px-4" disabled={saving} onClick={() => setShowConfirmModal(false)}>
              Vazgeç
            </Button>
            <Button 
              variant="primary" 
              className="rounded-pill px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
              disabled={saving}
              onClick={handleConfirmSave}
            >
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  <span>Evet, Talebi Kaydet</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* ─── POP-UP 3: İŞLEM TAMAMLANDI BAŞARI MODALI ─── */}
      {/* ============================================================ */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-success text-white border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-circle-check fa-lg"></i>
              <h5 className="modal-title fw-bold mb-0">İşlem Tamamlandı!</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={() => setShowSuccessModal(false)}></button>
          </div>
          <div className="modal-body p-4 text-center">
            <div className="avatar-mini mx-auto mb-3 bg-success-soft text-success" style={{ width: 72, height: 72, fontSize: '2.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-check"></i>
            </div>
            <h5 className="fw-bold mb-2 text-dark">İhtiyaç Talebi Başarıyla Oluşturuldu</h5>
            <p className="text-muted small mb-3">
              <strong>{successDetails?.schoolName}</strong> okulu, <strong>{successDetails?.sinifLab}</strong> dersliği için <strong>{successDetails?.boyut}</strong> ebatında ET ihtiyaç talebi sisteme işlendi.
            </p>
            <div className="p-3 bg-light rounded-3 border text-start small">
              <div className="text-muted mb-1">
                <strong>Yerleşim:</strong> {successDetails?.bina} - Kat: {successDetails?.kat}
              </div>
              <div className="text-muted">
                <strong>Durum:</strong> <span className="badge bg-warning-subtle text-warning">Beklemede</span>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-center">
            <Button variant="success" className="rounded-pill px-5 fw-bold shadow-sm" onClick={() => setShowSuccessModal(false)}>
              Tamam, Harika
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* ─── POP-UP 4: SİLME ONAY MODALI ─── */}
      {/* ============================================================ */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-danger text-white border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-trash-can fa-lg"></i>
              <h5 className="modal-title fw-bold mb-0">İhtiyaç Talebini Sil</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
          </div>
          <div className="modal-body p-4 text-center">
            <p className="mb-2">
              <strong>{getInstitutionObj(itemToDelete?.institution_id)?.name}</strong> okulu, <strong>{itemToDelete?.sinif_lab}</strong> dersliği için açılan ihtiyaç talebini silmek istediğinize emin misiniz?
            </p>
            <p className="text-muted small mb-0">Bu işlem geri alınamaz.</p>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-end gap-2">
            <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowDeleteModal(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" className="rounded-pill px-4 fw-semibold" disabled={deleteLoading} onClick={handleDelete}>
              {deleteLoading ? <Spinner size="sm" animation="border" /> : 'Evet, Sil'}
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
}
