import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Container, Card, Form, Button, Alert, Spinner, Table, Row, Col, Nav, Tab } from 'react-bootstrap';
import * as XLSX from 'xlsx';

const REQUIRED_FIELDS = {
  name: 'Kurum Adı',
  code: 'Kurum Kodu',
  district: 'İlçe',
  status: 'Durum',
  director: 'Müdür',
  director_phone: 'Müdür Telefon',
  infra_owner: 'Altyapı Sahibi',
  faz: 'Faz',
  altyapi: 'Altyapı',
  internet_type: 'İnternet Tipi',
  vestel_black_boards: 'Vestel Siyah',
  vestel_grey_boards: 'Vestel Gri',
  arcelik_boards: 'Arçelik',
  aidata_boards: 'Aidata'
};

const FIELD_GROUPS = {
  basic: {
    title: 'Temel Bilgiler',
    fields: ['name', 'code', 'district', 'status']
  },
  management: {
    title: 'Yönetim Bilgileri',
    fields: ['director', 'director_phone']
  },
  infrastructure: {
    title: 'Altyapı Bilgileri',
    fields: ['infra_owner', 'faz', 'altyapi', 'internet_type']
  },
  equipment: {
    title: 'Ekipman Bilgileri',
    fields: ['vestel_black_boards', 'vestel_grey_boards', 'arcelik_boards', 'aidata_boards']
  }
};

const districtNameToId = {
  'Akkuş': 1,
  'Altınordu': 2,
  'Aybastı': 3,
  'Çamaş': 4,
  'Çatalpınar': 5,
  'Çaybaşı': 6,
  'Fatsa': 7,
  'Gölköy': 8,
  'Gülyalı': 9,
  'Gürgentepe': 10,
  'İkizce': 11,
  'Kabadüz': 12,
  'Kabataş': 13,
  'Korgan': 14,
  'Kumru': 15,
  'Mesudiye': 16,
  'Perşembe': 17,
  'Ulubey': 18,
  'Ünye': 19
};

const validFields = [
  'name', 'code', 'district_id', 'cbs1', 'cbs2', 'status', 'related_institution_id', 'infra_owner',
  'is_fatih', 'faz', 'altyapi', 'infrastructure_plan', 'altyapi_planlama', 'internet_type', 'board_owner',
  'vestel_black_boards', 'vestel_grey_boards', 'arcelik_boards', 'aidata_boards', 'total_boards',
  'director', 'director_phone', 'has_bt_class', 'bt_labs', 'has_infrastructure', 'bds'
];

