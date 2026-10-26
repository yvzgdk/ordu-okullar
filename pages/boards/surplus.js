import { Container, Card, Row, Col, Button, Badge } from 'react-bootstrap';
import Link from 'next/link';

export default function BoardSurplusPage() {
  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="rounded-3 bg-info-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
            <i className="fas fa-boxes-stacked text-info"></i>
          </span>
          <div>
            <h4 className="fw-bold mb-0 text-dark">ET Fazlalık Havuzu</h4>
            <span className="text-muted small">Okullarda atıl veya ihtiyaç fazlası durumdaki etkileşimli tahtaların merkezi havuzu</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/tahtalar/ihtiyac" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-clipboard-question"></i>
            <span>ET İhtiyaç Listesi</span>
          </Link>
          <Link href="/tahtalar/transfer" className="btn btn-success-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-arrows-split-up-and-left"></i>
            <span>Transfer Başlat</span>
          </Link>
        </div>
      </div>

      {/* Tasarım Başlangıç Kartı */}
      <div className="form-section-card p-5 text-center bg-white">
        <div className="avatar-mini mx-auto mb-3 bg-info-soft text-info" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-cubes"></i>
        </div>
        <h5 className="fw-bold text-dark mb-2">ET Fazlalık Sayfası Tasarıma Hazır</h5>
        <p className="text-muted small mx-auto mb-4" style={{ maxWidth: 520 }}>
          Bu sayfada il genelinde "Fazlalık" olarak işaretlenen etkileşimli tahtalar, modellerine ve ilçelere göre listelenip diğer okullara nakil için havuzda toplanır. Şimdi bu sayfayı birlikte şekillendirmeye başlayabiliriz.
        </p>
      </div>
    </Container>
  );
}
