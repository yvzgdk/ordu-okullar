import { Container, Card, Row, Col, Button, Badge } from 'react-bootstrap';
import Link from 'next/link';

export default function BoardNeedsPage() {
  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="rounded-3 bg-warning-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
            <i className="fas fa-clipboard-question text-warning"></i>
          </span>
          <div>
            <h4 className="fw-bold mb-0 text-dark">ET İhtiyaç Yönetimi</h4>
            <span className="text-muted small">Ordu ili genelinde akıllı tahta ihtiyacı bulunan derslik ve okulların takip modülü</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/tahtalar/fazlalik" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-boxes-stacked"></i>
            <span>ET Fazlalık Havuzu</span>
          </Link>
          <Link href="/tahtalar/transfer" className="btn btn-primary-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-arrows-split-up-and-left"></i>
            <span>Tahta Transferi</span>
          </Link>
        </div>
      </div>

      {/* Tasarım Başlangıç Kartı */}
      <div className="form-section-card p-5 text-center bg-white">
        <div className="avatar-mini mx-auto mb-3 bg-warning-soft text-warning" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-hammer"></i>
        </div>
        <h5 className="fw-bold text-dark mb-2">ET İhtiyaç Sayfası Tasarıma Hazır</h5>
        <p className="text-muted small mx-auto mb-4" style={{ maxWidth: 520 }}>
          Bu sayfada okulların tahta ihtiyaç talepleri, derslik bazlı eksikler ve ilçe onay süreçleri takip edilebilir. Şimdi bu sayfayı birlikte şekillendirmeye başlayabiliriz.
        </p>
      </div>
    </Container>
  );
}
