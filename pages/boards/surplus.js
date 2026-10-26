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

const MODEL_OPTIONS = [
  { key: 'Vestel Siyah', label: 'Vestel Siyah' },
  { key: 'Vestel Gri', label: 'Vestel Gri' },
  { key: 'Arçelik', label: 'Arçelik' },
  { key: 'Aidata', label: 'Aidata' }
];

export default function BoardSurplusPage() {
  const [districts, setDistricts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [surplusBoards, setSurplusBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  
  // ─── Form State'leri ───
  const [formDistrictId, setFormDistrictId] = useState('');
  const [formInstitutionId, setFormInstitutionId] = useState('');
  const [formBina, setFormBina] = useState('Ana Bina');
  const [formKat, setFormKat] = useState('');
  const [formSinifLab, setFormSinifLab] = useState('');
  const [formEtTipi, setFormEtTipi] = useState('Vestel Siyah');
  const [formBoyutYon, setFormBoyutYon] = useState('Sol 3.40');
  const [formCalisiyorMu, setFormCalisiyorMu] = useState('true'); // 'true' veya 'false'
  const [formAciklama, setFormAciklama] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFormCollapse, setShowFormCollapse] = useState(true);

  // ─── Tablo Filtreleme State'leri ───
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterModel, setFilterModel] = useState('Tümü');
  const [filterCalisiyor, setFilterCalisiyor] = useState('Tümü');
  const [filterBoyutYon, setFilterBoyutYon] = useState('Tümü');

  // ─── Modal / Pop-Up State'leri ───
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        .select('id, name, code, district_id, vestel_black_boards, vestel_grey_boards, arcelik_boards, aidata_boards')
        .order('name', { ascending: true });
      if (iData) setInstitutions(iData);
    }
    fetchDistrictsAndInstitutions();
  }, []);

  // 2. Fazlalık Tahta Kayıtlarını Çek
  const fetchSurplusBoards = useCallback(async () => {
    setLoadingBoards(true);
    const { data, error } = await supabase
      .from('et_detay')
      .select('*')
      .eq('et_durumu', 'Fazlalık')
      .order('id', { ascending: false });
    if (!error) {
      setSurplusBoards(data || []);
    }
    setLoadingBoards(false);
  }, []);

  useEffect(() => {
    fetchSurplusBoards();
  }, [fetchSurplusBoards]);

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

  // Okul seçildiğinde ilçeyi de otomatik eşle
  const handleInstitutionSelect = (instId) => {
    setFormInstitutionId(instId);
    if (instId) {
      const found = institutions.find(i => String(i.id) === String(instId));
      if (found && found.district_id) {
        setFormDistrictId(String(found.district_id));
      }
    }
  };

  // İstatistiksel Özetler
  const stats = useMemo(() => {
    const total = surplusBoards.length;
    const calisan = surplusBoards.filter(b => b.calisiyor_mu !== false).length;
    const arizali = surplusBoards.filter(b => b.calisiyor_mu === false).length;
    const uniqueSchools = new Set(surplusBoards.map(b => b.institution_id)).size;
    return { total, calisan, arizali, uniqueSchools };
  }, [surplusBoards]);

  // Filtrelenmiş Liste
  const filteredSurplusBoards = useMemo(() => {
    return surplusBoards.filter(item => {
      const inst = getInstitutionObj(item.institution_id);
      
      // Kelime Arama (Okul adı, kodu, sınıf veya açıklama)
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const instMatch = (inst?.name || '').toLowerCase().includes(q) || (inst?.code || '').toLowerCase().includes(q);
        const sinifMatch = (item.sinif_lab || '').toLowerCase().includes(q);
        const aciklamaMatch = (item.aciklama || '').toLowerCase().includes(q);
        if (!instMatch && !sinifMatch && !aciklamaMatch) return false;
      }
      
      // İlçe Filtresi
      if (filterDistrict) {
        if (String(inst?.district_id) !== String(filterDistrict)) return false;
      }
      
      // Model / Tip Filtresi
      if (filterModel !== 'Tümü') {
        if (item.et_tipi !== filterModel) return false;
      }

      // Çalışıyor mu Filtresi
      if (filterCalisiyor !== 'Tümü') {
        const isWorking = item.calisiyor_mu !== false;
        if (filterCalisiyor === 'Evet' && !isWorking) return false;
        if (filterCalisiyor === 'Hayır' && isWorking) return false;
      }

      // Boyut / Yön Filtresi
      if (filterBoyutYon !== 'Tümü') {
        if (item.et_boyutu !== filterBoyutYon) return false;
      }
      
      return true;
    });
  }, [surplusBoards, getInstitutionObj, filterSearch, filterDistrict, filterModel, filterCalisiyor, filterBoyutYon]);

  // ─── 1. Butona Basıldığında Doğrulama ve Onay Pop-up'ı Başlatma ───
  const handleInitiateSave = () => {
    if (!formInstitutionId) {
      setValidationMessage('Lütfen önce fazlalık etkileşimli tahtanın bulunduğu Okulu seçiniz.');
      setShowValidationModal(true);
      return;
    }
    if (!formSinifLab.trim()) {
      setValidationMessage('Lütfen tahtanın şu an bulunduğu Sınıf / Konum bilgisini giriniz (Örn: 11/A, Eski BT Sınıfı, Depo).');
      setShowValidationModal(true);
      return;
    }
    if (!formEtTipi) {
      setValidationMessage('Lütfen tahtanın modelini / tipini (Vestel, Arçelik, Aidata vb.) seçiniz.');
      setShowValidationModal(true);
      return;
    }

    // Doğrulamalar başarılı -> Onay modalını aç
    setShowConfirmModal(true);
  };

  // ─── 2. Onay Modalı Onaylandığında DB Kaydetme & Müdahaleler ───
  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);

    try {
      const selectedInst = institutions.find(i => String(i.id) === String(formInstitutionId));

      const payload = {
        institution_id: parseInt(formInstitutionId, 10),
        bina: formBina || 'Ana Bina',
        kat: formKat || '',
        sinif_lab: formSinifLab.trim(),
        et_tipi: formEtTipi,
        et_yonu: formBoyutYon.startsWith('Sol') ? 'Sol' : 'Sağ',
        et_boyutu: formBoyutYon,
        et_durumu: 'Fazlalık',
        calisiyor_mu: formCalisiyorMu === 'true',
        aciklama: formAciklama.trim() || null
      };

      // 1. et_detay tablosuna fazlalık tahta kaydı ekle
      const { error: insertErr } = await supabase.from('et_detay').insert([payload]);
      if (insertErr) throw insertErr;

      // 2. Okulun ilgili tahta sayacını (eğer gerekiyorsa) kurum_kayit tablosunda artır/güncelle
      const dbTypeMap = {
        'Vestel Siyah': 'vestel_black_boards',
        'Vestel Gri': 'vestel_grey_boards',
        'Arçelik': 'arcelik_boards',
        'Aidata': 'aidata_boards'
      };
      const dbField = dbTypeMap[formEtTipi];
      if (selectedInst && dbField) {
        const currentCount = parseInt(selectedInst[dbField] || 0, 10);
        const updateData = { [dbField]: currentCount + 1 };
        await supabase.from('kurum_kayit').update(updateData).eq('id', selectedInst.id);
      }

      // Başarı detayını ayarla
      setSuccessDetails({
        schoolName: selectedInst?.name || 'Okul',
        code: selectedInst?.code || '-',
        district: getDistrictName(selectedInst?.district_id),
        sinifLab: payload.sinif_lab,
        tipi: payload.et_tipi,
        boyutYon: payload.et_boyutu,
        calisiyorMu: payload.calisiyor_mu
      });

      // Form alanlarını temizle
      setFormSinifLab('');
      setFormKat('');
      setFormAciklama('');

      // Listeyi anında yenile
      fetchSurplusBoards();

      // Başarı modalını göster
      setShowSuccessModal(true);
    } catch (err) {
      setValidationMessage('Kayıt oluşturulurken veritabanı hatası meydana geldi: ' + err.message);
      setShowValidationModal(true);
    } finally {
      setSaving(false);
    }
  };

  // ─── Fazlalık Tahta Kaydını Silme ───
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('et_detay').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchSurplusBoards();
    } catch (err) {
      alert('Silme sırasında hata oluştu: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Durumu "Kullanımda" Olarak Güncelleme (Havuzdan Çıkarıp Okulda Aktif Etme) ───
  const handleReturnToActive = async (boardId) => {
    const { error } = await supabase
      .from('et_detay')
      .update({ et_durumu: 'Kullanımda' })
      .eq('id', boardId);
    if (!error) {
      fetchSurplusBoards();
    } else {
      alert('Güncelleme hatası: ' + error.message);
    }
  };

  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="rounded-3 bg-info-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
            <i className="fas fa-boxes-stacked text-info"></i>
          </span>
          <div>
            <h4 className="fw-bold mb-0 text-dark">Fazlalık ET Ekle & Havuz Yönetimi</h4>
            <span className="text-muted small">Okullarda atıl, derslik fazlası veya devredilebilir durumdaki akıllı tahta kayıt havuzu</span>
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
            <span>{showFormCollapse ? 'Formu Gizle' : 'Yeni Fazlalık ET Ekle'}</span>
          </Button>
          <Link href="/tahtalar/transfer" className="btn btn-success-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-arrows-split-up-and-left"></i>
            <span>Transfer Sayfasına Git</span>
          </Link>
          <Link href="/tahtalar/ihtiyac" className="btn btn-warning-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-clipboard-question"></i>
            <span>İhtiyaç Listesi</span>
          </Link>
        </div>
      </div>

      {/* ─── ÜST KPI KARTLARI (ÖZET GÖRSELLEŞTİRME) ─── */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Toplam Fazlalık</span>
              <div className="kpi-icon-box bg-info-soft">
                <i className="fas fa-cubes text-info"></i>
              </div>
            </div>
            <div className="kpi-value text-dark">{stats.total}</div>
            <div className="kpi-footer text-muted">
              <span>Havuzdaki Tahta Sayısı</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Çalışır Durumda</span>
              <div className="kpi-icon-box bg-success-soft">
                <i className="fas fa-circle-check text-success"></i>
              </div>
            </div>
            <div className="kpi-value text-success">{stats.calisan}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-success-subtle text-success">Nakle Hazır</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Arızalı / Bakım</span>
              <div className="kpi-icon-box bg-danger-soft">
                <i className="fas fa-wrench text-danger"></i>
              </div>
            </div>
            <div className="kpi-value text-danger">{stats.arizali}</div>
            <div className="kpi-footer text-muted">
              <span className="badge bg-danger-subtle text-danger">Onarım Gerekiyor</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Kurum Sayısı</span>
              <div className="kpi-icon-box bg-primary-soft">
                <i className="fas fa-school text-primary"></i>
              </div>
            </div>
            <div className="kpi-value text-primary">{stats.uniqueSchools}</div>
            <div className="kpi-footer text-muted">
              <span>Fazlalık Bildiren Okul</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── YENİ FAZLALIK ET EKLEME FORMU KARTI ─── */}
      {showFormCollapse && (
        <div className="form-section-card mb-5">
          <div className="form-section-header">
            <div className="d-flex align-items-center gap-2">
              <span className="section-icon-badge bg-info-soft">
                <i className="fas fa-plus text-info"></i>
              </span>
              <div>
                <div className="section-title">Fazlalık ET Ekle</div>
                <div className="text-muted small">İlçe, okul, okul kodu, bina, kat, sınıf, yön, boyut ve çalışır durum bilgileri</div>
              </div>
            </div>
            <span className="badge-pill badge-pill-info">Yeni Havuz Kaydı</span>
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
                      <i className="fas fa-map-marker-alt me-2 text-muted"></i>Bulunduğu İlçe
                    </label>
                  </Form.Floating>
                </Col>

                {/* 2. Okul Seçimi */}
                <Col md={5}>
                  <Form.Floating>
                    <Form.Select
                      id="formInstitutionId"
                      value={formInstitutionId}
                      onChange={e => handleInstitutionSelect(e.target.value)}
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
                          {inst.name} [{getDistrictName(inst.district_id)}]
                        </option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formInstitutionId">
                      <i className="fas fa-school me-2 text-primary"></i>Bulunduğu Okul *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 3. Okul Kodu (Otomatik Dolu / Bilgi) */}
                <Col md={3}>
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      id="formCode"
                      placeholder="Okul Kodu"
                      value={selectedFormInst?.code || ''}
                      readOnly
                      className="bg-light font-monospace fw-bold text-secondary"
                    >
                    </Form.Control>
                    <label htmlFor="formCode">
                      <i className="fas fa-fingerprint me-2 text-muted"></i>Okul Kodu
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
                      <option value="Pansiyon / Yemekhane">Pansiyon / Yemekhane</option>
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

                {/* 6. Bulunduğu Sınıf / Konum */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      id="formSinifLab"
                      placeholder="Örn: 11/A, Eski BT Sınıfı, Depo"
                      value={formSinifLab}
                      onChange={e => setFormSinifLab(e.target.value)}
                      required
                    />
                    <label htmlFor="formSinifLab">
                      <i className="fas fa-chalkboard-user me-2 text-muted"></i>Sınıf / Konum *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 7. ET Modeli / Tipi */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formEtTipi"
                      value={formEtTipi}
                      onChange={e => setFormEtTipi(e.target.value)}
                      required
                    >
                      {MODEL_OPTIONS.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formEtTipi">
                      <i className="fas fa-tv me-2 text-muted"></i>ET Modeli / Tipi *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 8. ET Yönü & Boyutu */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formBoyutYon"
                      value={formBoyutYon}
                      onChange={e => setFormBoyutYon(e.target.value)}
                    >
                      {BOYUT_YON_OPTIONS.map(bo => (
                        <option key={bo} value={bo}>{bo}</option>
                      ))}
                    </Form.Select>
                    <label htmlFor="formBoyutYon">
                      <i className="fas fa-expand me-2 text-muted"></i>ET Yönü & Boyutu *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 9. Çalışıyor mu? */}
                <Col md={4}>
                  <Form.Floating>
                    <Form.Select
                      id="formCalisiyorMu"
                      value={formCalisiyorMu}
                      onChange={e => setFormCalisiyorMu(e.target.value)}
                    >
                      <option value="true">Evet (Çalışır Durumda / Sağlam)</option>
                      <option value="false">Hayır (Arızalı / Bakım Gerekiyor)</option>
                    </Form.Select>
                    <label htmlFor="formCalisiyorMu">
                      <i className="fas fa-power-off me-2 text-muted"></i>Çalışıyor mu? *
                    </label>
                  </Form.Floating>
                </Col>

                {/* 10. Açıklama / Not */}
                <Col md={12}>
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      id="formAciklama"
                      placeholder="Neden fazlalık olduğu, arıza veya durum notu..."
                      value={formAciklama}
                      onChange={e => setFormAciklama(e.target.value)}
                    />
                    <label htmlFor="formAciklama">
                      <i className="fas fa-note-sticky me-2 text-muted"></i>Açıklama / Durum Notu (İsteğe Bağlı)
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
                      <i className="fas fa-plus-circle"></i>
                      <span>Fazlalık ET'yi Havuza Ekle</span>
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* ─── ALT BÖLÜM: FAZLALIK ET'LERİ LİSTELEME VE SÜZME TABLOSU ─── */}
      <div className="form-section-card mb-5">
        <div className="form-section-header flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="section-icon-badge bg-info-soft">
              <i className="fas fa-cubes text-info"></i>
            </span>
            <div>
              <div className="section-title">Havuzdaki Fazlalık Etkileşimli Tahtalar Listesi</div>
              <div className="text-muted small">İl genelinde ihtiyaç fazlası olarak kayıtlı ve nakle hazır tahtalar</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge-pill badge-pill-info">
              {filteredSurplusBoards.length} / {surplusBoards.length} Tahta
            </span>
          </div>
        </div>

        {/* Filtreleme Çubuğu */}
        <div className="p-3 bg-light border-bottom">
          <Row className="g-2 align-items-center">
            {/* 1. Kelime Arama */}
            <Col xs={12} md={3}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0">
                  <i className="fas fa-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Okul adı, kod, sınıf ara..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>

            {/* 2. İlçe Filtresi */}
            <Col xs={6} md={2}>
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

            {/* 3. Model Filtresi */}
            <Col xs={6} md={2}>
              <Form.Select
                size="sm"
                value={filterModel}
                onChange={e => setFilterModel(e.target.value)}
              >
                <option value="Tümü">Tüm Modeller</option>
                {MODEL_OPTIONS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </Form.Select>
            </Col>

            {/* 4. Çalışıyor mu Filtresi */}
            <Col xs={6} md={2}>
              <Form.Select
                size="sm"
                value={filterCalisiyor}
                onChange={e => setFilterCalisiyor(e.target.value)}
              >
                <option value="Tümü">Çalışma: Tümü</option>
                <option value="Evet">Sadece Çalışanlar</option>
                <option value="Hayır">Arızalı / Bakım</option>
              </Form.Select>
            </Col>

            {/* 5. Yön & Boyut Filtresi */}
            <Col xs={6} md={2}>
              <Form.Select
                size="sm"
                value={filterBoyutYon}
                onChange={e => setFilterBoyutYon(e.target.value)}
              >
                <option value="Tümü">Tüm Ebatlar</option>
                {BOYUT_YON_OPTIONS.map(bo => (
                  <option key={bo} value={bo}>{bo}</option>
                ))}
              </Form.Select>
            </Col>

            {/* 6. Sıfırla / Yenile */}
            <Col xs={12} md={1} className="d-flex justify-content-end">
              {(filterSearch || filterDistrict || filterModel !== 'Tümü' || filterCalisiyor !== 'Tümü' || filterBoyutYon !== 'Tümü') ? (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => { setFilterSearch(''); setFilterDistrict(''); setFilterModel('Tümü'); setFilterCalisiyor('Tümü'); setFilterBoyutYon('Tümü'); }}
                  className="rounded-pill w-100"
                  title="Filtreleri Sıfırla"
                >
                  <i className="fas fa-rotate-left"></i>
                </Button>
              ) : (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={fetchSurplusBoards}
                  className="rounded-pill w-100"
                  title="Yenile"
                >
                  <i className="fas fa-arrows-rotate"></i>
                </Button>
              )}
            </Col>
          </Row>
        </div>

        {/* Tablo Alanı */}
        <div className="p-0">
          {loadingBoards ? (
            <div className="text-center py-5">
              <Spinner animation="border" size="sm" className="me-2 text-info" />
              <span className="text-muted">Fazlalık tahta kayıtları yükleniyor...</span>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{ minWidth: 260 }}>Bulunduğu İlçe & Okul</th>
                    <th style={{ minWidth: 160 }}>Bina / Kat / Sınıf</th>
                    <th style={{ minWidth: 140 }}>Tahta Modeli</th>
                    <th style={{ minWidth: 130 }}>Yön & Boyut</th>
                    <th style={{ minWidth: 130 }}>Çalışıyor mu?</th>
                    <th style={{ minWidth: 110 }}>Kayıt Tarihi</th>
                    <th style={{ minWidth: 150 }} className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurplusBoards.map(item => {
                    const inst = getInstitutionObj(item.institution_id);
                    const isWorking = item.calisiyor_mu !== false;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-dark">
                              {inst ? inst.name : `Kurum ID: ${item.institution_id}`}
                            </span>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <span className="badge bg-light text-muted border small">
                                {getDistrictName(inst?.district_id)}
                              </span>
                              {inst?.code && (
                                <span className="text-muted small font-monospace">#{inst.code}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-bold text-dark">{item.sinif_lab || 'Derslik Belirtilmedi'}</span>
                          <div className="small text-muted mt-1">
                            {item.bina || 'Ana Bina'} {item.kat ? `(${item.kat})` : ''}
                          </div>
                          {item.aciklama && (
                            <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: 200 }} title={item.aciklama}>
                              <i className="fas fa-info-circle me-1"></i>{item.aciklama}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">
                            {item.et_tipi}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-primary-soft text-primary border border-primary-subtle font-monospace fw-semibold px-2 py-1">
                            {item.et_boyutu || 'Sol 3.40'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-pill ${isWorking ? 'badge-pill-success' : 'badge-pill-danger'}`}>
                            <i className={`fas fa-${isWorking ? 'check' : 'xmark'} me-1`}></i>
                            {isWorking ? 'Çalışıyor' : 'Arızalı / Bakım'}
                          </span>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '-'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex align-items-center gap-1">
                            {/* Doğrudan Bu Tahtayı Transfer Et */}
                            <Link
                              href="/tahtalar/transfer"
                              className="btn btn-outline-success btn-sm rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1"
                              title="Bu Tahta İçin Transfer Başlat"
                            >
                              <i className="fas fa-arrows-split-up-and-left fa-sm"></i>
                              <span className="small">Transfer Et</span>
                            </Link>

                            {/* Geri Kullanıma Al */}
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="Havuzdan Çıkar (Okulda Kullanıma Al)"
                              onClick={() => handleReturnToActive(item.id)}
                            >
                              <i className="fas fa-rotate-left fa-sm"></i>
                            </Button>

                            {/* Silme Butonu */}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="Tahtayı Havuzdan Sil"
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
                  {filteredSurplusBoards.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <i className="fas fa-cubes fa-3x text-muted mb-3 opacity-50"></i>
                          <h6 className="fw-bold mb-1">Fazlalık Tahta Bulunamadı</h6>
                          <p className="small text-muted mb-0">
                            {filterSearch || filterDistrict || filterModel !== 'Tümü' || filterCalisiyor !== 'Tümü' || filterBoyutYon !== 'Tümü'
                              ? 'Arama kriterlerinize uygun fazlalık etkileşimli tahta bulunamadı.'
                              : 'Havuzda henüz fazlalık olarak kayıtlı tahta bulunmuyor. Yukarıdaki formdan yeni fazlalık tahta ekleyebilirsiniz.'}
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
      {/* ─── POP-UP 2: FAZLALIK ET ONAY MODALI (EMİN MİSİNİZ?) ─── */}
      {/* ============================================================ */}
      <Modal show={showConfirmModal} onHide={() => !saving && setShowConfirmModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-info text-white border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-boxes-stacked fa-lg"></i>
              <h5 className="modal-title fw-bold mb-0">Fazlalık ET Havuzuna Ekleme Onayı</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" disabled={saving} onClick={() => setShowConfirmModal(false)}></button>
          </div>
          <div className="modal-body p-4">
            <div className="text-center mb-3">
              <div className="avatar-mini mx-auto mb-2 bg-info-soft text-info" style={{ width: 60, height: 60, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-cubes"></i>
              </div>
              <h6 className="fw-bold text-dark mb-1">Tahtayı Havuza Eklemek İstiyor musunuz?</h6>
              <p className="text-muted small mb-0">Bu tahta diğer okulların transfer edebilmesi için "Fazlalık Havuzu"na eklenecektir:</p>
            </div>

            <Card className="border shadow-none rounded-3 mb-3 bg-light">
              <Card.Body className="p-3">
                <div className="mb-2">
                  <div className="small text-muted fw-bold text-uppercase">Bulunduğu Okul:</div>
                  <div className="fw-bold text-dark">{selectedFormInst?.name}</div>
                  <div className="small text-muted">İlçe: {getDistrictName(selectedFormInst?.district_id)} | Okul Kodu: <strong>{selectedFormInst?.code || '-'}</strong></div>
                </div>
                <hr className="my-2" />
                <div className="row g-2 small">
                  <div className="col-6">
                    <span className="text-muted">Konum:</span> <strong className="text-dark">{formBina} ({formKat || 'Kat Belirtilmedi'}) - {formSinifLab}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Model:</span> <strong className="text-primary">{formEtTipi}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Yön & Boyut:</span> <strong className="font-monospace text-dark">{formBoyutYon}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Çalışma Durumu:</span> <strong>{formCalisiyorMu === 'true' ? 'Evet (Çalışıyor)' : 'Hayır (Arızalı)'}</strong>
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
                  <span>Havuza Ekleniyor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  <span>Evet, Havuza Ekle</span>
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
            <h5 className="fw-bold mb-2 text-dark">Fazlalık Tahta Havuza Eklendi</h5>
            <p className="text-muted small mb-3">
              <strong>{successDetails?.schoolName}</strong> (Kod: {successDetails?.code}) okulundaki <strong>{successDetails?.tipi}</strong> ({successDetails?.boyutYon}) tahtası fazlalık havuzuna kaydedilmiştir. Artık diğer okullara transfer edilebilir.
            </p>
            <div className="p-3 bg-light rounded-3 border text-start small">
              <div className="text-muted mb-1">
                <strong>Konum:</strong> {successDetails?.sinifLab} ({successDetails?.district})
              </div>
              <div className="text-muted">
                <strong>Durum:</strong> <span className="badge bg-info-subtle text-info">Fazlalık Havuzunda</span>
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
              <h5 className="modal-title fw-bold mb-0">Fazlalık Tahtayı Sil</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
          </div>
          <div className="modal-body p-4 text-center">
            <p className="mb-2">
              <strong>{getInstitutionObj(itemToDelete?.institution_id)?.name}</strong> okulundaki <strong>{itemToDelete?.et_tipi}</strong> ({itemToDelete?.sinif_lab || 'Konum Belirtilmemiş'}) tahtasını havuzdan silmek istediğinize emin misiniz?
            </p>
            <p className="text-muted small mb-0">Bu işlem tahtayı kalıcı olarak veritabanından silecektir.</p>
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
