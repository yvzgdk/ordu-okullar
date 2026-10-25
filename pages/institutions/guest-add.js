import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Modal } from 'react-bootstrap';
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
        related_institution_id: '', // Ev sahibi kurum ID
        status: 'misafir',
        infra_owner: 'ev_sahibi',
        board_owner: 'ev_sahibi', // Varsayılan: Ev sahibi tahtalarını kullanıyor
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
        // Sadece ev sahibi olabilecek kurumları getir (status != misafir veya status is null)
        const { data } = await supabase
            .from('kurum_kayit')
            .select('id, name')
            .eq('district_id', districtId)
            .neq('status', 'misafir')
            .order('name');
        if (data) setHostInstitutions(data);
    };

    const handleCodeBlur = async () => {
        if (formData.code) {
           const { data } = await supabase.from('kurum_kayit').select('id').eq('code', formData.code).maybeSingle();
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
            bt_labs: [...prev.bt_labs, { pc_count: '', lab_status: '', lab_source: '', has_board: 'yok' }]
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
        
        if (formData.code) {
           const { data } = await supabase.from('kurum_kayit').select('id').eq('code', formData.code).maybeSingle();
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
                has_bt_class: formData.has_bt_class === 'var'
            };
            
            const { error } = await supabase
                .from('kurum_kayit')
                .insert([submitData]);

            if (error) throw error;

            setSuccess('Misafir kurum başarıyla eklendi.');
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
        } catch (err) {
            setError('Hata oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <Container className="py-4">
            <Card className="shadow-sm border-0">
                <Card.Header className="text-white" style={{ backgroundColor: '#003366' }}>
                    <h5 className="mb-0"><i className="fas fa-building me-2"></i>Misafir Kurum Ekle</h5>
                </Card.Header>
                <Card.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Kurum Kodu</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleChange}
                                        onBlur={handleCodeBlur}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Kurum Adı</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Kurum Müdürü / Yetkili</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="director"
                                        value={formData.director}
                                        onChange={handleChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Telefon</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="director_phone"
                                        value={formData.director_phone}
                                        onChange={handleChange}
                                    />
                                </Form.Group>
                            </Col>
                            
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>BT Sınıfı Var mı?</Form.Label>
                                    <Form.Select
                                        name="has_bt_class"
                                        value={formData.has_bt_class}
                                        onChange={handleChange}
                                    >
                                        <option value="yok">Yok</option>
                                        <option value="var">Var</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {formData.has_bt_class === 'var' && (
                                <Col md={12}>
                                    <div className="p-3 bg-light rounded border border-primary">
                                        <h6 className="fw-bold text-primary mb-3">BT Sınıfı Ekleme</h6>
                                        {formData.bt_labs.map((lab, idx) => (
                                          <Card key={idx} className="mb-3 border-0 shadow-sm">
                                            <Card.Body>
                                              <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h6 className="fw-bold text-primary mb-0">Laboratuvar #{idx + 1}</h6>
                                                <Button variant="outline-danger" size="sm" onClick={() => removeBtLab(idx)} className="rounded-circle">
                                                  <i className="fas fa-trash"></i>
                                                </Button>
                                              </div>
                                              <Row className="g-3">
                                                <Col md={6}>
                                                    <Form.Label>PC Sayısı</Form.Label>
                                                    <Form.Control
                                                      type="number"
                                                      min="0"
                                                      value={lab.pc_count}
                                                      onChange={e => updateBtLab(idx, 'pc_count', e.target.value)}
                                                      className="border-0 bg-light"
                                                    />
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Label>Lab Durumu</Form.Label>
                                                    <Form.Select
                                                      value={lab.lab_status}
                                                      onChange={e => updateBtLab(idx, 'lab_status', e.target.value)}
                                                      className="form-select border-0 bg-light"
                                                    >
                                                      <option value="">Seçiniz</option>
                                                      <option value="yeni">Yeni</option>
                                                      <option value="eski">Eski</option>
                                                    </Form.Select>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Label>Lab Kaynağı</Form.Label>
                                                    <Form.Select
                                                      value={lab.lab_source}
                                                      onChange={e => updateBtLab(idx, 'lab_source', e.target.value)}
                                                      className="form-select border-0 bg-light"
                                                    >
                                                      <option value="">Seçiniz</option>
                                                      <option value="meb">MEB</option>
                                                      <option value="yenilikci">Yenilikçi Sınıf</option>
                                                      <option value="kendi">Kendi İmkanları</option>
                                                      <option value="bagis">Bağış</option>
                                                    </Form.Select>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Label>Tahta Var mı?</Form.Label>
                                                    <Form.Select
                                                      value={lab.has_board}
                                                      onChange={e => updateBtLab(idx, 'has_board', e.target.value)}
                                                      className="form-select border-0 bg-light"
                                                    >
                                                      <option value="">Seçiniz</option>
                                                      <option value="yok">Yok</option>
                                                      <option value="var">Var</option>
                                                    </Form.Select>
                                                </Col>
                                              </Row>
                                            </Card.Body>
                                          </Card>
                                        ))}
                                        <Button variant="outline-primary" onClick={addBtLab} className="w-100 dashed-border">
                                          <i className="fas fa-plus me-2"></i>BT Lab Ekle
                                        </Button>
                                    </div>
                                </Col>
                            )}
                            
                            <hr className="my-4" />

                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>İlçe</Form.Label>
                                    <Form.Select
                                        name="district_id"
                                        value={formData.district_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Seçiniz...</option>
                                        {districts.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Ev Sahibi Kurum</Form.Label>
                                    <Form.Select
                                        name="related_institution_id"
                                        value={formData.related_institution_id}
                                        onChange={handleChange}
                                        required
                                        disabled={!formData.district_id}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {hostInstitutions.map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Hangi kurumun binasında/altyapısında bulunuyor?
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Altyapı Hangi Kuruma Ait?</Form.Label>
                                    <Form.Select
                                        name="infra_owner"
                                        value={formData.infra_owner}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="ev_sahibi">Ev Sahibi Kuruma Ait</option>
                                        <option value="misafir">Misafir Kuruma (Kendisine) Ait</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Tahtalar Hangi Kuruma Ait?</Form.Label>
                                    <Form.Select
                                        name="board_owner"
                                        value={formData.board_owner}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="ev_sahibi">Ev Sahibi Kuruma Ait</option>
                                        <option value="misafir">Misafir Kuruma (Kendisine) Ait</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="d-flex justify-content-end mt-4">
                            <Button variant="primary" type="submit" disabled={loading} style={{ backgroundColor: '#003366', borderColor: '#003366' }}>
                                {loading ? <Spinner size="sm" animation="border" /> : <><i className="fas fa-save me-2"></i>Kaydet</>}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
        
        <Modal show={showDuplicateModal} onHide={() => setShowDuplicateModal(false)} centered>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title><i className="fas fa-exclamation-triangle me-2"></i>Mükerrer Kayıt</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-4">Girdiğiniz <strong>{formData.code}</strong> kurum koduna sahip bir kurum zaten sistemde kayıtlı. Lütfen farklı bir kod giriniz.</p>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={() => setShowDuplicateModal(false)}>Tamam</Button>
            </div>
          </Modal.Body>
        </Modal>
        </>
    );
}