import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Table, Badge, InputGroup, Modal, Spinner } from 'react-bootstrap';

// MEB Standart Öğretmenlik Branşları
const BRANS_LISTESI = [
  'Bilişim Teknolojileri',
  'Matematik',
  'Fen Bilimleri',
  'Sınıf Öğretmenliği',
  'İngilizce',
  'Türkçe',
  'Sosyal Bilgiler',
  'Türk Dili ve Edebiyatı',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Din Kültürü ve Ahlak Bilgisi',
  'Teknoloji ve Tasarım',
  'Görsel Sanatlar',
  'Müzik',
  'Beden Eğitimi',
  'Özel Eğitim',
  'Rehberlik / Psikolojik Danışmanlık',
  'Okul Öncesi',
  'Diğer'
];

export default function YosAdd() {
  const router = useRouter();

  // ─── Veri State'leri ───
  const [districts, setDistricts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [existingRecords, setExistingRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // ─── Form State'leri ───
  const [formDistrictId, setFormDistrictId] = useState('');
  const [formInstitutionId, setFormInstitutionId] = useState('');
  const [formInstitutionId2, setFormInstitutionId2] = useState('');
  const [formName, setFormName] = useState('');
  const [formSurname, setFormSurname] = useState('');
  const [formBransSelect, setFormBransSelect] = useState('Bilişim Teknolojileri');
  const [formCustomBrans, setFormCustomBrans] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAssignmentDate, setFormAssignmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState('Aktif');
  const [saving, setSaving] = useState(false);
  const [showFormCollapse, setShowFormCollapse] = useState(true);

  // ─── Alt Tablo Filtreleme State'leri ───
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterBrans, setFilterBrans] = useState('Tümü');
  const [filterStatus, setFilterStatus] = useState('Tümü');

  // ─── Modal / Pop-Up State'leri ───
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessages, setValidationMessages] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedYosInfo, setSavedYosInfo] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 1. İlçeleri ve Kurumları Çek
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

  // 2. YOS / BTR Kayıtlarını Çek
  const fetchYosRecords = useCallback(async () => {
    setLoadingRecords(true);
    const { data, error } = await supabase
      .from('btr_records')
      .select(`
        *,
        districts!btr_records_district_id_fkey(name),
        kurum1:kurum_kayit!btr_records_institution_id_fkey(id, name, code),
        kurum2:kurum_kayit!btr_records_institution_id_2_fkey(id, name, code)
      `)
      .order('id', { ascending: false });

    if (!error) {
      setExistingRecords(data || []);
    }
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    fetchYosRecords();
  }, [fetchYosRecords]);

  // Seçilen kurumun bilgisi
  const selectedInstitution = useMemo(() => {
    if (!formInstitutionId) return null;
    return institutions.find(i => String(i.id) === String(formInstitutionId)) || null;
  }, [institutions, formInstitutionId]);

  // Seçilen 2. kurum bilgisi (varsa)
  const selectedInstitution2 = useMemo(() => {
    if (!formInstitutionId2) return null;
    return institutions.find(i => String(i.id) === String(formInstitutionId2)) || null;
  }, [institutions, formInstitutionId2]);

  // İlçe bazlı filtrelenmiş kurum listesi
  const districtSchools = useMemo(() => {
    if (!formDistrictId) return [];
    return institutions.filter(i => String(i.district_id) === String(formDistrictId));
  }, [institutions, formDistrictId]);

  // Branşın nihai metni
  const finalBrans = useMemo(() => {
    if (formBransSelect === 'Diğer') {
      return formCustomBrans.trim() || 'Diğer';
    }
    return formBransSelect;
  }, [formBransSelect, formCustomBrans]);

  // İlçe değiştiğinde okulu sıfırla
  const handleDistrictChange = (e) => {
    const val = e.target.value;
    setFormDistrictId(val);
    setFormInstitutionId('');
    setFormInstitutionId2('');
  };

  // İstatistiksel Özetler
  const stats = useMemo(() => {
    const total = existingRecords.length;
    const active = existingRecords.filter(r => r.status === 'Aktif').length;
    const uniqueDistricts = new Set(existingRecords.map(r => r.district_id).filter(Boolean)).size;
    const uniqueSchools = new Set(existingRecords.map(r => r.institution_id).filter(Boolean)).size;
    return { total, active, uniqueDistricts, uniqueSchools };
  }, [existingRecords]);

  // Tablo Filtreleme
  const filteredRecords = useMemo(() => {
    return existingRecords.filter(item => {
      // Kelime Arama (YOS Adı Soyadı, Okul Adı, Okul Kodu, Branş, Telefon)
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const fullName = `${item.name || ''} ${item.surname || ''}`.toLowerCase();
        const school1 = `${item.kurum1?.name || ''} ${item.kurum1?.code || ''}`.toLowerCase();
        const school2 = `${item.kurum2?.name || ''} ${item.kurum2?.code || ''}`.toLowerCase();
        const bransMatch = (item.brans || '').toLowerCase();
        const phoneMatch = (item.phone || '').toLowerCase();

        if (
          !fullName.includes(q) &&
          !school1.includes(q) &&
          !school2.includes(q) &&
          !bransMatch.includes(q) &&
          !phoneMatch.includes(q)
        ) {
          return false;
        }
      }

      // İlçe Filtresi
      if (filterDistrict) {
        if (String(item.district_id) !== String(filterDistrict)) return false;
      }

      // Branş Filtresi
      if (filterBrans !== 'Tümü') {
        if (item.brans !== filterBrans) return false;
      }

      // Durum Filtresi
      if (filterStatus !== 'Tümü') {
        if (item.status !== filterStatus) return false;
      }

      return true;
    });
  }, [existingRecords, filterSearch, filterDistrict, filterBrans, filterStatus]);

  // ─── 1. Form Doğrulama ve Onay Pop-Up'ı Başlatma ───
  const handleInitiateSave = (e) => {
    if (e) e.preventDefault();
    const errors = [];

    if (!formDistrictId) errors.push('Lütfen bir İlçe seçiniz.');
    if (!formInstitutionId) errors.push('Lütfen YOS görevlendirilecek Kurumu (Okulu) seçiniz.');
    if (!formName.trim()) errors.push('Lütfen YOS Adını giriniz.');
    if (!formSurname.trim()) errors.push('Lütfen YOS Soyadını giriniz.');
    if (formBransSelect === 'Diğer' && !formCustomBrans.trim()) {
      errors.push('Lütfen Diğer seçeneği için branş adını yazınız.');
    }
    if (!formPhone.trim()) errors.push('Lütfen İletişim Telefon Numarasını giriniz.');

    if (errors.length > 0) {
      setValidationMessages(errors);
      setShowValidationModal(true);
      return;
    }

    // Doğrulama başarılı -> Onay Pop-Up'ını aç
    setShowConfirmModal(true);
  };

  // ─── 2. Onaylandıktan Sonra Supabase'e Kaydetme ───
  const handleConfirmSave = async () => {
    setSaving(true);
    setShowConfirmModal(false);

    try {
      const payload = {
        name: formName.trim(),
        surname: formSurname.trim(),
        brans: finalBrans,
        phone: formPhone.trim(),
        email: formEmail.trim() || null,
        district_id: Number(formDistrictId),
        institution_id: Number(formInstitutionId),
        institution_id_2: formInstitutionId2 ? Number(formInstitutionId2) : null,
        assignment_date: formAssignmentDate || new Date().toISOString().split('T')[0],
        status: formStatus
      };

      const { data, error } = await supabase
        .from('btr_records')
        .insert([payload])
        .select(`
          *,
          districts!btr_records_district_id_fkey(name),
          kurum1:kurum_kayit!btr_records_institution_id_fkey(name, code),
          kurum2:kurum_kayit!btr_records_institution_id_2_fkey(name, code)
        `);

      if (error) throw error;

      // Başarı modalı için kaydedilen veriyi hazırla
      const savedRow = data && data[0] ? data[0] : payload;
      setSavedYosInfo({
        ...savedRow,
        schoolName: selectedInstitution?.name,
        schoolCode: selectedInstitution?.code,
        districtName: districts.find(d => String(d.id) === String(formDistrictId))?.name
      });

      // Formu temizle
      setFormName('');
      setFormSurname('');
      setFormPhone('');
      setFormEmail('');
      setFormCustomBrans('');
      setFormInstitutionId2('');
      // Okul ve ilçeyi koruyabilir veya sıfırlayabilir; hızlı çoklu giriş için ili/okulu koruyoruz
      fetchYosRecords();
      setShowSuccessModal(true);
    } catch (err) {
      setValidationMessages(['Kayıt oluşturulurken veritabanı hatası meydana geldi: ' + err.message]);
      setShowValidationModal(true);
    } finally {
      setSaving(false);
    }
  };

  // ─── YOS Kaydını Silme ───
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('btr_records')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchYosRecords();
    } catch (err) {
      alert('Silme işlemi sırasında hata oluştu: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span
            className="rounded-3 bg-primary-soft d-flex align-items-center justify-content-center shadow-sm"
            style={{ width: 48, height: 48, fontSize: '1.3rem' }}
          >
            <i className="fas fa-chalkboard-user text-primary"></i>
          </span>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="fw-bold mb-0 text-dark">YOS Ekle</h4>
              <Badge bg="primary" className="fw-semibold px-2 py-1">BT Rehberliği</Badge>
            </div>
            <span className="text-muted small">
              Yetkili Okul Sorumlusu (YOS / BTR) görevlendirme, okul eşleştirmesi ve iletişim kaydı
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant={showFormCollapse ? 'primary' : 'outline-primary'}
            size="sm"
            className="rounded-pill px-3 d-inline-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowFormCollapse(!showFormCollapse)}
          >
            <i className={`fas fa-${showFormCollapse ? 'minus' : 'user-plus'}`}></i>
            <span>{showFormCollapse ? 'Formu Gizle' : 'Yeni YOS Ekle'}</span>
          </Button>
          <Link
            href="/btr-ogretmenleri"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2 shadow-sm"
          >
            <i className="fas fa-user-graduate"></i>
            <span>YOS / BTR Listesi</span>
          </Link>
          <Link
            href="/kurumlar"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2 shadow-sm"
          >
            <i className="fas fa-school"></i>
            <span>Kurumlar</span>
          </Link>
        </div>
      </div>

      {/* ─── ÜST KPI KARTLARI ─── */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Toplam Görevlendirme</span>
              <div className="kpi-icon-box bg-primary-soft">
                <i className="fas fa-users text-primary"></i>
              </div>
            </div>
            <div className="kpi-value text-dark">{stats.total}</div>
            <div className="kpi-footer text-muted">
              <span>Sistemdeki YOS Kayıt Sayısı</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Aktif Görevliler</span>
              <div className="kpi-icon-box bg-success-soft">
                <i className="fas fa-user-check text-success"></i>
              </div>
            </div>
            <div className="kpi-value text-success">{stats.active}</div>
            <div className="kpi-footer text-muted">
              <span>Faal Çalışan Öğretmen</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Görevli İlçe Sayısı</span>
              <div className="kpi-icon-box bg-info-soft">
                <i className="fas fa-map-location-dot text-info"></i>
              </div>
            </div>
            <div className="kpi-value text-info">{stats.uniqueDistricts} / 19</div>
            <div className="kpi-footer text-muted">
              <span>Kapsanan Ordu İlçeleri</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="modern-kpi-card h-100">
            <div className="kpi-top">
              <span className="kpi-label">Görevli Kurum</span>
              <div className="kpi-icon-box bg-warning-soft">
                <i className="fas fa-school-flag text-warning"></i>
              </div>
            </div>
            <div className="kpi-value text-dark">{stats.uniqueSchools}</div>
            <div className="kpi-footer text-muted">
              <span>Eşleşen Okul Sayısı</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── YOS EKLEME FORMU ─── */}
      {showFormCollapse && (
        <Card className="modern-card mb-4 border-0 shadow-sm">
          <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-user-plus text-primary"></i>
              <h6 className="mb-0 fw-bold text-dark">Yeni YOS / BT Rehberi Görevlendirme Formu</h6>
            </div>
            <span className="badge bg-light text-secondary border">Adım 1: Bilgileri Doldurun & Onaylayın</span>
          </Card.Header>
          <Card.Body className="p-4">
            <Form onSubmit={handleInitiateSave}>
              {/* BÖLÜM 1: KURUM VE KONUM BİLGİLERİ */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                  <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, lineHeight: '14px' }}>1</span>
                  <span className="fw-bold text-dark">Kurum ve İlçe Eşleştirmesi</span>
                  <span className="text-muted small">(YOS öğretmeninin görev yapacağı okul)</span>
                </div>

                <Row className="g-3">
                  {/* İlçe Seçimi */}
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        İlçe <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formDistrictId}
                        onChange={handleDistrictChange}
                        className="form-select-lg border-2"
                        style={{ fontSize: '0.95rem' }}
                      >
                        <option value="">İlçe Seçiniz...</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted small">Önce ilçeyi belirleyiniz.</Form.Text>
                    </Form.Group>
                  </Col>

                  {/* Okul (Kurum) Seçimi */}
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        Görevli Kurum / Okul <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formInstitutionId}
                        onChange={(e) => setFormInstitutionId(e.target.value)}
                        disabled={!formDistrictId}
                        className="form-select-lg border-2"
                        style={{ fontSize: '0.95rem' }}
                      >
                        <option value="">
                          {!formDistrictId ? 'Önce İlçe Seçiniz' : 'Okul / Kurum Seçiniz...'}
                        </option>
                        {districtSchools.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} {inst.code ? `(${inst.code})` : ''}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted small">İlçe seçildiğinde kurumlar otomatik yüklenir.</Form.Text>
                    </Form.Group>
                  </Col>

                  {/* MEB Okul Kodu Göstergesi */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        MEB Okul Kodu
                      </Form.Label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light text-muted border-2">
                          <i className="fas fa-barcode"></i>
                        </span>
                        <Form.Control
                          type="text"
                          readOnly
                          value={selectedInstitution?.code || ''}
                          placeholder="Okul Kodu..."
                          className="bg-light fw-bold text-dark border-2"
                          style={{ fontSize: '0.95rem' }}
                        />
                      </div>
                      <Form.Text className="text-muted small">
                        {selectedInstitution ? '✅ Kurum Kodu Eşleşti' : 'Okul seçildiğinde otomatik doldurulur.'}
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  {/* 2. Kurum (İsteğe Bağlı) */}
                  <Col md={12}>
                    <div className="p-3 bg-light rounded-3 border">
                      <Row className="g-2 align-items-center">
                        <Col md={4}>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-building-columns text-secondary"></i>
                            <div>
                              <div className="small fw-bold text-dark">2. Görevli Okul (İsteğe Bağlı)</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Öğretmenin 2. bir okulda ek görevi varsa seçiniz</div>
                            </div>
                          </div>
                        </Col>
                        <Col md={8}>
                          <Form.Select
                            value={formInstitutionId2}
                            onChange={(e) => setFormInstitutionId2(e.target.value)}
                            disabled={!formDistrictId}
                            size="sm"
                          >
                            <option value="">2. Okul Yok (Sadece 1. Okul)</option>
                            {districtSchools
                              .filter(inst => String(inst.id) !== String(formInstitutionId))
                              .map(inst => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.name} {inst.code ? `(${inst.code})` : ''}
                                </option>
                              ))}
                          </Form.Select>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* BÖLÜM 2: YOS ÖĞRETMEN VE İLETİŞİM BİLGİLERİ */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                  <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, lineHeight: '14px' }}>2</span>
                  <span className="fw-bold text-dark">YOS Öğretmen Bilgileri ve İletişim</span>
                  <span className="text-muted small">(Ad, Soyad, Branş ve İletişim Bilgileri)</span>
                </div>

                <Row className="g-3">
                  {/* YOS Adı */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        YOS Adı <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup className="input-group-lg">
                        <InputGroup.Text className="bg-light border-2">
                          <i className="fas fa-user text-primary"></i>
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Örn: Ahmet"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="border-2"
                          style={{ fontSize: '0.95rem' }}
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* YOS Soyadı */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        YOS Soyadı <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup className="input-group-lg">
                        <InputGroup.Text className="bg-light border-2">
                          <i className="fas fa-signature text-secondary"></i>
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Örn: Yılmaz"
                          value={formSurname}
                          onChange={(e) => setFormSurname(e.target.value)}
                          className="border-2"
                          style={{ fontSize: '0.95rem' }}
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* YOS Branş */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        YOS Branş <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formBransSelect}
                        onChange={(e) => setFormBransSelect(e.target.value)}
                        className="form-select-lg border-2"
                        style={{ fontSize: '0.95rem' }}
                      >
                        {BRANS_LISTESI.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted small">Öğretmenin kadro branşı</Form.Text>
                    </Form.Group>
                  </Col>

                  {/* Telefon Numarası */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        İletişim Telefonu <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup className="input-group-lg">
                        <InputGroup.Text className="bg-light border-2">
                          <i className="fas fa-phone text-success"></i>
                        </InputGroup.Text>
                        <Form.Control
                          type="tel"
                          placeholder="05XX XXX XX XX"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          className="border-2"
                          style={{ fontSize: '0.95rem' }}
                        />
                      </InputGroup>
                      <Form.Text className="text-muted small">Yetkili cep telefonu</Form.Text>
                    </Form.Group>
                  </Col>

                  {/* Eğer "Diğer" branş seçilmişse özel branş kutusu */}
                  {formBransSelect === 'Diğer' && (
                    <Col md={6}>
                      <Form.Group className="p-3 bg-warning-soft rounded-3 border border-warning">
                        <Form.Label className="small fw-bold text-dark">
                          Özel Branş Belirtiniz <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Örn: Biyomedikal Cihaz Teknolojileri"
                          value={formCustomBrans}
                          onChange={(e) => setFormCustomBrans(e.target.value)}
                          className="border-warning"
                        />
                      </Form.Group>
                    </Col>
                  )}

                  {/* E-posta (İsteğe Bağlı) */}
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        E-posta Adresi (İsteğe Bağlı)
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="bg-light">
                          <i className="fas fa-envelope text-info"></i>
                        </InputGroup.Text>
                        <Form.Control
                          type="email"
                          placeholder="ornek@meb.k12.tr"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* Görevlendirme Tarihi */}
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        Görevlendirme Tarihi
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="bg-light">
                          <i className="fas fa-calendar-day text-secondary"></i>
                        </InputGroup.Text>
                        <Form.Control
                          type="date"
                          value={formAssignmentDate}
                          onChange={(e) => setFormAssignmentDate(e.target.value)}
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* Görev Durumu */}
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        Görev Durumu
                      </Form.Label>
                      <div className="d-flex gap-2">
                        <Button
                          type="button"
                          variant={formStatus === 'Aktif' ? 'success' : 'outline-secondary'}
                          className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                          onClick={() => setFormStatus('Aktif')}
                        >
                          <i className="fas fa-check-circle"></i>
                          <span>Aktif Görevde</span>
                        </Button>
                        <Button
                          type="button"
                          variant={formStatus === 'Pasif' ? 'secondary' : 'outline-secondary'}
                          className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                          onClick={() => setFormStatus('Pasif')}
                        >
                          <i className="fas fa-ban"></i>
                          <span>Pasif / Ayrıldı</span>
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* BUTONLAR */}
              <div className="d-flex justify-content-between align-items-center pt-3 border-top flex-wrap gap-2">
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={() => {
                    setFormName('');
                    setFormSurname('');
                    setFormPhone('');
                    setFormEmail('');
                    setFormCustomBrans('');
                  }}
                  className="rounded-pill px-3"
                >
                  <i className="fas fa-rotate-left me-1"></i> Formu Temizle
                </Button>

                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={saving}
                    className="rounded-pill px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i>
                        <span>YOS Görevlendirmesini Kaydet</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* ─── ALT BÖLÜM: TÜM YOS VE BTR LİSTESİ / FİLTRELEME ─── */}
      <Card className="modern-card border-0 shadow-sm">
        <Card.Header className="bg-white py-3 border-bottom">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary-soft text-primary p-2 rounded-circle">
                <i className="fas fa-address-book"></i>
              </span>
              <div>
                <h6 className="mb-0 fw-bold text-dark">Sistemdeki YOS & BTR Öğretmen Kayıtları</h6>
                <small className="text-muted">
                  Toplam {existingRecords.length} kayıttan {filteredRecords.length} tanesi listeleniyor
                </small>
              </div>
            </div>

            <Button
              variant="outline-primary"
              size="sm"
              onClick={fetchYosRecords}
              className="rounded-pill px-3 d-inline-flex align-items-center gap-1"
            >
              <i className="fas fa-sync-alt"></i>
              <span>Yenile</span>
            </Button>
          </div>
        </Card.Header>

        {/* FİLTRE ÇUBUĞU */}
        <div className="p-3 bg-light border-bottom">
          <Row className="g-2">
            <Col md={4}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white">
                  <i className="fas fa-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="YOS Adı, Kurum Adı, Kod veya Tel ile Ara..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="bg-white"
                />
                {filterSearch && (
                  <Button variant="outline-secondary" onClick={() => setFilterSearch('')}>
                    <i className="fas fa-times"></i>
                  </Button>
                )}
              </InputGroup>
            </Col>

            <Col md={3}>
              <Form.Select
                size="sm"
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="bg-white"
              >
                <option value="">Tüm İlçeler ({districts.length})</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Select
                size="sm"
                value={filterBrans}
                onChange={(e) => setFilterBrans(e.target.value)}
                className="bg-white"
              >
                <option value="Tümü">Tüm Branşlar</option>
                {BRANS_LISTESI.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Select
                size="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white"
              >
                <option value="Tümü">Durum: Tümü</option>
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </Form.Select>
            </Col>
          </Row>
        </div>

        {/* TABLO */}
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="bg-light text-secondary small text-uppercase fw-semibold">
              <tr>
                <th style={{ width: 60 }} className="text-center">#</th>
                <th>YOS Adı Soyadı</th>
                <th>Branş</th>
                <th>İlçe</th>
                <th>Görevlendirilen Kurum / MEB Kodu</th>
                <th>İletişim Bilgileri</th>
                <th>Durum</th>
                <th className="text-end" style={{ width: 120 }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    <span className="text-muted">Kayıtlar yükleniyor...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="fas fa-info-circle fa-2x mb-2 text-secondary d-block"></i>
                    Filtre kriterlerine uygun YOS kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => {
                  return (
                    <tr key={item.id}>
                      <td className="text-center text-muted small">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-primary-soft text-primary d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: 34, height: 34, fontSize: '0.85rem' }}
                          >
                            {(item.name?.[0] || 'Y') + (item.surname?.[0] || 'O')}
                          </div>
                          <div>
                            <span className="fw-bold text-dark d-block">
                              {item.name} {item.surname}
                            </span>
                            {item.assignment_date && (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Görev: {new Date(item.assignment_date).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge bg="light" className="text-dark border fw-medium px-2 py-1">
                          {item.brans || 'Bilişim Teknolojileri'}
                        </Badge>
                      </td>
                      <td>
                        <span className="badge bg-secondary-soft text-dark px-2 py-1">
                          {item.districts?.name || '-'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div>
                            <div className="fw-semibold text-dark">
                              {item.kurum1?.name || 'Kurum Belirtilmemiş'}
                            </div>
                            {item.kurum1?.code && (
                              <span className="badge bg-light text-muted border" style={{ fontSize: '0.7rem' }}>
                                Kod: {item.kurum1.code}
                              </span>
                            )}
                            {item.kurum2 && (
                              <div className="mt-1 small text-muted">
                                <i className="fas fa-share text-secondary me-1"></i>
                                2. Okul: {item.kurum2.name} ({item.kurum2.code})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <a
                            href={`tel:${item.phone}`}
                            className="text-decoration-none fw-semibold text-dark d-block small"
                          >
                            <i className="fas fa-phone-alt text-success me-1"></i>
                            {item.phone || '-'}
                          </a>
                          {item.email && (
                            <a
                              href={`mailto:${item.email}`}
                              className="text-muted text-decoration-none d-block small"
                            >
                              <i className="fas fa-envelope text-info me-1"></i>
                              {item.email}
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge
                          bg={item.status === 'Aktif' ? 'success' : 'secondary'}
                          className="px-2 py-1"
                        >
                          {item.status || 'Aktif'}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-circle p-0"
                          style={{ width: 30, height: 30 }}
                          title="Görevi Sil / Kaldır"
                          onClick={() => {
                            setItemToDelete(item);
                            setShowDeleteModal(true);
                          }}
                        >
                          <i className="fas fa-trash-can" style={{ fontSize: '0.8rem' }}></i>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* ─── MODAL 1: DOĞRULAMA / EKSİK ALAN UYARI POP-UP'I ───────── */}
      {/* ============================================================ */}
      <Modal
        show={showValidationModal}
        onHide={() => setShowValidationModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div className="d-flex align-items-center gap-2 text-warning">
            <span
              className="rounded-circle bg-warning-soft d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="fas fa-triangle-exclamation text-warning"></i>
            </span>
            <Modal.Title className="h6 mb-0 fw-bold text-dark">Eksik Bilgi Uyarısı</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="text-secondary small mb-3">
            YOS görevlendirmesini kaydedebilmek için lütfen aşağıdaki zorunlu alanları eksiksiz doldurunuz:
          </p>
          <div className="bg-light p-3 rounded-3 border">
            <ul className="mb-0 text-danger ps-3 small fw-semibold">
              {validationMessages.map((msg, index) => (
                <li key={index} className="py-1">{msg}</li>
              ))}
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="warning"
            className="w-100 rounded-pill fw-semibold shadow-sm text-dark"
            onClick={() => setShowValidationModal(false)}
          >
            Anladım, Bilgileri Tamamla
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* ─── MODAL 2: ONAY POP-UP'I (KAYIT ÖNCESİ ÖZET BİLGİ) ─────── */}
      {/* ============================================================ */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div className="d-flex align-items-center gap-2 text-primary">
            <span
              className="rounded-circle bg-primary-soft d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="fas fa-clipboard-check text-primary"></i>
            </span>
            <Modal.Title className="h6 mb-0 fw-bold text-dark">YOS Görevlendirmesini Onayla</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="text-secondary small mb-3">
            Aşağıdaki bilgilere ait YOS görevlendirme kaydı sisteme eklenecektir. Bilgileri kontrol edip onaylayınız:
          </p>

          <div className="card bg-light border-0 rounded-3 p-3 mb-3">
            <div className="row g-2 small">
              <div className="col-5 text-muted fw-semibold">İlçe:</div>
              <div className="col-7 fw-bold text-dark">
                {districts.find(d => String(d.id) === String(formDistrictId))?.name || '-'}
              </div>

              <div className="col-5 text-muted fw-semibold">Kurum (Okul):</div>
              <div className="col-7 fw-bold text-primary">
                {selectedInstitution?.name || '-'}
              </div>

              <div className="col-5 text-muted fw-semibold">MEB Kurum Kodu:</div>
              <div className="col-7">
                <Badge bg="dark" className="px-2 py-1">{selectedInstitution?.code || '-'}</Badge>
              </div>

              {selectedInstitution2 && (
                <>
                  <div className="col-5 text-muted fw-semibold">2. Görevli Okul:</div>
                  <div className="col-7 fw-semibold text-secondary">
                    {selectedInstitution2.name} ({selectedInstitution2.code})
                  </div>
                </>
              )}

              <hr className="my-2" />

              <div className="col-5 text-muted fw-semibold">YOS Adı Soyadı:</div>
              <div className="col-7 fw-bold text-dark">
                {formName} {formSurname}
              </div>

              <div className="col-5 text-muted fw-semibold">Branş:</div>
              <div className="col-7">
                <Badge bg="info" className="px-2 py-1">{finalBrans}</Badge>
              </div>

              <div className="col-5 text-muted fw-semibold">İletişim Tel:</div>
              <div className="col-7 fw-bold text-success">
                <i className="fas fa-phone-alt me-1"></i>{formPhone}
              </div>

              {formEmail && (
                <>
                  <div className="col-5 text-muted fw-semibold">E-posta:</div>
                  <div className="col-7 text-dark">{formEmail}</div>
                </>
              )}

              <div className="col-5 text-muted fw-semibold">Görev Durumu:</div>
              <div className="col-7">
                <Badge bg={formStatus === 'Aktif' ? 'success' : 'secondary'} className="px-2 py-1">
                  {formStatus}
                </Badge>
              </div>
            </div>
          </div>

          <div className="alert alert-info py-2 px-3 small mb-0 rounded-3 d-flex align-items-center gap-2">
            <i className="fas fa-info-circle"></i>
            <span>Kaydedildikten sonra okul detay sayfasında ve BTR listesinde anında görüntülenecektir.</span>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            className="rounded-pill px-3"
            onClick={() => setShowConfirmModal(false)}
            disabled={saving}
          >
            Vazgeç
          </Button>
          <Button
            variant="primary"
            className="rounded-pill px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
            onClick={handleConfirmSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner size="sm" animation="border" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                <span>Evet, Görevlendirmeyi Kaydet</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* ─── MODAL 3: BAŞARI KUTLAMA POP-UP'I ─────────────────────── */}
      {/* ============================================================ */}
      <Modal
        show={showSuccessModal}
        onHide={() => setShowSuccessModal(false)}
        centered
      >
        <Modal.Body className="text-center py-4 px-4">
          <div
            className="rounded-circle bg-success-soft d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
            style={{ width: 68, height: 68 }}
          >
            <i className="fas fa-circle-check text-success fa-2x"></i>
          </div>
          <h5 className="fw-bold text-dark mb-1">YOS Kaydı Başarıyla Oluşturuldu!</h5>
          <p className="text-muted small mb-3">
            Öğretmen ilgili kuruma Yetkili Okul Sorumlusu olarak başarıyla görevlendirildi.
          </p>

          {savedYosInfo && (
            <div className="p-3 bg-light rounded-3 text-start small border mb-3">
              <div className="mb-1">
                <span className="text-muted">Öğretmen:</span>{' '}
                <strong>{savedYosInfo.name} {savedYosInfo.surname}</strong> ({savedYosInfo.brans})
              </div>
              <div className="mb-1">
                <span className="text-muted">Kurum:</span>{' '}
                <strong>{savedYosInfo.schoolName}</strong> ({savedYosInfo.schoolCode})
              </div>
              <div className="mb-1">
                <span className="text-muted">İlçe:</span>{' '}
                <strong>{savedYosInfo.districtName}</strong>
              </div>
              <div>
                <span className="text-muted">İletişim:</span>{' '}
                <strong>{savedYosInfo.phone}</strong>
              </div>
            </div>
          )}

          <div className="d-flex flex-column gap-2">
            <Button
              variant="primary"
              className="w-100 rounded-pill fw-semibold shadow-sm"
              onClick={() => setShowSuccessModal(false)}
            >
              <i className="fas fa-plus me-1"></i> Yeni Bir YOS Daha Ekle
            </Button>
            <Link
              href="/btr-ogretmenleri"
              className="btn btn-outline-secondary w-100 rounded-pill fw-semibold"
            >
              <i className="fas fa-list me-1"></i> YOS / BTR Listesine Git
            </Link>
          </div>
        </Modal.Body>
      </Modal>

      {/* ============================================================ */}
      {/* ─── MODAL 4: SİLME ONAY POP-UP'I ──────────────────────────── */}
      {/* ============================================================ */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div className="d-flex align-items-center gap-2 text-danger">
            <span
              className="rounded-circle bg-danger-soft d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="fas fa-trash-can text-danger"></i>
            </span>
            <Modal.Title className="h6 mb-0 fw-bold text-dark">Görevi Silme Onayı</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="text-secondary small mb-3">
            Bu öğretmenin YOS görevlendirme kaydını sistemden silmek istediğinize emin misiniz?
          </p>
          {itemToDelete && (
            <div className="p-3 bg-light rounded-3 small border">
              <div><strong>Öğretmen:</strong> {itemToDelete.name} {itemToDelete.surname}</div>
              <div><strong>Branş:</strong> {itemToDelete.brans || '-'}</div>
              <div><strong>Kurum:</strong> {itemToDelete.kurum1?.name || '-'} ({itemToDelete.kurum1?.code})</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            className="rounded-pill px-3"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
          >
            İptal
          </Button>
          <Button
            variant="danger"
            className="rounded-pill px-4 fw-semibold shadow-sm"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? <Spinner size="sm" animation="border" /> : 'Evet, Sil'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