export default function BulkImportPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [excelColumns, setExcelColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [showMapping, setShowMapping] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      const columns = Object.keys(jsonData[0] || {});
      setExcelColumns(columns);
      
      const defaultMapping = {};
      columns.forEach(col => {
        const field = Object.entries(REQUIRED_FIELDS).find(([key, value]) => 
          col.toLowerCase() === value.toLowerCase() || 
          col.toLowerCase() === key.toLowerCase()
        );
        if (field) {
          defaultMapping[field[0]] = col;
        }
      });
      setColumnMapping(defaultMapping);
      
      setPreview(jsonData);
      setShowMapping(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingChange = (field, value) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || preview.length === 0) {
      setErrorMsg('Lütfen bir Excel dosyası seçin.');
      return;
    }

    setLoading(true);
    setProgress(0);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < preview.length; i++) {
        const row = preview[i];
        const institution = {};
        Object.entries(columnMapping).forEach(([field, excelCol]) => {
          if (excelCol && row[excelCol] !== undefined) {
            if (field === 'district_id' || field === 'district') {
              const val = row[excelCol];
              if (typeof val === 'string' && districtNameToId[val.trim()]) {
                institution['district_id'] = districtNameToId[val.trim()];
              } else if (!isNaN(Number(val))) {
                institution['district_id'] = Number(val);
              }
            } else {
              if (typeof row[excelCol] === 'string') {
                institution[field] = row[excelCol].trim();
              } else {
                institution[field] = row[excelCol];
              }
            }
          }
        });
        
        if (!institution.status || institution.status === '') {
          institution.status = 'ev_sahibi';
        }

        const filteredInstitution = {};
        Object.keys(institution).forEach(key => {
          if (validFields.includes(key)) filteredInstitution[key] = institution[key];
        });

        const vb = Number(filteredInstitution.vestel_black_boards) || 0;
        const vg = Number(filteredInstitution.vestel_grey_boards) || 0;
        const ab = Number(filteredInstitution.arcelik_boards) || 0;
        const ad = Number(filteredInstitution.aidata_boards) || 0;
        filteredInstitution.total_boards = Number(filteredInstitution.total_boards) || (vb + vg + ab + ad);

        const { error } = await supabase
          .from('kurum_kayit')
          .insert([filteredInstitution]);

        if (error) {
          console.error(`Hata (${i + 1}. satır):`, error, filteredInstitution);
          setErrorMsg(`Hata (${i + 1}. satır): ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
        setProgress(Math.round(((i + 1) / preview.length) * 100));
      }
      setSuccessMsg(`${successCount} kurum başarıyla eklendi. ${errorCount > 0 ? `${errorCount} kurum eklenirken hata oluştu.` : ''}`);
      setPreview([]);
      setFile(null);
      setShowMapping(false);
    } catch (error) {
      console.error('Toplu ekleme hatası:', error);
      setErrorMsg('Kurumlar eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Card className="shadow-lg mx-auto" style={{ maxWidth: 800 }}>
        <Card.Body>
          <div className="d-flex align-items-center mb-4 gap-2">
            <i className="fas fa-file-excel fa-2x text-success"></i>
            <h3 className="fw-bold text-success mb-0">Toplu Kurum Ekle</h3>
          </div>

          <Form onSubmit={handleSubmit}>
            {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
            {successMsg && <Alert variant="success">{successMsg}</Alert>}

            <Form.Group controlId="excelFile" className="mb-4">
              <Form.Label className="fw-bold">Excel Dosyası</Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="form-control-lg"
                disabled={loading}
              />
            </Form.Group>

            {showMapping && (
              <div className="mb-4">
                <h5 className="fw-bold mb-3">Sütun Eşleştirme</h5>
                <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                  <Nav variant="tabs" className="mb-3">
                    {Object.entries(FIELD_GROUPS).map(([key, group]) => (
                      <Nav.Item key={key}>
                        <Nav.Link eventKey={key} className="fw-bold">
                          {group.title}
                        </Nav.Link>
                      </Nav.Item>
                    ))}
                  </Nav>

                  <Tab.Content>
                    {Object.entries(FIELD_GROUPS).map(([key, group]) => (
                      <Tab.Pane key={key} eventKey={key}>
                        <div className="bg-light p-3 rounded">
                          {group.fields.map(field => (
                            <Row key={field} className="mb-2 align-items-center">
                              <Col md={4}>
                                <Form.Label className="mb-0 fw-bold">
                                  {REQUIRED_FIELDS[field]}
                                </Form.Label>
                              </Col>
                              <Col md={8}>
                                <Form.Select
                                  value={columnMapping[field] || ''}
                                  onChange={(e) => handleMappingChange(field, e.target.value)}
                                  className="form-select"
                                >
                                  <option value="">Seçiniz...</option>
                                  {excelColumns.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                  ))}
                                </Form.Select>
                              </Col>
                            </Row>
                          ))}
                        </div>
                      </Tab.Pane>
                    ))}
                  </Tab.Content>
                </Tab.Container>
              </div>
            )}

            {preview.length > 0 && (
              <div className="mb-4">
                <h5 className="fw-bold mb-3">Önizleme ({preview.length} kurum)</h5>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <Table hover responsive className="align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Kurum Adı</th>
                        <th>Kurum Kodu</th>
                        <th>İlçe</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index}>
                          <td>{row[columnMapping.name] || '-'}</td>
                          <td>{row[columnMapping.code] || '-'}</td>
                          <td>{row[columnMapping.district] || '-'}</td>
                          <td>{row[columnMapping.status] || 'ev_sahibi'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}

            {loading && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">İşlem Durumu</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress">
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="d-grid">
              <Button
                type="submit"
                variant="success"
                size="lg"
                className="rounded-pill fw-bold px-5 py-2 fs-5"
                disabled={loading || preview.length === 0}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Kurumlar Ekleniyor...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Kurumları Ekle
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
