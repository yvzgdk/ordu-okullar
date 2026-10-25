// pages/institutions.js

import { useState, useEffect } from 'react';
import { Container, Alert, Form } from 'react-bootstrap';
import InstitutionForm from '../components/InstitutionForm';
import { supabase } from '../lib/supabase';

export default function InstitutionsPage() {
  // Başarı mesajını saklayan state
  const [successMsg, setSuccessMsg] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    async function fetchDistricts() {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name', { ascending: true });
      if (!error) setDistricts(data || []);
    }
    fetchDistricts();
  }, []);

  // Form doğru eklendiğinde tetiklenecek fonksiyon
  const handleSuccess = () => {
    setSuccessMsg('Kurum başarıyla eklendi!');
    // 3 saniye sonra otomatik kapansın:
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  return (
    <Container className="py-4" style={{ maxWidth: '800px' }}>
      {/* Başarı mesajı varsa Alert göster */}
      {successMsg && (
        <Alert
          variant="success"
          onClose={() => setSuccessMsg('')}
          dismissible
        >
          {successMsg}
        </Alert>
      )}

      {/* Sadece InstitutionForm bileşeni doğrudan kullanılıyor */}
      <InstitutionForm onSuccess={handleSuccess} />
    </Container>
  );
}
