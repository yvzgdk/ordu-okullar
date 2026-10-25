import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Table, Modal } from 'react-bootstrap';

export default function BoardDetailsPage() {
  const [institutionId, setInstitutionId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [boardDetails, setBoardDetails] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  
  // Filtreler
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');

  // Transfer Detay Modalı State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferBoard, setSelectedTransferBoard] = useState(null);
  const [sourceInstName, setSourceInstName] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);

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

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const districtMatch = !filterDistrict || String(inst.district_id) === String(filterDistrict);
      const codeMatch = !filterCode || inst.code?.toLowerCase().includes(filterCode.toLowerCase());
      const nameMatch = !filterName || inst.name?.toLowerCase().includes(filterName.toLowerCase());
      return districtMatch && codeMatch && nameMatch;
    });
  }, [institutions, filterDistrict, filterCode, filterName]);

  useEffect(() => {
    if (institutionId) {
      async function fetchBoards() {
        setLoadingBoards(true);
        const { data, error } = await supabase
          .from('et_detay')
          .select('*')
          .eq('institution_id', institutionId)
          .order('created_at', { ascending: true });
        
        if (!error) {
          setBoardDetails(data || []);
        } else {
          console.error("Tahta detayları çekilemedi", error);
        }
        setLoadingBoards(false);
      }
      fetchBoards();
    } else {
      setBoardDetails([]);
    }
  }, [institutionId]);

  const handleShowTransferDetails = async (board) => {
    setSelectedTransferBoard(board);
    setShowTransferModal(true);
    setSourceInstName('');
    setLoadingSource(true);

    if (board.transfer_from) {
       const { data: instData } = await supabase.from('kurum_kayit').select('name').eq('id', board.transfer_from).single();
       if (instData) {
         setSourceInstName(instData.name);
       } else {
         setSourceInstName('Bilinmiyor');
       }
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
            <span className="rounded-circle bg-info bg-gradient d-flex align-items-center justify-content-center shadow" style={{ width: 54, height: 54 }}>
              <i className="fas fa-list fa-2x text-white"></i>
            </span>
            <h3 className="fw-bold text-info mb-0" style={{ letterSpacing: '0.5px' }}>Kurum Tahta Detayları</h3>
          </div>

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
                          <tr key={inst.id} className={institutionId === inst.id ? 'table-info' : ''}>
                            <td>{inst.name}</td>
                            <td>{inst.code}</td>
                            <td className="text-end">
                              {institutionId === inst.id ? (
                                <Button variant="info" size="sm" className="text-white" disabled><i className="fas fa-check"></i> Seçildi</Button>
                              ) : (
                                <Button variant="outline-info" size="sm" onClick={() => setInstitutionId(inst.id)}>
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

          {/* Tahta Listesi Izgarası */}
          {institutionId && (
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-info text-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-chalkboard-teacher me-2"></i> 
                  {selectedInst ? `${selectedInst.name} - Kayıtlı Tahtalar` : 'Tahtalar'}
                </h5>
                <span className="badge bg-light text-info fs-6 px-3 rounded-pill shadow-sm">
                  Toplam: {boardDetails.length} Tahta
                </span>
              </Card.Header>
              <Card.Body className="p-0">
                {loadingBoards ? (
                  <div className="p-5 text-center">
                    <Spinner animation="border" variant="info" />
                    <p className="mt-3 text-muted">Tahtalar yükleniyor...</p>
                  </div>
                ) : boardDetails.length > 0 ? (
                  <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <Table bordered hover striped size="sm" className="mb-0 align-middle" style={{ fontSize: '0.95rem' }}>
                      <thead className="bg-white text-primary sticky-top">
                        <tr className="text-center">
                          <th style={{ width: '50px' }}>#</th>
                          <th>Bina</th>
                          <th>Kat</th>
                          <th>Sınıf / Lab</th>
                          <th>ET Tipi</th>
                          <th>ET Yönü</th>
                          <th>ET Boyutu</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boardDetails.map((board, idx) => {
                          const isTransferred = board.is_transferred;
                          const trClass = isTransferred ? "text-center table-danger text-danger fw-bold" : "text-center";
                          return (
                          <tr key={board.id || idx} className={trClass}>
                            <td>
                              {idx + 1}
                              {isTransferred && (
                                <div 
                                  onClick={() => handleShowTransferDetails(board)}
                                  className="badge bg-danger mt-1 text-white text-uppercase"
                                  style={{fontSize: '0.65rem', cursor: 'pointer', display: 'block'}}
                                  title="Transfer Detayını Gör"
                                >
                                  Transfer
                                </div>
                              )}
                            </td>
                            <td className={isTransferred ? "text-danger" : ""}>{board.bina || '-'}</td>
                            <td className={isTransferred ? "text-danger" : ""}>{board.kat || '-'}</td>
                            <td className={isTransferred ? "text-danger" : ""}>{board.sinif_lab || '-'}</td>
                            <td><span className={`badge ${isTransferred ? 'bg-danger' : 'bg-secondary'}`}>{board.et_tipi}</span></td>
                            <td className={isTransferred ? "text-danger" : ""}>{board.et_yonu || '-'}</td>
                            <td className={isTransferred ? "text-danger" : ""}>{board.et_boyutu || '-'}</td>
                            <td>
                              <span className={`badge ${board.et_durumu === 'Kullanımda' ? 'bg-success' : 'bg-danger'}`}>
                                {board.et_durumu}
                              </span>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <div className="text-muted mb-3"><i className="fas fa-folder-open fa-3x opacity-50"></i></div>
                    <h5>Bu kuruma ait kayıtlı tahta bulunamadı.</h5>
                    <p className="text-muted">Yukarıdaki menüden "Tahta Ekle" sekmesine giderek bu kuruma yeni etkileşimli tahtalar ekleyebilirsiniz.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

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
