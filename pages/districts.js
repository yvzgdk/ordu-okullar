// pages/districts.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import DistrictTable from '../components/DistrictTable';

export default function DistrictsPage() {
  const [districts, setDistricts] = useState([]);
  const [newName, setNewName] = useState('');

  // İlçeleri Supabase’ten çek
  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    const { data, error } = await supabase
      .from('districts')
      .select('*')
      .order('id', { ascending: true });
    if (!error) setDistricts(data);
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('districts').insert([{ name: newName }]);
    if (!error) {
      setNewName('');
      fetchDistricts();
    }
  };

  return (
    <Container className="py-4">
      {/* 1) Başlık ve “Yeni İlçe” Formu */}
      <h2>İlçe Yönetimi</h2>
      <Form className="mb-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <Form.Label>Yeni İlçe</Form.Label>
        <Row className="g-2">
          <Col md={8}>
            <Form.Control
              type="text"
              placeholder="Örn: Altınordu"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Col>
          <Col md={4}>
            <Button variant="primary" type="submit">
              Ekle
            </Button>
          </Col>
        </Row>
      </Form>

      {/* 2) Tablo Kısmı */}
      <DistrictTable districts={districts} />
    </Container>
  );
}
