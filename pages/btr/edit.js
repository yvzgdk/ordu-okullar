import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Badge, Spinner, Modal, Alert } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

export default function BtrEdit() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [btrs, setBtrs] = useState([]);
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterCode, setFilterCode] = useState('');
    const [districts, setDistricts] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedBtr, setSelectedBtr] = useState(null);
    const [deleteError, setDeleteError] = useState(null);

    useEffect(() => {
        fetchBtrs();
        fetchDistricts();
    }, []);

    const fetchDistricts = async () => {
        const { data } = await supabase.from('districts').select('id, name').order('name');
        if (data) setDistricts(data);
    };

    const fetchBtrs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('btr_records')
                .select(`
          *,
          districts!btr_records_district_id_fkey(name),
          kurum1:kurum_kayit!btr_records_institution_id_fkey(name, code),
          kurum2:kurum_kayit!btr_records_institution_id_2_fkey(name, code)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBtrs(data || []);
        } catch (error) {
            console.error('Error fetching BTRs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBtr) return;
        try {
            const { error } = await supabase
                .from('btr_records')
                .delete()
                .eq('id', selectedBtr.id);

            if (error) throw error;

            setBtrs(btrs.filter(b => b.id !== selectedBtr.id));
            setShowDeleteModal(false);
        } catch (error) {
            setDeleteError('Silme işlemi başarısız: ' + error.message);
        }
    };

    const filteredBtrs = btrs.filter(btr => {
        const districtMatch = !filterDistrict || String(btr.district_id) === String(filterDistrict);
        const code1Matched = btr.kurum1?.code?.toLowerCase().includes(filterCode.toLowerCase());
        const code2Matched = btr.kurum2?.code?.toLowerCase().includes(filterCode.toLowerCase());
        const codeMatch = !filterCode || code1Matched || code2Matched;
        
        const searchMatch = !filterSearch || 
            (btr.name + ' ' + btr.surname).toLowerCase().includes(filterSearch.toLowerCase()) ||
            btr.kurum1?.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
            btr.kurum2?.name?.toLowerCase().includes(filterSearch.toLowerCase());
        
        return districtMatch && codeMatch && searchMatch;
    });

    return (
        <Container className="py-4">
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 text-primary fw-bold"><i className="fas fa-user-graduate me-2"></i>YOS Öğretmen Listesi ve Yönetimi</h5>
                        <Button variant="success" size="sm" onClick={() => router.push('/yos-ekle')} className="rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1">
                            <i className="fas fa-user-plus me-1"></i> YOS Ekle
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3 mb-4">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-muted">İlçe</Form.Label>
                                <Form.Select size="sm" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                                    <option value="">Tümü</option>
                                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-muted">Kurum Kodu</Form.Label>
                                <Form.Control size="sm" placeholder="Kurum Kodu..." value={filterCode} onChange={e => setFilterCode(e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-muted">YOS Adı veya Kurum Adı</Form.Label>
                                <Form.Control size="sm" placeholder="İsim veya Kurum Adı arayın..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                            </Form.Group>
                        </Col>
                    </Row>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Ad Soyad</th>
                                        <th>Branş</th>
                                        <th>İlçe</th>
                                        <th>Kurum</th>
                                        <th>Telefon</th>
                                        <th>Durum</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBtrs.map(btr => (
                                        <tr key={btr.id}>
                                            <td className="fw-bold">{btr.name} {btr.surname}</td>
                                            <td>
                                                <Badge bg="light" className="text-dark border">
                                                    {btr.brans || '-'}
                                                </Badge>
                                            </td>
                                            <td>{btr.districts?.name || '-'}</td>
                                            <td>
                                                <div className="small text-muted">{btr.kurum1?.code}</div>
                                                <div>{btr.kurum1?.name || '-'}</div>
                                                {btr.kurum2 && (
                                                    <div className="mt-2 pt-2 border-top">
                                                        <div className="small text-muted">{btr.kurum2.code}</div>
                                                        <div>{btr.kurum2.name}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{btr.phone}</td>
                                            <td>
                                                <Badge bg={btr.status === 'Aktif' ? 'success' : 'secondary'}>
                                                    {btr.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-2 rounded-circle"
                                                    onClick={() => {/* Edit logic would go here, maybe a modal or redirect */ }}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="rounded-circle"
                                                    onClick={() => {
                                                        setSelectedBtr(btr);
                                                        setShowDeleteModal(true);
                                                    }}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredBtrs.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-muted">
                                                Kayıt bulunamadı.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Silme Onayı</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteError && <Alert variant="danger">{deleteError}</Alert>}
                    <p><strong>{selectedBtr?.name} {selectedBtr?.surname}</strong> adlı BTR kaydını silmek istediğinize emin misiniz?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>İptal</Button>
                    <Button variant="danger" onClick={handleDelete}>Sil</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
