import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Alert, Modal } from 'react-bootstrap';
import InstitutionForm from '../../components/InstitutionForm';

export default function InstitutionEditPage() {
  const [institutions, setInstitutions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterAltyapi, setFilterAltyapi] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state (düzenleme için)
  const [form, setForm] = useState({});

  const [hasGuestInstitution, setHasGuestInstitution] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: insts } = await supabase.from('kurum_kayit').select('*');
      const { data: dists } = await supabase.from('districts').select('id, name');
      setInstitutions(insts || []);
      setDistricts(dists || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // İlçeleri alfabetik sırala
  const sortedDistricts = [...districts].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  // Filtrelenmiş kurumlar
  const filteredInstitutions = institutions.filter(inst => {
    const codeMatch = filterCode.trim() === '' || inst.code.includes(filterCode.trim());
    const nameMatch = filterName.trim() === '' || inst.name.toLowerCase().includes(filterName.trim().toLowerCase());
    const districtMatch = filterDistrict === '' || String(inst.district_id) === String(filterDistrict);
    const altyapiMatch = filterAltyapi === '' || (filterAltyapi === 'var' ? !!inst.altyapi && inst.altyapi !== 'Yok' : !inst.altyapi || inst.altyapi === 'Yok');
    return codeMatch && nameMatch && districtMatch && altyapiMatch;
  });

  // Kurum seçilince formu doldur
  const handleSelect = async (inst) => {
    setSelectedInstitution(null); // önce sıfırla
    const { data, error } = await supabase
      .from('kurum_kayit')
      .select('*')
      .eq('id', inst.id)
      .single();

    if (error) {
      setErrorMsg('Kurum bilgisi alınamadı!');
      return;
    }
    setTimeout(() => {
      setSelectedInstitution(data);
      setShowEditModal(true);
      setSuccessMsg('');
      setErrorMsg('');
    }, 0);
  };

  // Form alanı değişince
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Eğer kurum durumu değişiyorsa popup aç
    if (name === 'status' && value === 'ev_sahibi') {
      setShowGuestModal(true);
      setHasGuestInstitution(false);
      setForm(f => ({ ...f, [name]: value, related_institution_id: '' }));
      return;
    }
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  // Güncelleme işlemi
  const handleUpdate = async (e) => {
    e.preventDefault();
    console.log('Form SUBMIT EDİLDİ', { districtId: form.district_id, initialValues: form });
    if (!form.code || !form.name || !form.district_id) {
      setErrorMsg('Kurum kodu, adı ve ilçe zorunludur.');
      return;
    }
    const relatedId = (form.status === 'ev_sahibi' && !hasGuestInstitution) ? null : (form.related_institution_id ? parseInt(form.related_institution_id) : null);
    const { error } = await supabase
      .from('kurum_kayit')
      .update({ ...form, related_institution_id: relatedId })
      .eq('id', form.id);
    if (error) {
      setErrorMsg('Güncelleme hatası: ' + error.message);
    } else {
      setSuccessMsg('Kurum başarıyla güncellendi!');
      setErrorMsg('');
      setInstitutions(insts => insts.map(i => i.id === form.id ? { ...i, ...form, related_institution_id: relatedId } : i));
    }
  };

  // handleDelete fonksiyonu ekle
  const handleDelete = async (inst) => {
    if (!window.confirm(`${inst.name} kurumunu silmek istediğinize emin misiniz?`)) return;

    // 1. Bu kurumu referans alan related_institution_id'leri null yap
    await supabase
      .from('kurum_kayit')
      .update({ related_institution_id: null })
      .eq('related_institution_id', inst.id);

    // 2. Bu kuruma ait board_transfers kayıtlarını sil (hem gönderen hem alan olarak)
    await supabase
      .from('board_transfers')
      .delete()
      .or(`from_institution_id.eq.${inst.id},to_institution_id.eq.${inst.id}`);

    // 3. (Varsa) Diğer ilişkili tabloları da silin (ör: bt_labs...)

    // 4. Kurumu sil
    const { error } = await supabase.from('kurum_kayit').delete().eq('id', inst.id);
    if (error) {
      setErrorMsg('Silme hatası: ' + error.message);
      alert('Silme hatası: ' + error.message);
    } else {
      setInstitutions(insts => insts.filter(i => i.id !== inst.id));
      setSuccessMsg('Kurum başarıyla silindi!');
      setSelectedInstitution(null);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="fw-bold mb-4 text-primary d-flex align-items-center gap-2">
        <span className="rounded-circle bg-primary bg-gradient d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
          <i className="fas fa-edit fa-lg text-white"></i>
        </span>
        Kurum Düzenle
      </h2>
      {/* Filtreleme Alanı */}
      <Card className="mb-4 shadow-lg border-0 filter-modern-card">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label><i className="fas fa-map-marker-alt me-1 text-success"></i> İlçe</Form.Label>
                <Form.Select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="filter-modern-input">
                  <option value="">Tümü</option>
                  {sortedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label><i className="fas fa-barcode me-1 text-primary"></i> Kurum Kodu</Form.Label>
                <Form.Control value={filterCode} onChange={e => setFilterCode(e.target.value)} placeholder="Kurum kodu..." className="filter-modern-input" />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label><i className="fas fa-building me-1 text-info"></i> Kurum Adı</Form.Label>
                <Form.Control value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Kurum adı..." className="filter-modern-input" />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label><i className="fas fa-network-wired me-1 text-warning"></i> Altyapı</Form.Label>
                <Form.Select value={filterAltyapi} onChange={e => setFilterAltyapi(e.target.value)} className="filter-modern-input">
                  <option value="">Tümü</option>
                  <option value="var">Var</option>
                  <option value="yok">Yok</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      {/* Kurum Listesi */}
      <Card className="mb-4 shadow-lg border-0">
        <Card.Body>
          {loading ? <Spinner animation="border" /> : (
            (filterCode.trim() !== '' || filterName.trim() !== '' || filterDistrict !== '' || filterAltyapi !== '') ? (
              <Table hover responsive className="align-middle table-modern">
                <thead className="bg-light">
                  <tr>
                    <th><i className="fas fa-barcode text-primary"></i> Kod</th>
                    <th><i className="fas fa-building text-info"></i> Adı</th>
                    <th><i className="fas fa-map-marker-alt text-success"></i> İlçe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstitutions.map(inst => (
                    <tr key={inst.id}>
                      <td>{inst.code}</td>
                      <td>{inst.name}</td>
                      <td>{districts.find(d => d.id === inst.district_id)?.name || '-'}</td>
                      <td>
                        <Button size="sm" variant="primary" className="rounded-pill px-3 d-inline-flex align-items-center" onClick={() => handleSelect(inst)}>
                          <i className="fas fa-check me-1"></i> Kurumu Seç
                        </Button>
                        <Button size="sm" variant="danger" className="ms-2 rounded-pill px-3 d-inline-flex align-items-center" onClick={() => handleDelete(inst)}>
                          <i className="fas fa-trash me-1"></i> Kurumu Sil
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="text-center text-muted py-4">Filtreleme kriteri girilmeden kurumlar listelenmez.</div>
            )
          )}
        </Card.Body>
      </Card>
      {/* Düzenleme Formu */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton />
        <Modal.Body>
          {selectedInstitution && (
            <InstitutionForm
              key={selectedInstitution?.id || ''}
              initialValues={selectedInstitution}
              editMode={true}
              onSuccess={() => {
                setShowEditModal(false);
                setSelectedInstitution(null);
                setSuccessMsg('Kayıt güncellendi!');
                // Kurumları tekrar çek
                (async () => {
                  const { data: insts } = await supabase.from('kurum_kayit').select('*');
                  setInstitutions(insts || []);
                })();
              }}
              onClose={() => {
                setShowEditModal(false);
                setSelectedInstitution(null);
              }}
            />
          )}
        </Modal.Body>
      </Modal>
      {/* Modal: Ev sahibi seçilince popup */}
      <Modal show={showGuestModal} onHide={() => setShowGuestModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Misafir Kurum Bilgisi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-4">Bu kurumda misafir kurum var mı?</p>
          <div className="d-flex justify-content-end gap-3">
            <Button variant="secondary" onClick={() => { setHasGuestInstitution(false); setShowGuestModal(false); }}>Hayır</Button>
            <Button variant="primary" onClick={() => { setHasGuestInstitution(true); setShowGuestModal(false); }}>Evet</Button>
          </div>
        </Modal.Body>
      </Modal>
      {/* Başarı mesajı gösterimi */}
      {successMsg && <Alert variant="success" className="mt-3">{successMsg}</Alert>}
      <style jsx global>{`
        .filter-modern-card {
          background: linear-gradient(135deg, #f6faff 0%, #eaf1fb 100%);
        }
        .filter-modern-input {
          border-radius: 0.75rem !important;
          border: 1.5px solid #e3eafc !important;
          background: #fafdff !important;
          font-size: 1.01rem !important;
        }
        .filter-modern-input:focus {
          border-color: #13b6ff !important;
          box-shadow: 0 0 0 2px #13b6ff33 !important;
        }
        .table-modern thead th {
          font-weight: 700;
          font-size: 1.04rem;
          background: #f6faff !important;
          border-bottom: 2px solid #e3eafc !important;
        }
        .table-modern tbody tr {
          transition: background 0.15s;
        }
        .table-modern tbody tr:hover {
          background: #eaf1fb !important;
        }
        .table-modern td, .table-modern th {
          vertical-align: middle !important;
        }
      `}</style>
    </Container>
  );
} 