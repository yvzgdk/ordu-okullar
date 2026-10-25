import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

export default function BtrAdd() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    email: '',
    district_id: '',
    institution_id: '',
    institution_id_2: '',
    assignment_date: '',
    status: 'Aktif'
  });

  useEffect(() => {
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (formData.district_id) {
      fetchInstitutions(formData.district_id);
    } else {
      setInstitutions([]);
    }
  }, [formData.district_id]);

  const fetchDistricts = async () => {
    const { data, error } = await supabase
      .from('districts')
      .select('id, name')
      .order('name');
    if (data) setDistricts(data);
  };

  const fetchInstitutions = async (districtId) => {
    const { data, error } = await supabase
      .from('kurum_kayit')
      .select('id, name')
      .eq('district_id', districtId)
      .order('name');
    if (data) setInstitutions(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = { ...formData };
      if (payload.institution_id_2 === '') {
        payload.institution_id_2 = null;
      }

      const { data, error } = await supabase
        .from('btr_records')
        .insert([payload]);

      if (error) throw error;

      setSuccess('BTR kaydı başarıyla oluşturuldu.');
      setFormData({
        name: '',
        surname: '',
        phone: '',
        email: '',
        district_id: '',
        institution_id: '',
        institution_id_2: '',
        assignment_date: '',
        status: 'Aktif'
      });
    } catch (err) {
      setError('Kayıt oluşturulurken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0"><i className="fas fa-user-plus me-2"></i>Yeni BTR Ekle</h5>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Ad</Form.Label>
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
                  <Form.Label>Soyad</Form.Label>
                  <Form.Control
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Telefon</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>E-posta</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Görevlendirme Tarihi</Form.Label>
                  <Form.Control
                    type="date"
                    name="assignment_date"
                    value={formData.assignment_date}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kurum</Form.Label>
                  <Form.Select
                    name="institution_id"
                    value={formData.institution_id}
                    onChange={handleChange}
                    required
                    disabled={!formData.district_id}
                  >
                    <option value="">Seçiniz...</option>
                    {institutions.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kurum 2 (İsteğe Bağlı)</Form.Label>
                  <Form.Select
                    name="institution_id_2"
                    value={formData.institution_id_2}
                    onChange={handleChange}
                    disabled={!formData.district_id}
                  >
                    <option value="">Seçiniz...</option>
                    {institutions.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Durum</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pasif">Pasif</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end mt-4">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner size="sm" animation="border" /> : <><i className="fas fa-save me-2"></i>Kaydet</>}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
