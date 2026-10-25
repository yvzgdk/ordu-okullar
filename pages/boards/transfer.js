import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Table, ListGroup, Badge } from 'react-bootstrap';

const BOARD_TYPES = [
  { key: 'vestel_black_boards', label: 'Vestel Siyah' },
  { key: 'vestel_grey_boards', label: 'Vestel Gri' },
  { key: 'arcelik_boards', label: 'Arçelik' },
  { key: 'aidata_boards', label: 'Aidata' },
];

const KAT_OPTIONS = [
  'ZEMİN', 'GİRİŞ', 
  '1.KAT', '2.KAT', '3.KAT', '4.KAT', '5.KAT',
  '1.KAT A', '1.KAT B', '2.KAT A', '2.KAT B', 
  '3.KAT A', '3.KAT B', '4.KAT A', '4.KAT B', 
  '5.KAT A', '5.KAT B'
];

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function BoardTransferPage() {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [districts, setDistricts] = useState([]);
  
  const [filterSourceDistrict, setFilterSourceDistrict] = useState('');
  const [filterSourceCode, setFilterSourceCode] = useState('');
  const [filterSourceName, setFilterSourceName] = useState('');
  
  const [filterTargetDistrict, setFilterTargetDistrict] = useState('');
  const [filterTargetCode, setFilterTargetCode] = useState('');
  const [filterTargetName, setFilterTargetName] = useState('');
  
  const [targetBina, setTargetBina] = useState('');
  const [targetKat, setTargetKat] = useState('');
  const [targetSinif, setTargetSinif] = useState('');
  
  const [showSourceList, setShowSourceList] = useState(false);
  const [showTargetList, setShowTargetList] = useState(false);
  
  const [surplusBoards, setSurplusBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [transferDate, setTransferDate] = useState(getToday());
  const [officialLetterNo, setOfficialLetterNo] = useState('');
  
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  useEffect(() => {
    async function fetchInstitutions() {
      const { data, error } = await supabase
        .from('kurum_kayit')
        .select('id, name, code, district_id, vestel_black_boards, vestel_grey_boards, arcelik_boards, aidata_boards')
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

  // Fetch surplus boards for source
  useEffect(() => {
    async function fetchSurplusBoards() {
      if (!sourceId) {
        setSurplusBoards([]);
        setSelectedBoardIds([]);
        return;
      }
      setLoadingBoards(true);
      const { data, error } = await supabase
        .from('et_detay')
        .select('*')
        .eq('institution_id', sourceId)
        .eq('et_durumu', 'Fazlalık')
        .order('id', { ascending: true });
        
      setLoadingBoards(false);
      if (!error) {
         setSurplusBoards(data || []);
      }
    }
    fetchSurplusBoards();
  }, [sourceId]);

  // Transfer past
  useEffect(() => {
    async function fetchTransfers() {
      if (!sourceId && !targetId) {
        setTransfers([]);
        return;
      }
      setLoadingTransfers(true);
      let query = supabase
        .from('board_transfers')
        .select('*')
        .order('date', { ascending: false });
      if (sourceId && targetId) {
        query = query.or(`from_institution_id.eq.${sourceId},to_institution_id.eq.${sourceId},from_institution_id.eq.${targetId},to_institution_id.eq.${targetId}`);
      } else if (sourceId) {
        query = query.or(`from_institution_id.eq.${sourceId},to_institution_id.eq.${sourceId}`);
      } else if (targetId) {
        query = query.or(`from_institution_id.eq.${targetId},to_institution_id.eq.${targetId}`);
      }
      const { data, error } = await query;
      setTransfers(data || []);
      setLoadingTransfers(false);
    }
    fetchTransfers();
  }, [sourceId, targetId]);

  const getInstitutionName = (id) => {
    const inst = institutions.find(i => String(i.id) === String(id));
    return inst ? `${inst.name}${inst.code ? ' (' + inst.code + ')' : ''}` : '-';
  };

  const getBoardTypeLabel = (key) => {
    const t = BOARD_TYPES.find(t => t.key === key);
    return t ? t.label : key;
  };

  const filteredSourceInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const districtMatch = !filterSourceDistrict || String(inst.district_id) === String(filterSourceDistrict);
      const codeMatch = !filterSourceCode || inst.code?.toLowerCase().includes(filterSourceCode.toLowerCase());
      const nameMatch = !filterSourceName || inst.name?.toLowerCase().includes(filterSourceName.toLowerCase());
      return districtMatch && codeMatch && nameMatch;
    });
  }, [institutions, filterSourceDistrict, filterSourceCode, filterSourceName]);

  const filteredTargetInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const districtMatch = !filterTargetDistrict || String(inst.district_id) === String(filterTargetDistrict);
      const codeMatch = !filterTargetCode || inst.code?.toLowerCase().includes(filterTargetCode.toLowerCase());
      const nameMatch = !filterTargetName || inst.name?.toLowerCase().includes(filterTargetName.toLowerCase());
      return districtMatch && codeMatch && nameMatch;
    });
  }, [institutions, filterTargetDistrict, filterTargetCode, filterTargetName]);

  const handleBoardToggle = (id) => {
     if (selectedBoardIds.includes(id)) {
        setSelectedBoardIds(selectedBoardIds.filter(bid => bid !== id));
     } else {
        setSelectedBoardIds([...selectedBoardIds, id]);
     }
  };
  
  const handleSelectAll = () => {
     if (selectedBoardIds.length === surplusBoards.length) {
         setSelectedBoardIds([]);
     } else {
         setSelectedBoardIds(surplusBoards.map(b => b.id));
     }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (!sourceId || !targetId) {
      setErrorMsg('Lütfen kaynak ve hedef kurumu seçiniz.');
      return;
    }
    if (sourceId === targetId) {
      setErrorMsg('Kaynak ve hedef kurum aynı olamaz!');
      return;
    }
    if (selectedBoardIds.length === 0) {
      setErrorMsg('Lütfen transfer edilecek en az bir tahta seçiniz.');
      return;
    }
    if (!transferDate || !officialLetterNo) {
      setErrorMsg('Lütfen transfer tarihi ve resmi yazı numarasını giriniz.');
      return;
    }
    
    setLoading(true);
    
    // Update et_detay table
    const { error: updateErr } = await supabase
       .from('et_detay')
       .update({
           institution_id: targetId,
           et_durumu: 'Kullanımda',
           is_transferred: true,
           transfer_tarihi: transferDate,
           resmi_yazi_no: officialLetterNo,
           transfer_from: sourceId,
           bina: targetBina || '',
           kat: targetKat || '',
           sinif_lab: targetSinif || ''
       })
       .in('id', selectedBoardIds);
       
    if (updateErr) {
       setErrorMsg('Transfer güncellenirken hata oluştu: ' + updateErr.message);
       setLoading(false);
       return;
    }

    // Maintain backwards compatibility with legacy institutions table counts
    const countsByType = {
       'Vestel Siyah': 0, 'Vestel Gri': 0, 'Arçelik': 0, 'Aidata': 0
    };
    
    selectedBoardIds.forEach(id => {
       const b = surplusBoards.find(x => x.id === id);
       if (b && countsByType[b.et_tipi] !== undefined) {
           countsByType[b.et_tipi]++;
       }
    });
    
    const dbTypeMap = {
       'Vestel Siyah': 'vestel_black_boards',
       'Vestel Gri': 'vestel_grey_boards',
       'Arçelik': 'arcelik_boards',
       'Aidata': 'aidata_boards'
    };
    
    const sourceInst = institutions.find(i => String(i.id) === String(sourceId));
    const targetInst = institutions.find(i => String(i.id) === String(targetId));
    
    if (sourceInst && targetInst) {
        let sourceUpdate = {};
        let targetUpdate = {};
        for(let type in countsByType) {
           if (countsByType[type] > 0) {
              const dbKey = dbTypeMap[type];
              sourceUpdate[dbKey] = Math.max(0, parseInt(sourceInst[dbKey] || 0, 10) - countsByType[type]);
              targetUpdate[dbKey] = parseInt(targetInst[dbKey] || 0, 10) + countsByType[type];
           }
        }
        
        if (Object.keys(sourceUpdate).length > 0) {
            const sTotal = (sourceUpdate.vestel_black_boards ?? sourceInst.vestel_black_boards ?? 0) +
                           (sourceUpdate.vestel_grey_boards ?? sourceInst.vestel_grey_boards ?? 0) +
                           (sourceUpdate.arcelik_boards ?? sourceInst.arcelik_boards ?? 0) +
                           (sourceUpdate.aidata_boards ?? sourceInst.aidata_boards ?? 0);
            const tTotal = (targetUpdate.vestel_black_boards ?? targetInst.vestel_black_boards ?? 0) +
                           (targetUpdate.vestel_grey_boards ?? targetInst.vestel_grey_boards ?? 0) +
                           (targetUpdate.arcelik_boards ?? targetInst.arcelik_boards ?? 0) +
                           (targetUpdate.aidata_boards ?? targetInst.aidata_boards ?? 0);
            sourceUpdate.total_boards = sTotal;
            targetUpdate.total_boards = tTotal;

            await supabase.from('kurum_kayit').update(sourceUpdate).eq('id', sourceId);
            await supabase.from('kurum_kayit').update(targetUpdate).eq('id', targetId);
        }
    }
    
    // Maintain transfer history records for `board_transfers` table
    const transferInserts = [];
    for(let type in countsByType) {
       if (countsByType[type] > 0) {
          transferInserts.push({
             date: transferDate,
             board_type: dbTypeMap[type],
             count: countsByType[type],
             from_institution_id: parseInt(sourceId, 10),
             to_institution_id: parseInt(targetId, 10),
          });
       }
    }
    if (transferInserts.length > 0) {
       await supabase.from('board_transfers').insert(transferInserts);
    }
    
    setLoading(false);
    setSuccessMsg('Tahta transferi başarıyla gerçekleşti!');
    
    // Refresh the surplus boards
    setTargetId('');
    setFilterTargetDistrict('');
    setFilterTargetCode('');
    setFilterTargetName('');
    setSelectedBoardIds([]);
    setOfficialLetterNo('');
    setTargetBina('');
    setTargetKat('');
    setTargetSinif('');
    
    // To trigger source surplus boards re-fetch:
    const temp = sourceId;
    setSourceId('');
    setTimeout(() => setSourceId(temp), 50);
  };

  return (
    <Container className="py-4">
      <Card className="shadow-lg mx-auto border-0" style={{ maxWidth: 900, background: 'linear-gradient(135deg, #f6faff 0%, #eaf1fb 100%)' }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center mb-4 gap-3">
            <span className="rounded-circle bg-success bg-gradient d-flex align-items-center justify-content-center shadow" style={{ width: 54, height: 54 }}>
              <i className="fas fa-random fa-2x text-white"></i>
            </span>
            <h3 className="fw-bold text-success mb-0" style={{ letterSpacing: '0.5px' }}>Tahta Transfer</h3>
          </div>
          <Form onSubmit={handleSubmit}>
            {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
            {successMsg && <Alert variant="success">{successMsg}</Alert>}
            
            <Row className="mb-4">
               {/* Kaynak Kurum */}
               <Col md={12}>
                  <Form.Group style={{ position: 'relative' }}>
                    <Form.Label className="fw-bold mb-3"><i className="fas fa-arrow-circle-left text-danger me-2"></i>Tahtanın Alınacağı Kurum (Fazlalık Tahtalar Aranır)</Form.Label>
                    
                    <Row className="g-3 mb-2">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>İlçe</Form.Label>
                          <Form.Select
                            value={filterSourceDistrict}
                            onChange={e => { setFilterSourceDistrict(e.target.value); setShowSourceList(true); setSourceId(''); }}
                            className="form-select"
                            disabled={loading}
                          >
                            <option value="">Tümü</option>
                            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Kurum Kodu</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Kod ile ara..."
                            value={filterSourceCode}
                            onChange={e => { setFilterSourceCode(e.target.value); setShowSourceList(true); setSourceId(''); }}
                            className="form-control"
                            onFocus={() => setShowSourceList(true)}
                            disabled={loading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Kurum Adı</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Ad ile ara..."
                            value={filterSourceName}
                            onChange={e => { setFilterSourceName(e.target.value); setShowSourceList(true); setSourceId(''); }}
                            className="form-control"
                            onFocus={() => setShowSourceList(true)}
                            disabled={loading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {showSourceList && (filterSourceDistrict || filterSourceCode || filterSourceName) && filteredSourceInstitutions.length > 0 && (
                      <ListGroup style={{ position: 'absolute', zIndex: 10, width: '100%', maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 16px #0001', top: '100%' }}>
                        {filteredSourceInstitutions.slice(0, 20).map(inst => (
                          <ListGroup.Item
                            key={inst.id}
                            action
                            active={String(sourceId) === String(inst.id)}
                            onClick={() => {
                              setSourceId(inst.id);
                              setFilterSourceDistrict(inst.district_id || '');
                              setFilterSourceCode(inst.code || '');
                              setFilterSourceName(inst.name || '');
                              setShowSourceList(false);
                            }}
                            className="d-flex align-items-center gap-2"
                          >
                            <i className="fas fa-school text-primary"></i>
                            <span>{inst.name} {inst.code ? <span className="text-muted">({inst.code})</span> : ''}</span>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </Form.Group>
               </Col>
            </Row>

            {/* Surplus Boards Listing */}
            {sourceId && (
               <div className="mb-4 p-3 bg-white border rounded shadow-sm">
                  <h6 className="fw-bold text-secondary mb-3">Seçilen Kurumdaki Fazlalık Tahtalar <Badge bg="danger">{surplusBoards.length}</Badge></h6>
                  {loadingBoards ? (
                    <Spinner animation="border" size="sm" /> 
                  ) : surplusBoards.length > 0 ? (
                    <div className="table-responsive" style={{ maxHeight: '250px' }}>
                        <Table size="sm" striped hover bordered className="mb-0">
                           <thead className="table-light sticky-top">
                              <tr>
                                 <th style={{ width: '40px' }} className="text-center">
                                    <Form.Check 
                                       type="checkbox" 
                                       checked={selectedBoardIds.length === surplusBoards.length && surplusBoards.length > 0} 
                                       onChange={handleSelectAll} 
                                    />
                                 </th>
                                 <th>Bina / Kat</th>
                                 <th>Sınıf / Lab</th>
                                 <th>ET Tipi</th>
                                 <th>Boyut / Yön</th>
                              </tr>
                           </thead>
                           <tbody>
                              {surplusBoards.map(b => (
                                 <tr key={b.id}>
                                    <td className="text-center align-middle">
                                       <Form.Check 
                                          type="checkbox" 
                                          checked={selectedBoardIds.includes(b.id)} 
                                          onChange={() => handleBoardToggle(b.id)} 
                                       />
                                    </td>
                                    <td className="align-middle">{b.bina || '-'} / {b.kat || '-'}</td>
                                    <td className="align-middle">{b.sinif_lab || '-'}</td>
                                    <td className="align-middle">{b.et_tipi}</td>
                                    <td className="align-middle">{b.et_boyutu} / {b.et_yonu}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </Table>
                    </div>
                  ) : (
                    <Alert variant="info" className="mb-0">Bu kuruma ait "Fazlalık" durumunda kayıtlı etkileşimli tahta bulunmamaktadır.</Alert>
                  )}
               </div>
            )}

            {/* Hedef Kurum */}
            <Row className="mb-4 mt-2">
              <Col md={12}>
                <Form.Group style={{ position: 'relative' }}>
                  <Form.Label className="fw-bold mb-3"><i className="fas fa-arrow-circle-right text-success me-2"></i>Tahtanın Gönderileceği Kurum</Form.Label>
                  
                  <Row className="g-3 mb-2">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>İlçe</Form.Label>
                        <Form.Select
                          value={filterTargetDistrict}
                          onChange={e => { setFilterTargetDistrict(e.target.value); setShowTargetList(true); setTargetId(''); }}
                          className="form-select"
                          disabled={!sourceId || surplusBoards.length === 0}
                        >
                          <option value="">Tümü</option>
                          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Kurum Kodu</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Kod ile ara..."
                          value={filterTargetCode}
                          onChange={e => { setFilterTargetCode(e.target.value); setShowTargetList(true); setTargetId(''); }}
                          className="form-control"
                          onFocus={() => setShowTargetList(true)}
                          disabled={!sourceId || surplusBoards.length === 0}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Kurum Adı</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Ad ile ara..."
                          value={filterTargetName}
                          onChange={e => { setFilterTargetName(e.target.value); setShowTargetList(true); setTargetId(''); }}
                          className="form-control"
                          onFocus={() => setShowTargetList(true)}
                          disabled={!sourceId || surplusBoards.length === 0}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {showTargetList && (filterTargetDistrict || filterTargetCode || filterTargetName) && filteredTargetInstitutions.length > 0 && (
                    <ListGroup style={{ position: 'absolute', zIndex: 10, width: '100%', maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 16px #0001', top: '100%' }}>
                      {filteredTargetInstitutions.slice(0, 20).map(inst => (
                        <ListGroup.Item
                          key={inst.id}
                          action
                          active={String(targetId) === String(inst.id)}
                          onClick={() => {
                            setTargetId(inst.id);
                            setFilterTargetDistrict(inst.district_id || '');
                            setFilterTargetCode(inst.code || '');
                            setFilterTargetName(inst.name || '');
                            setShowTargetList(false);
                          }}
                          className="d-flex align-items-center gap-2"
                        >
                          <i className="fas fa-school text-primary"></i>
                          <span>{inst.name} {inst.code ? <span className="text-muted">({inst.code})</span> : ''}</span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {/* ET Kurulum Bilgileri */}
            {targetId && (
            <Row className="mb-4">
              <Col md={12}>
                <div className="p-3 border rounded bg-white shadow-sm">
                  <h6 className="fw-bold text-primary mb-3"><i className="fas fa-hammer me-2"></i>ET'nin Kurulacağı Yer Bilgileri</h6>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Bina</Form.Label>
                        <Form.Select value={targetBina} onChange={e => setTargetBina(e.target.value)}>
                          <option value="">Seçiniz</option>
                          <option value="Ana Bina">Ana Bina</option>
                          <option value="Ek Bina">Ek Bina</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Kat</Form.Label>
                        <Form.Select value={targetKat} onChange={e => setTargetKat(e.target.value)}>
                          <option value="">Seçiniz</option>
                          {KAT_OPTIONS.map(ko => <option key={ko} value={ko}>{ko}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="mb-1 text-muted" style={{fontSize: '0.9rem'}}>Sınıf / Lab</Form.Label>
                        <Form.Control type="text" placeholder="Örn: 9/A, Fen Lab" value={targetSinif} onChange={e => setTargetSinif(e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="mt-2 text-muted" style={{fontSize: '0.8rem'}}>
                    * Boş bırakabilirsiniz. Birden fazla tahta seçili ise ayarlanan bu kısımlar tüm tahtalara uygulanacaktır.
                  </div>
                </div>
              </Col>
            </Row>
            )}

            {/* Tarih, Resmi Yazı ve Gönder */}
            <Row className="g-3 align-items-end mb-3 mt-2">
              <Col md={4}>
                <Form.Group controlId="transferDate">
                  <Form.Label className="fw-bold mb-1"><i className="fas fa-calendar-alt text-info me-2"></i>Transfer Tarihi</Form.Label>
                  <Form.Control
                    type="date"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    required
                    className="form-control-lg"
                    style={{ fontSize: '1rem', fontFamily: 'inherit', fontWeight: 600 }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="officialLetterNo">
                  <Form.Label className="fw-bold mb-1"><i className="fas fa-file-signature text-secondary me-2"></i>Resmi Yazı No</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Örn: 1234567"
                    value={officialLetterNo}
                    onChange={e => setOfficialLetterNo(e.target.value)}
                    required
                    className="form-control-lg"
                    style={{ fontSize: '1rem', fontFamily: 'inherit', fontWeight: 600 }}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end justify-content-end gap-2">
                <Button
                  type="submit"
                  variant="success"
                  className="rounded-pill px-4 py-2 fw-bold fs-6 d-flex align-items-center gap-2 shadow w-100 justify-content-center"
                  style={{ height: 48 }}
                  disabled={loading || selectedBoardIds.length === 0}
                >
                  <i className="fas fa-random"></i> Gönder
                  {loading && <Spinner animation="border" size="sm" className="ms-2" />}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      {/* Transfer Geçmişi Tablosu */}
      {(sourceId || targetId) && (
        <Card className="shadow-sm mx-auto mt-4" style={{ maxWidth: 900 }}>
          <Card.Body>
            <h5 className="fw-bold text-primary mb-3">
              <i className="fas fa-history me-2"></i>
              Seçili Kurum(lar) Tahta Transfer Geçmişi
            </h5>
            {loadingTransfers ? (
              <div className="text-center py-4"><Spinner animation="border" /></div>
            ) : (
              <Table hover responsive className="align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Tarih</th>
                    <th>Tahta Tipi</th>
                    <th>Adet</th>
                    <th>Gönderen Kurum</th>
                    <th>Alan Kurum</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(tr => (
                    <tr key={tr.id}>
                      <td>{tr.date}</td>
                      <td>{getBoardTypeLabel(tr.board_type)}</td>
                      <td>{tr.count}</td>
                      <td>{getInstitutionName(tr.from_institution_id)}</td>
                      <td>{getInstitutionName(tr.to_institution_id)}</td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted">Transfer geçmişi bulunamadı.</td></tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}