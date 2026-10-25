import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import Head from 'next/head';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaInput('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (parseInt(captchaInput) !== num1 + num2) {
      setErrorMsg('Matematik işlemini (güvenlik kodu) hatalı girdiniz.');
      generateCaptcha();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // Özel Yetkili Girişi (God Mode)
    if (email === 'god' && password === 'god') {
      localStorage.setItem('god_mode', 'true');
      router.push('/');
      return;
    }

    // Normal Supabase E-posta Girişi
    let loginEmail = email.trim();
    // Kullanıcı adı gibi girilmişse (içinde @ yoksa ve 'god' değilse)
    // arka planda varsayılan sanal bir e-posta formatına dönüştürüyoruz.
    if (!loginEmail.includes('@') && loginEmail !== 'god') {
      loginEmail = `${loginEmail}@meb.gov.tr`;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setErrorMsg('Giriş başarısız: Lütfen bilgilerinizi kontrol ediniz.');
      setLoading(false);
      generateCaptcha();
    } else {
      router.push('/');
    }
  };

  return (
    <>
      <Head>
        <title>Giriş Yap - Ordu OFP</title>
      </Head>
      <div className="login-page d-flex align-items-center justify-content-center min-vh-100">
        <Container>
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-5">
              <Card className="login-card border-0 shadow-lg overflow-hidden glassmorphism p-3">
                <div className="p-4 p-md-5">
                  <div className="text-center mb-4">
                    <div className="logo-circle text-white d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm" style={{ width: 72, height: 72, fontSize: 32, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <i className="fas fa-layer-group"></i>
                    </div>
                    <h3 className="fw-bold text-white mb-2" style={{ letterSpacing: '0.5px' }}>Ordu OFP Sistemi</h3>
                    <p className="text-white-50 small mb-0">Güvenli Erişim Paneli</p>
                  </div>
                  
                  {errorMsg && (
                    <Alert variant="danger" className="border-0 shadow-sm rounded-3">
                      <i className="fas fa-exclamation-circle me-2"></i>{errorMsg}
                    </Alert>
                  )}

                  <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-4">
                      <Form.Label className="text-white fw-semibold small text-uppercase spacing-1">Kullanıcı Adı veya E-posta</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Kullanıcı adınız veya admin@meb.k12.tr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="login-input shadow-none"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="text-white fw-semibold small text-uppercase spacing-1">Şifre</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="login-input shadow-none"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="text-white fw-semibold small text-uppercase spacing-1 d-flex justify-content-between align-items-center">
                        <span>Güvenlik Doğrulaması</span>
                        <span className="badge bg-primary fs-6">{num1} + {num2} = ?</span>
                      </Form.Label>
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="number"
                          placeholder="İşlem sonucunu yazın"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          required
                          className="login-input shadow-none flex-grow-1"
                        />
                        <Button variant="outline-light" onClick={generateCaptcha} className="px-3 rounded-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <i className="fas fa-sync-alt p-1"></i>
                        </Button>
                      </div>
                    </Form.Group>

                    <Button
                      variant="light"
                      type="submit"
                      disabled={loading}
                      className="w-100 py-3 mt-2 rounded-3 fw-bold login-btn text-primary shadow-sm"
                    >
                      {loading ? <Spinner size="sm" animation="border" /> : 'Sisteme Giriş Yap'}
                    </Button>
                  </Form>
                  <div className="text-center mt-5">
                     <small className="text-white-50 d-block"><i className="fas fa-lock me-2"></i>Bu sisteme sadece onaylı ve yetkili 10 personel giriş yapabilir.</small>
                     <small className="text-white-50 opacity-75 d-block mt-2">© 2026 Ordu İl Milli Eğitim Müdürlüğü</small>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </div>

      <style jsx global>{`
        body {
            /* Fallback in case they have white bg body */
            background-color: #001f3f !important;
        }
        .login-page {
          background: linear-gradient(135deg, #001f3f 0%, #003366 100%);
          background-size: cover;
          background-position: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1050; /* Above all other content */
        }
        .glassmorphism {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 1.5rem !important;
        }
        .login-input {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          padding: 0.9rem 1.2rem;
          border-radius: 0.75rem;
          font-size: 1rem;
          transition: all 0.25s ease;
        }
        .login-input::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }
        .login-input:focus {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05) !important;
        }
        .login-btn {
          transition: all 0.3s ease;
          font-size: 1.05rem;
          background: #ffffff !important;
          color: #003366 !important;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
          background: #f8f9fa !important;
        }
        .spacing-1 {
          letter-spacing: 1.2px;
          opacity: 0.8;
          display: block;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </>
  );
}
