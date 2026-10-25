import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Table, Modal } from 'react-bootstrap';

const BOARD_TYPES = ['Vestel Siyah', 'Vestel Gri', 'Arçelik', 'Aidata'];
const BOARD_STATUSES = ['Kullanımda', 'Fazlalık'];
const KAT_OPTIONS = [
  'ZEMİN', 'GİRİŞ', 
  '1.KAT', '2.KAT', '3.KAT', '4.KAT', '5.KAT',
  '1.KAT A', '1.KAT B', '2.KAT A', '2.KAT B', 
  '3.KAT A', '3.KAT B', '4.KAT A', '4.KAT B', 
  '5.KAT A', '5.KAT B'
];

export default function BoardAddPage() {
  const [institutionId, setInstitutionId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [singleLoading, setSingleLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filtreler
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');

  // Transfer Detay Modalı State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferBoard, setSelectedTransferBoard] = useState(null);
  const [sourceInstName, setSourceInstName] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);
  
  // Tablo satırları
  const getEmptyRow = () => ({
    id: null,
    bina: '',
    kat: '',
    sinif_lab: '',
    et_tipi: '',
    et_yonu: '',
    et_boyutu: '',
    et_durumu: 'Kullanımda',
    isExisting: false,
    isEditing: true
  });
  
  const [rows, setRows] = useState(Array.from({ length: 15 }, getEmptyRow));

  useEffect(() => {
    async function fetchInstitutions() {
      const { data, error } = await supabase
        .from('kurum_kayit')
        .select('id, name, code, district_id')
        .order('name', { ascending: true });
      if (!error) setInstitutions(data || []);
    }
    async function fetchDistricts() {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name', { ascending: true });
      if (!error) setDistricts(data || []);
    }
    fetchInstitutions();
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (institutionId) {
      fetchExistingBoards(institutionId);
    } else {
      setRows(Array.from({ length: 15 }, getEmptyRow));
    }
  }, [institutionId]);

  const fetchExistingBoards = async (instId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('et_detay')
      .select('*')
      .eq('institution_id', instId)
      .order('id', { ascending: true });
    
    setLoading(false);
    if (error) {
        setErrorMsg('Tahtalar getirilirken hata oluştu: ' + error.message);
        setRows(Array.from({ length: 15 }, getEmptyRow));
        return;
    }

    const existingRows = (data || []).map(d => ({
        ...d,
        isExisting: true,
        isEditing: false
    }));
    
    setRows([...existingRows, ...Array.from({ length: 10 }, getEmptyRow)]);
  };

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const districtMatch = !filterDistrict || String(inst.district_id) === String(filterDistrict);
      const codeMatch = !filterCode || inst.code?.toLowerCase().includes(filterCode.toLowerCase());
      const nameMatch = !filterName || inst.name?.toLowerCase().includes(filterName.toLowerCase());
      return districtMatch && codeMatch && nameMatch;
    });
  }, [institutions, filterDistrict, filterCode, filterName]);

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const toggleEditRow = (index) => {
    const newRows = [...rows];
    newRows[index].isEditing = !newRows[index].isEditing;
    setRows(newRows);
  };

  const handleSingleSave = async (index) => {
    const row = rows[index];
    if (!row.kat || !row.sinif_lab || !row.et_tipi) {
        setErrorMsg('Kat, Sınıf/Lab ve ET Tipi boş bırakılamaz.');
        setTimeout(() => setErrorMsg(''), 5000);
        return;
    }
    
    setSingleLoading(index);
    setErrorMsg('');
    setSuccessMsg('');
    
    const updateData = {
      bina: row.bina,
      kat: row.kat,
      sinif_lab: row.sinif_lab,
      et_tipi: row.et_tipi,
      et_yonu: row.et_yonu,
      et_boyutu: row.et_boyutu,
      et_durumu: row.et_durumu
    };

    const { error } = await supabase
      .from('et_detay')
      .update(updateData)
      .eq('id', row.id);
      
    setSingleLoading(null);
    
    if (error) {
      setErrorMsg('Güncelleme hatası: ' + error.message);
    } else {
      setSuccessMsg('Tahta başarıyla güncellendi.');
      const newRows = [...rows];
      newRows[index].isEditing = false;
      setRows(newRows);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const deleteExistingRow = async (index, id) => {
     if (!window.confirm('Bu tahtayı silmek istediğinize emin misiniz?')) return;
     
     setSingleLoading(index);
     const { error } = await supabase.from('et_detay').delete().eq('id', id);
     setSingleLoading(null);
     
     if (error) {
         setErrorMsg('Silme hatası: ' + error.message);
     } else {
         setSuccessMsg('Tahta başarıyla silindi.');
         removeRow(index);
         setTimeout(() => setSuccessMsg(''), 3000);
     }
  };

  const addMoreRows = (count) => {
    setRows([...rows, ...Array.from({ length: count }, getEmptyRow)]);
  };

  const removeRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    
    if (!institutionId) {
      setErrorMsg('Lütfen önce bir kurum seçiniz!');
      return;
    }

    const newValidRows = rows.filter(r => !r.isExisting && (r.kat.trim() !== '' || r.sinif_lab.trim() !== '' || r.et_tipi !== ''));
    
    if (newValidRows.length === 0) {
      setErrorMsg('Eklenecek yeni tahta bilgisi bulunamadı. Mevcut tahtaları satırındaki "Düzenle" butonundan güncelleyebilirsiniz.');
      return;
    }

    for (const r of newValidRows) {
      if (!r.kat || !r.sinif_lab || !r.et_tipi) {
        setErrorMsg('Doldurduğunuz yeni satırlarda "Kat", "Sınıf/Lab" ve "ET Tipi" kısımlarını boş bırakmayınız.');
        return;
      }
    }

    setLoading(true);

    const insertData = newValidRows.map(r => ({
      institution_id: institutionId,
      bina: r.bina,
      kat: r.kat,
      sinif_lab: r.sinif_lab,
      et_tipi: r.et_tipi,
      et_yonu: r.et_yonu,
      et_boyutu: r.et_boyutu,
      et_durumu: r.et_durumu
    }));

    const { error: insertError } = await supabase
      .from('et_detay')
      .insert(insertData);

    setLoading(false);
    
    if (insertError) {
      setErrorMsg('Kayıt hatası: ' + insertError.message);
    } else {
      setSuccessMsg(`${insertData.length} adet yeni Etkileşimli Tahta başarıyla eklendi!`);
      fetchExistingBoards(institutionId);
    }
  };

  const handleShowTransferDetails = async (board) => {
    setSelectedTransferBoard(board);
    setShowTransferModal(true);
    setSourceInstName('');
    setLoadingSource(true);

    if (board.transfer_from) {
       const { data: instData } = await supabase.from('kurum_kayit').select('name').eq('id', board.transfer_from).single();
       if (instData) setSourceInstName(instData.name);
       else setSourceInstName('Bilinmiyor');
    } else {
       setSourceInstName('Kayıt Bulunamadı');
    }
    setLoadingSource(false);
  };

  const selectedInst = institutions.find(i => i.id === institutionId);

  return (
    <Container fluid className="py-4">
      <Card className="shadow-lg mx-auto border-0" style={{ background: 'linear-gradient(135deg, #f6faff 0%, #eaf1fb 100%)' }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center mb-4 gap-3">
            <span className="rounded-circle bg-primary bg-gradient d-flex align-items-center justify-content-center shadow" style={{ width: 54, height: 54 }}>
              <i className="fas fa-chalkboard fa-2x text-white"></i>
            </span>
            <h3 className="fw-bold text-primary mb-0" style={{ letterSpacing: '0.5px' }}>Toplu Tahta Ekleme Çizelgesi</h3>
          </div>
          
          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
          {successMsg && <Alert variant="success">{successMsg}</Alert>}

          {/* Arama Alanı */}
          <Card className="mb-4 shadow-sm border-0" style={{ background: '#fafdff' }}>
            <Card.Body>
              <h5 className="mb-3 text-secondary"><i className="fas fa-search me-2"></i>Kurum Ara ve Seç</h5>
              <Row className="g-3 align-items-end">
                <Col md={3}>
                  <Form.Group controlId="filterDistrict">
                    <Form.Label className="fw-bold mb-1"><i className="fas fa-map-marker-alt text-primary me-2"></i>İlçe</Form.Label>
                    <Form.Select
                      value={filterDistrict}
                      onChange={e => setFilterDistrict(e.target.value)}
                      className="form-select-sm"
                    >
                      <option value="">Tümü</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="filterCode">
                    <Form.Label className="fw-bold mb-1"><i className="fas fa-barcode text-secondary me-2"></i>Kurum Kodu</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Kurum kodu ile ara..."
                      value={filterCode}
                      onChange={e => setFilterCode(e.target.value)}
                      className="form-control-sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={5}>
                  <Form.Group controlId="filterName">
                    <Form.Label className="fw-bold mb-1"><i className="fas fa-building text-info me-2"></i>Kurum Adı</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Kurum adı ile ara..."
                      value={filterName}
                      onChange={e => setFilterName(e.target.value)}
                      className="form-control-sm"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Sonuç Listesi */}
              {(filterDistrict || filterCode || filterName) && (
                <div className="mt-4">
                  <h6 className="text-secondary mb-2">Arama Sonuçları ({filteredInstitutions.length} kurum bulundu)</h6>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                    <Table hover responsive size="sm" className="mb-0 bg-white align-middle">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Kurum Adı</th>
                          <th>Kod</th>
                          <th className="text-end">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInstitutions.slice(0, 50).map(inst => (
                          <tr key={inst.id} className={institutionId === inst.id ? 'table-primary' : ''}>
                            <td>{inst.name}</td>
                            <td>{inst.code}</td>
                            <td className="text-end">
                              {institutionId === inst.id ? (
                                <Button variant="success" size="sm" disabled><i className="fas fa-check"></i> Seçildi</Button>
                              ) : (
                                <Button variant="outline-primary" size="sm" onClick={() => setInstitutionId(inst.id)}>
                                  Seç
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredInstitutions.length === 0 && (
                          <tr><td colSpan="3" className="text-center text-muted">Aramaya uygun kurum bulunamadı.</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Veri Giriş Izgarası (Grid) */}
          <Form onSubmit={handleSubmit}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-primary text-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-table me-2"></i> 
                  {selectedInst ? `Tahta Eklenecek Kurum: ${selectedInst.name}` : 'Lütfen yukarıdan kurum seçiniz...'}
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <Table bordered hover striped size="sm" className="mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
                    <thead className="bg-white text-primary sticky-top">
                      <tr className="text-center">
                        <th style={{ width: '40px' }}>#</th>
                        <th style={{ minWidth: '100px' }}>Bina</th>
                        <th style={{ minWidth: '110px' }}>Kat</th>
                        <th style={{ minWidth: '140px' }}>Sınıf / Lab</th>
                        <th style={{ minWidth: '120px' }}>ET Tipi</th>
                        <th style={{ minWidth: '90px' }}>ET Yönü</th>
                        <th style={{ minWidth: '90px' }}>ET Boyutu</th>
                        <th style={{ minWidth: '110px' }}>ET Durumu</th>
                        <th style={{ width: '100px' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const isRowDisabled = !institutionId || (row.isExisting && !row.isEditing) || singleLoading === idx;
                        const tStyle = (row.isExisting && row.is_transferred && !row.isEditing) ? { color: '#dc3545', fontWeight: 'bold' } : {};
                        const trClass = row.isExisting 
                          ? (row.isEditing ? 'table-warning' : (row.is_transferred ? 'table-danger' : 'table-light')) 
                          : '';

                        return (
                        <tr key={row.id || idx} className={trClass}>
                          <td className="text-center fw-bold align-middle">
                             {idx + 1}
                             {row.is_transferred && (
                                <div 
                                  onClick={() => handleShowTransferDetails(row)}
                                  className="badge bg-danger mt-1 text-white text-uppercase"
                                  style={{fontSize: '0.65rem', cursor: 'pointer', display: 'block'}}
                                  title="Transfer Detayını Gör"
                                >
                                  Transfer
                                </div>
                             )}
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={row.bina}
                              onChange={e => handleRowChange(idx, 'bina', e.target.value)}
                              disabled={isRowDisabled}
                              style={tStyle}
                            >
                              <option value="">Seçiniz</option>
                              <option value="Ana Bina">Ana Bina</option>
                              <option value="Ek Bina">Ek Bina</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={row.kat}
                              onChange={e => handleRowChange(idx, 'kat', e.target.value)}
                              disabled={isRowDisabled}
                              style={tStyle}
                            >
                              <option value="">Seçiniz</option>
                              {KAT_OPTIONS.map(ko => <option key={ko} value={ko}>{ko}</option>)}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control
                              type="text"
                              size="sm"
                              value={row.sinif_lab}
                              onChange={e => handleRowChange(idx, 'sinif_lab', e.target.value)}
                              placeholder="Sınıf Adı"
                              disabled={isRowDisabled}
                              style={tStyle}
                            />
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={row.et_tipi}
                              onChange={e => handleRowChange(idx, 'et_tipi', e.target.value)}
                              disabled={isRowDisabled}
                              style={tStyle}
                            >
                              <option value="">Seçiniz</option>
                              {BOARD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={row.et_yonu}
                              onChange={e => handleRowChange(idx, 'et_yonu', e.target.value)}
                              disabled={isRowDisabled}
                              style={tStyle}
                            >
                              <option value="">Seçiniz</option>
                              <option value="Sağ">Sağ</option>
                              <option value="Sol">Sol</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={row.et_boyutu}
                              onChange={e => handleRowChange(idx, 'et_boyutu', e.target.value)}
                              disabled={isRowDisabled}
                              style={tStyle}
                            >
                              <option value="">Seçiniz</option>
                              <option value="3.40">3.40</option>
                              <option value="2.60">2.60</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={row.et_durumu}
                              onChange={e => handleRowChange(idx, 'et_durumu', e.target.value)}
                              disabled={isRowDisabled}
                              style={tStyle}
                            >
                              {BOARD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </Form.Select>
                          </td>
                          <td className="text-center align-middle" style={{ minWidth: '90px' }}>
                            {row.isExisting ? (
                                row.isEditing ? (
                                    <div className="d-flex gap-1 justify-content-center">
                                        <Button variant="success" size="sm" onClick={() => handleSingleSave(idx)} disabled={singleLoading === idx} title="Kaydet">
                                           {singleLoading === idx ? <Spinner size="sm" animation="border" /> : <i className="fas fa-save"></i>}
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => toggleEditRow(idx)} disabled={singleLoading === idx} title="İptal">
                                           <i className="fas fa-times"></i>
                                        </Button>
                                    </div>
                                ) : (
                                     <div className="d-flex gap-1 justify-content-center">
                                        <Button variant="warning" size="sm" onClick={() => toggleEditRow(idx)} title="Düzenle">
                                            <i className="fas fa-edit"></i>
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => deleteExistingRow(idx, row.id)} title="Sil">
                                            <i className="fas fa-trash"></i>
                                        </Button>
                                    </div>
                                )
                            ) : (
                                <Button 
                                  variant="outline-danger" 
                                  size="sm" 
                                  onClick={() => removeRow(idx)}
                                  disabled={!institutionId}
                                  title="Satırı Kaldır"
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                            )}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
              <Card.Footer className="bg-light d-flex justify-content-between align-items-center p-3">
                <div>
                  <Button variant="outline-primary" size="sm" onClick={() => addMoreRows(5)} disabled={!institutionId} className="me-2">
                    <i className="fas fa-plus"></i> 5 Satır Ekle
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => addMoreRows(1)} disabled={!institutionId}>
                    <i className="fas fa-plus"></i> 1 Satır Ekle
                  </Button>
                </div>
                <div>
                  <span className="text-muted me-3">Yeni doldurduğunuz satırlar tek seferde kaydedilecektir.</span>
                  <Button
                    type="submit"
                    variant="success"
                    className="fw-bold px-4 py-2 shadow"
                    disabled={loading || !institutionId}
                  >
                    <i className="fas fa-save me-2"></i> Toplu Kaydet (Yeni)
                    {loading && <Spinner animation="border" size="sm" className="ms-2" />}
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Form>
        </Card.Body>
      </Card>
      
      {/* Transfer Detay Modalı */}
      <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title><i className="fas fa-info-circle me-2"></i>Transfer Detayları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransferBoard ? (
            <div className="p-3">
              <Row className="mb-3">
                <Col xs={5} className="fw-bold text-muted">Tahta Tipi:</Col>
                <Col xs={7}>{selectedTransferBoard.et_tipi}</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={5} className="fw-bold text-muted">Transfer Tarihi:</Col>
                <Col xs={7} className="fw-bold">{selectedTransferBoard.transfer_tarihi || '-'}</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={5} className="fw-bold text-muted">Resmi Yazı No:</Col>
                <Col xs={7} className="fw-bold">{selectedTransferBoard.resmi_yazi_no || '-'}</Col>
              </Row>
              <Row className="p-2 bg-light rounded border border-danger">
                <Col xs={5} className="fw-bold text-danger d-flex align-items-center">Geldiği Kurum:</Col>
                <Col xs={7}>
                  {loadingSource ? <Spinner animation="border" size="sm" variant="danger"/> : <span className="text-danger fw-bold">{sourceInstName}</span>}
                </Col>
              </Row>
            </div>
          ) : (
            <div className="text-center p-3"><Spinner animation="border" variant="danger"/></div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Tamam</Button>
        </Modal.Footer>
      </Modal>
      
    </Container>
  );
}