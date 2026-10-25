import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Profile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
        } else {
            setUser(user);
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;
            setMessage('Şifreniz başarıyla güncellendi.');
            setPassword('');
        } catch (err) {
            setError('Şifre güncellenirken hata oluştu: ' + err.message);
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Card className="shadow-sm border-0 mw-600 mx-auto" style={{ maxWidth: '600px' }}>
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0"><i className="fas fa-user-circle me-2"></i>Profil Bilgileri</h5>
                </Card.Header>
                <Card.Body>
                    <div className="mb-4 text-center">
                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 80, height: 80 }}>
                            <i className="fas fa-user fa-3x text-secondary"></i>
                        </div>
                        <h5>{user?.email}</h5>
                        <p className="text-muted small">Son Giriş: {new Date(user?.last_sign_in_at).toLocaleString('tr-TR')}</p>
                    </div>

                    <hr />

                    <h6 className="fw-bold mb-3">Şifre Değiştir</h6>
                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handlePasswordUpdate}>
                        <Form.Group className="mb-3">
                            <Form.Label>Yeni Şifre</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Yeni şifrenizi girin"
                                minLength={6}
                                required
                            />
                        </Form.Group>
                        <div className="d-grid">
                            <Button variant="outline-primary" type="submit">
                                Güncelle
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}
