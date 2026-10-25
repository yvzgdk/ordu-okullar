import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

export default function GuestAdd() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [hostInstitutions, setHostInstitutions] = useState([]);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        director: '',
        director_phone: '',
        has_bt_class: 'yok',
        bt_labs: [],
        district_id: '',
        related_institution_id: '',
        status: 'misafir',
        infra_owner: 'ev_sahibi',
        board_owner: 'ev_sahibi',
        internet_type: 'Yok'
    });

    useEffect(() => {
        fetchDistricts();
    }, []);

    useEffect(() => {
        if (formData.district_id) {
            fetchHostInstitutions(formData.district_id);
        } else {
            setHostInstitutions([]);
        }
    }, [formData.district_id]);

    const fetchDistricts = async () => {
        const { data } = await supabase.from('districts').select('id, name').order('name');
        if (data) setDistricts(data);
    };

    const fetchHostInstitutions = async (districtId) => {
        const { data } = await supabase
            .from('kurum_kayit')
            .select('id, name')
            .eq('district_id', districtId)
            .neq('status', 'misafir')
            .order('name');
        if (data) setHostInstitutions(data);
    };

    const handleCodeBlur = async () => {
        if (formData.code && formData.code.trim()) {
            const { data } = await supabase.from('kurum_kayit').select('id').eq('code', formData.code.trim()).maybeSingle();
            if (data) {
                setShowDuplicateModal(true);
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addBtLab = () => {
        setFormData(prev => ({
            ...prev,
            bt_labs: [...prev.bt_labs, { pc_count: '', lab_status: 'yeni', lab_source: 'meb', has_board: 'yok' }]
        }));
    };

    const removeBtLab = (idx) => {
        setFormData(prev => ({
            ...prev,
            bt_labs: prev.bt_labs.filter((_, i) => i !== idx)
        }));
    };

    const updateBtLab = (idx, field, value) => {
        setFormData(prev => ({
            ...prev,
            bt_labs: prev.bt_labs.map((lab, i) => i === idx ? { ...lab, [field]: value } : lab)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.code && formData.code.trim()) {
            const { data } = await supabase.from('kurum_kayit').select('id').eq('code', formData.code.trim()).maybeSingle();
            if (data) {
                setShowDuplicateModal(true);
                return;
            }
        }
        
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const submitData = { 
                ...formData,
                code: formData.code.trim(),
                name: formData.name.trim(),
                has_bt_class: formData.has_bt_class === 'var'
            };
            
            const { error: insertError } = await supabase
                .from('kurum_kayit')
                .insert([submitData]);

            if (insertError) throw insertError;

            setSuccess('Misafir kurum başarıyla sisteme kaydedildi.');
            setFormData({
                code: '',
                name: '',
                director: '',
                director_phone: '',
                has_bt_class: 'yok',
                bt_labs: [],
                district_id: '',
                related_institution_id: '',
                status: 'misafir',
                infra_owner: 'ev_sahibi',
                board_owner: 'ev_sahibi',
                internet_type: 'Yok'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError('Kayıt oluşturulurken hata meydana geldi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="px-0">
            {/* ─── Modern Sayfa Başlığı (Anasayfa & Kurum Ekleme ile Uyumlu) ─── */}
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                    <span className="rounded-3 bg-primary-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
                        <i className="fas fa-house-chimney-user text-primary"></i>
                    </span>
                    <div>
                        <h4 className="fw-bold mb-0 text-dark">Misafir Kurum Kayıt Formu</h4>
                        <span className="text-muted small">Başka bir okul bünyesinde veya binasında faaliyet gösteren misafir kurumların kaydı</span>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <Link href="/kurumlar" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
                        <i className="fas fa-list"></i>
                        <span>Kurum Listesi</span>
                    </Link>
                    <Link href="/kurum-ekle" className="btn btn-primary-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
                        <i className="fas fa-plus-circle"></i>
                        <span>Normal Kurum Ekle</span>
                    </Link>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 shadow-sm border-0 mb-4">
                    <i className="fas fa-triangle-exclamation me-2"></i>{error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="rounded-3 shadow-sm border-0 mb-4">
                    <i className="fas fa-circle-check me-2"></i>{success}
                </Alert>
            )}

            <Form onSubmit={handleSubmit}>
                <Row className="g-4">
                    {/* 1. Temel Kurum Bilgileri */}
                    <Col lg={12}>
                        <div className="form-section-card">
                            <div className="form-section-header">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="section-icon-badge bg-primary-soft">
                                        <i className="fas fa-school text-primary"></i>
                                    </span>
                                    <div>
                                        <div className="section-title">1. Temel Kurum Bilgileri</div>
                                        <div className="text-muted small">Misafir kurumun resmi kimlik ve iletişim bilgileri</div>
                                    </div>
                                </div>
                                <span className="badge-pill badge-pill-info">Misafir Statüsü</span>
                            </div>
                            <div className="p-4">
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Control
                                                type="text"
                                                id="code"
                                                name="code"
                                                placeholder="Örn: 754321"
                                                value={formData.code}
                                                onChange={handleChange}
                                                onBlur={handleCodeBlur}
                                                required
                                            />
                                            <label htmlFor="code">
                                                <i className="fas fa-fingerprint me-2 text-muted"></i>Kurum Kodu *
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Control
                                                type="text"
                                                id="name"
                                                name="name"
                                                placeholder="Örn: Fatsa Özel Eğitim Uygulama Okulu"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="name">
                                                <i className="fas fa-heading me-2 text-muted"></i>Kurum Adı *
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Control
                                                type="text"
                                                id="director"
                                                name="director"
                                                placeholder="Ad Soyad"
                                                value={formData.director}
                                                onChange={handleChange}
                                            />
                                            <label htmlFor="director">
                                                <i className="fas fa-user-tie me-2 text-muted"></i>Kurum Müdürü / Yetkili
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Control
                                                type="text"
                                                id="director_phone"
                                                name="director_phone"
                                                placeholder="05xx xxx xx xx"
                                                value={formData.director_phone}
                                                onChange={handleChange}
                                            />
                                            <label htmlFor="director_phone">
                                                <i className="fas fa-phone me-2 text-muted"></i>Telefon Numarası
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    </Col>

                    {/* 2. Yerleşim & Ev Sahibi Kurum Bilgileri */}
                    <Col lg={12}>
                        <div className="form-section-card">
                            <div className="form-section-header">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="section-icon-badge bg-warning-soft">
                                        <i className="fas fa-building text-warning"></i>
                                    </span>
                                    <div>
                                        <div className="section-title">2. Ev Sahibi Kurum & Mülkiyet Bağlantısı</div>
                                        <div className="text-muted small">Misafir okulun bulunduğu bina, altyapı ve tahta sahipliği</div>
                                    </div>
                                </div>
                                <span className="badge-pill badge-pill-warning">Bina Paylaşımı</span>
                            </div>
                            <div className="p-4">
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Select
                                                id="district_id"
                                                name="district_id"
                                                value={formData.district_id}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="">İlçe Seçiniz...</option>
                                                {districts.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </Form.Select>
                                            <label htmlFor="district_id">
                                                <i className="fas fa-map-marker-alt me-2 text-muted"></i>Bulunduğu İlçe *
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Select
                                                id="related_institution_id"
                                                name="related_institution_id"
                                                value={formData.related_institution_id}
                                                onChange={handleChange}
                                                required
                                                disabled={!formData.district_id}
                                            >
                                                <option value="">{formData.district_id ? 'Ev Sahibi Okulu Seçiniz...' : 'Önce İlçe Seçiniz'}</option>
                                                {hostInstitutions.map(inst => (
                                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                ))}
                                            </Form.Select>
                                            <label htmlFor="related_institution_id">
                                                <i className="fas fa-hotel me-2 text-muted"></i>Ev Sahibi Kurum (Binasında Bulunduğu Okul) *
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Select
                                                id="infra_owner"
                                                name="infra_owner"
                                                value={formData.infra_owner}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="ev_sahibi">Ev Sahibi Kuruma Ait</option>
                                                <option value="misafir">Misafir Kuruma (Kendisine) Ait</option>
                                            </Form.Select>
                                            <label htmlFor="infra_owner">
                                                <i className="fas fa-network-wired me-2 text-muted"></i>Altyapı Mülkiyeti *
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Select
                                                id="board_owner"
                                                name="board_owner"
                                                value={formData.board_owner}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="ev_sahibi">Ev Sahibi Kuruma Ait (Ortak Kullanım)</option>
                                                <option value="misafir">Misafir Kuruma (Kendisine) Ait</option>
                                            </Form.Select>
                                            <label htmlFor="board_owner">
                                                <i className="fas fa-chalkboard me-2 text-muted"></i>Etkileşimli Tahta Mülkiyeti *
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    </Col>

                    {/* 3. Bilişim Teknolojileri (BT) Sınıfı Bilgisi */}
                    <Col lg={12}>
                        <div className="form-section-card">
                            <div className="form-section-header">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="section-icon-badge bg-info-soft">
                                        <i className="fas fa-desktop text-info"></i>
                                    </span>
                                    <div>
                                        <div className="section-title">3. Bilişim Teknolojileri (BT) Sınıfı</div>
                                        <div className="text-muted small">Misafir kuruma özel BT laboratuvarı veya bilgisayar sınıfı varlığı</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4">
                                <Row className="g-3 mb-3">
                                    <Col md={6}>
                                        <Form.Floating>
                                            <Form.Select
                                                id="has_bt_class"
                                                name="has_bt_class"
                                                value={formData.has_bt_class}
                                                onChange={handleChange}
                                            >
                                                <option value="yok">Yok</option>
                                                <option value="var">Var</option>
                                            </Form.Select>
                                            <label htmlFor="has_bt_class">
                                                <i className="fas fa-laptop-code me-2 text-muted"></i>BT Sınıfı Var mı?
                                            </label>
                                        </Form.Floating>
                                    </Col>
                                </Row>

                                {formData.has_bt_class === 'var' && (
                                    <div className="p-3 bg-light rounded-3 border border-dashed mt-3">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <span className="fw-semibold text-dark">
                                                <i className="fas fa-network-wired text-primary me-2"></i>Kayıtlı BT Laboratuvarları ({formData.bt_labs.length})
                                            </span>
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                onClick={addBtLab}
                                                className="rounded-pill px-3"
                                            >
                                                <i className="fas fa-plus me-1"></i> Yeni Laboratuvar Ekle
                                            </Button>
                                        </div>

                                        {formData.bt_labs.length === 0 ? (
                                            <div className="text-center py-4 bg-white rounded-3 border">
                                                <i className="fas fa-laptop fa-2x text-muted mb-2"></i>
                                                <p className="text-muted small mb-3">Henüz laboratuvar detayı eklenmedi.</p>
                                                <Button variant="primary" size="sm" onClick={addBtLab} className="rounded-pill px-4">
                                                    <i className="fas fa-plus me-1"></i> Laboratuvar Ekle
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column gap-3">
                                                {formData.bt_labs.map((lab, idx) => (
                                                    <Card key={idx} className="border shadow-none rounded-3">
                                                        <Card.Body className="p-3">
                                                            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                                                <span className="badge-pill badge-pill-info">
                                                                    <i className="fas fa-desktop me-1"></i> Laboratuvar #{idx + 1}
                                                                </span>
                                                                <Button 
                                                                    variant="outline-danger" 
                                                                    size="sm" 
                                                                    onClick={() => removeBtLab(idx)} 
                                                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                                                    style={{ width: 32, height: 32, padding: 0 }}
                                                                    title="Laboratuvarı Sil"
                                                                >
                                                                    <i className="fas fa-trash-can fa-sm"></i>
                                                                </Button>
                                                            </div>
                                                            <Row className="g-3">
                                                                <Col md={3}>
                                                                    <Form.Floating>
                                                                        <Form.Control
                                                                            type="number"
                                                                            id={`pc_count_${idx}`}
                                                                            min="0"
                                                                            placeholder="PC Sayısı"
                                                                            value={lab.pc_count}
                                                                            onChange={e => updateBtLab(idx, 'pc_count', e.target.value)}
                                                                        />
                                                                        <label htmlFor={`pc_count_${idx}`}>PC Sayısı</label>
                                                                    </Form.Floating>
                                                                </Col>
                                                                <Col md={3}>
                                                                    <Form.Floating>
                                                                        <Form.Select
                                                                            id={`lab_status_${idx}`}
                                                                            value={lab.lab_status}
                                                                            onChange={e => updateBtLab(idx, 'lab_status', e.target.value)}
                                                                        >
                                                                            <option value="yeni">Yeni</option>
                                                                            <option value="eski">Eski</option>
                                                                        </Form.Select>
                                                                        <label htmlFor={`lab_status_${idx}`}>Lab Durumu</label>
                                                                    </Form.Floating>
                                                                </Col>
                                                                <Col md={3}>
                                                                    <Form.Floating>
                                                                        <Form.Select
                                                                            id={`lab_source_${idx}`}
                                                                            value={lab.lab_source}
                                                                            onChange={e => updateBtLab(idx, 'lab_source', e.target.value)}
                                                                        >
                                                                            <option value="meb">MEB</option>
                                                                            <option value="yenilikci">Yenilikçi Sınıf</option>
                                                                            <option value="kendi">Kendi İmkanları</option>
                                                                            <option value="bagis">Bağış</option>
                                                                        </Form.Select>
                                                                        <label htmlFor={`lab_source_${idx}`}>Lab Kaynağı</label>
                                                                    </Form.Floating>
                                                                </Col>
                                                                <Col md={3}>
                                                                    <Form.Floating>
                                                                        <Form.Select
                                                                            id={`has_board_${idx}`}
                                                                            value={lab.has_board}
                                                                            onChange={e => updateBtLab(idx, 'has_board', e.target.value)}
                                                                        >
                                                                            <option value="yok">Yok</option>
                                                                            <option value="var">Var</option>
                                                                        </Form.Select>
                                                                        <label htmlFor={`has_board_${idx}`}>ET Tahta Durumu</label>
                                                                    </Form.Floating>
                                                                </Col>
                                                            </Row>
                                                        </Card.Body>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Form İşlem Butonları */}
                <div className="d-flex align-items-center justify-content-end gap-3 mt-4 pt-2 mb-5">
                    <Link href="/kurumlar" className="btn btn-light rounded-pill px-4 border">
                        İptal
                    </Link>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading}
                        className="rounded-pill px-5 shadow-sm fw-semibold d-inline-flex align-items-center gap-2"
                        style={{ height: 48 }}
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" animation="border" />
                                <span>Kaydediliyor...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check"></i>
                                <span>Misafir Kurumu Kaydet</span>
                            </>
                        )}
                    </Button>
                </div>
            </Form>

            {/* Mükerrer Kayıt Uyarısı Modalı */}
            <Modal show={showDuplicateModal} onHide={() => setShowDuplicateModal(false)} centered>
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header bg-danger text-white border-0 py-3 px-4">
                        <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-exclamation-triangle fa-lg"></i>
                            <h5 className="modal-title fw-bold mb-0">Mükerrer Kayıt Uyarısı</h5>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowDuplicateModal(false)}></button>
                    </div>
                    <div className="modal-body p-4 text-center">
                        <div className="avatar-mini mx-auto mb-3 bg-danger-soft text-danger" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-copy"></i>
                        </div>
                        <h6 className="fw-bold mb-2">Bu Kurum Kodu Zaten Kayıtlı!</h6>
                        <p className="text-muted small mb-0">
                            Girdiğiniz <strong className="text-dark font-monospace">{formData.code}</strong> kurum koduna sahip bir okul sistemde halihazırda mevcuttur. Lütfen farklı bir kod giriniz.
                        </p>
                    </div>
                    <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-center">
                        <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowDuplicateModal(false)}>
                            Anladım, Değiştireceğim
                        </Button>
                    </div>
                </div>
            </Modal>
        </Container>
    );
}
