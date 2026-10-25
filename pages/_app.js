// pages/_app.js

// pages/_app.js
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css'; // varsa kendi global stiliniz
import Head from 'next/head';
import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Kurum İşlemleri dropdown hover kontrolü
  const [showInstitutionDropdown, setShowInstitutionDropdown] = useState(false);
  const [showEtDropdown, setShowEtDropdown] = useState(false);
  const [showBtrDropdown, setShowBtrDropdown] = useState(false);

  useEffect(() => {
    const isGodMode = localStorage.getItem('god_mode') === 'true';

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
      if (!session && !isGodMode && router.pathname !== '/login') {
        router.push('/login');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && !isGodMode && router.pathname !== '/login') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (isAuthLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#f6faff' }}>
        <div className="spinner-grow text-primary" role="status" style={{ width: '4rem', height: '4rem' }}></div>
      </div>
    );
  }

  const isGodMode = typeof window !== 'undefined' ? localStorage.getItem('god_mode') === 'true' : false;
  const isLoginPage = router.pathname === '/login';

  if (!session && !isGodMode && !isLoginPage) {
    return null; // Redirecting...
  }

  let displayName = 'Hesabım';
  if (isGodMode) {
    displayName = 'god';
  } else if (session?.user?.email) {
    displayName = session.user.email.split('@')[0];
  }

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </Head>

      {!isLoginPage && (
      <>
      {/* ================================
            1️⃣ Global Navbar (Menüler)
         ================================ */}
      <Navbar expand="lg" className="navbar-modern sticky-top mb-4">
        <Container>
          <Navbar.Brand href="/" className="navbar-brand-modern">
            <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 40, height: 40 }}>
              <i className="fas fa-layer-group"></i>
            </div>
            <span>Ordu OFP</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" className="border-0 shadow-none" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="ms-auto gap-1 align-items-center">
              <Nav.Link href="/" className="nav-link-modern">
                <i className="fas fa-home me-1"></i> Anasayfa
              </Nav.Link>

              <NavDropdown
                title={<span className="d-flex align-items-center"><i className="fas fa-building-columns me-1"></i> Kurumlar</span>}
                id="institutions-dropdown"
                show={showInstitutionDropdown}
                onMouseEnter={() => setShowInstitutionDropdown(true)}
                onMouseLeave={() => setShowInstitutionDropdown(false)}
                onClick={e => e.preventDefault()}
              >
                <NavDropdown.Item as={Link} href="/institutions/detail">
                  <i className="fas fa-info-circle text-info"></i> Kurum Detay
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} href="/institutions">
                  <i className="fas fa-plus-square text-primary"></i> Kurum Ekle
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} href="/institutions/guest-add">
                  <i className="fas fa-plus-circle text-success"></i> Misafir Kurum Ekle
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} href="/institutions/edit">
                  <i className="fas fa-edit text-warning"></i> Düzenle
                </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown
                title={<span className="d-flex align-items-center"><i className="fas fa-user-gear me-1"></i> BTR</span>}
                id="btr-dropdown"
                show={showBtrDropdown}
                onMouseEnter={() => setShowBtrDropdown(true)}
                onMouseLeave={() => setShowBtrDropdown(false)}
                onClick={e => e.preventDefault()}
              >
                <NavDropdown.Item as={Link} href="/btr/edit">
                  <i className="fas fa-users text-primary"></i> BTR Listesi
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} href="/btr/add">
                  <i className="fas fa-user-plus text-success"></i> Yeni BTR Ekle
                </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown
                title={<span className="d-flex align-items-center"><i className="fas fa-chalkboard me-1"></i> ET İşlemleri</span>}
                id="et-dropdown"
                show={showEtDropdown}
                onMouseEnter={() => setShowEtDropdown(true)}
                onMouseLeave={() => setShowEtDropdown(false)}
                onClick={e => e.preventDefault()}
              >
                <NavDropdown.Item as={Link} href="/boards/add">
                  <i className="fas fa-plus text-primary"></i> Tahta Ekle
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} href="/boards/details">
                  <i className="fas fa-list text-info"></i> Kurum Tahta Detay
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} href="/boards/transfer">
                  <i className="fas fa-random text-success"></i> Transfer
                </NavDropdown.Item>
              </NavDropdown>

              <Nav.Link href="/reports" className="nav-link-modern">
                <i className="fas fa-chart-pie me-1"></i> Raporlar
              </Nav.Link>

              <div className="vr mx-2 d-none d-lg-block text-muted opacity-25"></div>

              <NavDropdown
                title={
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center border" style={{ width: 32, height: 32 }}>
                      <i className="fas fa-user text-secondary small"></i>
                    </div>
                    <span className="small fw-bold">{displayName}</span>
                  </div>
                }
                id="account-dropdown"
                align="end"
              >
                <NavDropdown.Item onClick={async () => { localStorage.removeItem('god_mode'); await supabase.auth.signOut(); router.push('/login'); }} style={{ cursor: 'pointer' }} className="text-danger fw-bold">
                  <i className="fas fa-shield-alt me-2"></i> Güvenli Çıkış
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      </>
      )}

      {/* ======================================
            2️⃣ Her sayfanın içeriğini render ediyoruz
         ====================================== */}
      <Component {...pageProps} />
    </>
  );
}
