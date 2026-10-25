import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Spinner, Button, Table, InputGroup } from 'react-bootstrap';

const fetcher = async (key) => {
  if (key === 'institutions') {
    const { data } = await supabase.from('kurum_kayit').select('*');
    return data || [];
  }
  if (key === 'districts') {
    const { data } = await supabase.from('districts').select('id, name').order('name', { ascending: true });
    return data || [];
  }
  return null;
};

export default function InstitutionDetailPage() {
  const { data: institutions = [], isLoading: loadingInst } = useSWR('institutions', fetcher);
  const { data: districts = [] } = useSWR('districts', fetcher);
  const router = useRouter();

  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const districtMatch = !filterDistrict || String(inst.district_id) === String(filterDistrict);
      const codeMatch = filterCode.trim() === '' || (inst.code || '').toLowerCase().includes(filterCode.toLowerCase());
      const nameMatch = filterName.trim() === '' || (inst.name || '').toLowerCase().includes(filterName.toLowerCase());
      const statusMatch = !filterStatus || inst.status === filterStatus;
      return districtMatch && codeMatch && nameMatch && statusMatch;
    });
  }, [institutions, filterDistrict, filterCode, filterName, filterStatus]);

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <span className="rounded-circle bg-primary bg-gradient d-flex align-items-center justify-content-center shadow" style={{ width: 54, height: 54 }}>
          <i className="fas fa-list-alt fa-2x text-white"></i>
        </span>
        <h2 className="fw-bold mb-0" style={{ color: '#1a237e', letterSpacing: '0.5px' }}>Kurum Detay Sayfası</h2>
      </div>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-2 align-items-end flex-nowrap">
            <Col xs={6} sm={3} md={2} lg={2} xl={2}>
              <Form.Group controlId="filterDistrict">
                <Form.Label className="fw-bold" style={{ fontSize: '1rem', fontFamily: 'inherit' }}>İlçe</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="fas fa-map-marker-alt text-primary"></i>
                  </InputGroup.Text>
                  <Form.Select
                    value={filterDistrict}
                    onChange={e => setFilterDistrict(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '1rem', fontFamily: 'inherit' }}
                  >
                    <option value="">Seçiniz</option>
                    <option value="Tümü">Tümü</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Form.Select>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={6} sm={3} md={2} lg={2} xl={2}>
              <Form.Group controlId="filterCode">
                <Form.Label className="fw-bold" style={{ fontSize: '1rem', fontFamily: 'inherit' }}>Kurum Kodu</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="fas fa-barcode text-secondary"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Seçiniz"
                    value={filterCode}
                    onChange={e => setFilterCode(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '1rem', fontFamily: 'inherit' }}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Form.Group controlId="filterName">
                <Form.Label className="fw-bold" style={{ fontSize: '1rem', fontFamily: 'inherit' }}>Kurum Adı</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="fas fa-building text-info"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Seçiniz"
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '1rem', fontFamily: 'inherit' }}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={6} sm={3} md={2} lg={2} xl={2}>
              <Form.Group controlId="filterStatus">
                <Form.Label className="fw-bold" style={{ fontSize: '1rem', fontFamily: 'inherit' }}>Kurum Durumu</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="fas fa-user-check text-success"></i>
                  </InputGroup.Text>
                  <Form.Select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '1rem', fontFamily: 'inherit' }}
                  >
                    <option value="">Tümü</option>
                    <option value="ev_sahibi">Ev Sahibi</option>
                    <option value="misafir">Misafir</option>
                  </Form.Select>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={12} sm={12} md={2} lg={2} xl={2} className="d-grid">
              <Button
                size="md"
                onClick={() => { setFilterDistrict(''); setFilterCode(''); setFilterName(''); setFilterStatus(''); }}
                style={{ background: '#43a047', color: '#fff', border: 'none', fontSize: '1rem', fontFamily: 'inherit', minWidth: 0, padding: '0.5rem 0.5rem' }}
              >
                Filtreleri Temizle
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          {loadingInst ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : (
            (filterDistrict || filterCode || filterName || filterStatus) ? (
              <Table hover responsive className="align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>İlçe</th>
                    <th>Kurum Kodu</th>
                    <th>Kurum Adı</th>
                    <th>Kurum Durumu</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstitutions.map(inst => (
                    <tr key={inst.id}>
                      <td>{districts.find(d => d.id === inst.district_id)?.name || '-'}</td>
                      <td>{inst.code}</td>
                      <td>{inst.name}</td>
                      <td>{inst.status === 'ev_sahibi' ? 'Ev Sahibi' : inst.status === 'misafir' ? 'Misafir' : '-'}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => router.push(`/institutions/${inst.id}`)}
                        >
                          Kurum Detayı
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredInstitutions.length === 0 && (
                     <tr><td colSpan={5} className="text-center text-muted">Kriterlere uygun kurum bulunamadı.</td></tr>
                  )}
                </tbody>
              </Table>
            ) : (
              <div className="text-center text-muted py-4">Lütfen filtre seçin.</div>
            )
          )}
        </Card.Body>
      </Card>
    </Container>
  );
} 