// pages/institutions.js
import { useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import Link from 'next/link';
import InstitutionForm from '../components/InstitutionForm';

export default function InstitutionsPage() {
  const [successMsg, setSuccessMsg] = useState('');

  const handleSuccess = () => {
    setSuccessMsg('Kurum başarıyla kaydedildi!');
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı (Anasayfa ile uyumlu) ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="rounded-3 bg-primary-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
            <i className="fas fa-plus-circle text-primary"></i>
          </span>
          <div>
            <h4 className="fw-bold mb-0 text-dark">Yeni Kurum Kayıt Formu</h4>
            <span className="text-muted small">Ordu il geneli okul, altyapı ve donanım kayıt girişi</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/institutions/detail" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-list"></i>
            <span>Kurum Listesi</span>
          </Link>
          <Link href="/institutions/bulk-import" className="btn btn-success-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-file-excel"></i>
            <span>Excel'den Yükle</span>
          </Link>
        </div>
      </div>

      {successMsg && (
        <Alert
          variant="success"
          onClose={() => setSuccessMsg('')}
          dismissible
          className="rounded-3 shadow-sm border-0 mb-4"
        >
          <i className="fas fa-check-circle me-2"></i>{successMsg}
        </Alert>
      )}

      {/* Modern Form */}
      <InstitutionForm onSuccess={handleSuccess} />
    </Container>
  );
}
