import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Spinner, Table } from 'react-bootstrap';
import { supabase } from '../lib/supabase';
import Chart from 'chart.js/auto';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalInstitutions: 0,
        totalBoards: 0,
        brandCounts: {},
        infraCounts: {},
        internetCounts: {}
    });

    const infraChartRef = useRef(null);
    const brandChartRef = useRef(null);
    const infraChartInstance = useRef(null);
    const brandChartInstance = useRef(null);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (!loading) {
            renderCharts();
        }
    }, [loading, stats]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: institutions, error } = await supabase
                .from('kurum_kayit')
                .select('*');

            if (error) throw error;

            const newStats = {
                totalInstitutions: institutions.length,
                totalBoards: 0,
                brandCounts: { 'Vestel Siyah': 0, 'Vestel Gri': 0, 'Arçelik': 0, 'Aidata': 0 },
                infraCounts: {},
                internetCounts: {}
            };

            institutions.forEach(inst => {
                // Board counts
                const vb = parseInt(inst.vestel_black_boards || 0);
                const vg = parseInt(inst.vestel_grey_boards || 0);
                const ab = parseInt(inst.arcelik_boards || 0);
                const ad = parseInt(inst.aidata_boards || 0);

                newStats.brandCounts['Vestel Siyah'] += vb;
                newStats.brandCounts['Vestel Gri'] += vg;
                newStats.brandCounts['Arçelik'] += ab;
                newStats.brandCounts['Aidata'] += ad;

                const total = inst.total_boards ? parseInt(inst.total_boards) : (vb + vg + ab + ad);
                newStats.totalBoards += total;

                // Infra counts
                const infra = inst.infrastructure || inst.altyapi || 'Belirsiz';
                newStats.infraCounts[infra] = (newStats.infraCounts[infra] || 0) + 1;

                // Internet counts
                const net = inst.internet_type || 'Belirsiz';
                newStats.internetCounts[net] = (newStats.internetCounts[net] || 0) + 1;
            });

            setStats(newStats);
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderCharts = () => {
        // Destroy existing charts if any
        if (infraChartInstance.current) infraChartInstance.current.destroy();
        if (brandChartInstance.current) brandChartInstance.current.destroy();

        // Infrastructure Chart
        if (infraChartRef.current) {
            const ctx = infraChartRef.current.getContext('2d');
            infraChartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.infraCounts),
                    datasets: [{
                        data: Object.values(stats.infraCounts),
                        backgroundColor: [
                            '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#795548', '#607d8b'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Altyapı Dağılımı' }
                    }
                }
            });
        }

        // Brand Chart
        if (brandChartRef.current) {
            const ctx = brandChartRef.current.getContext('2d');
            brandChartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(stats.brandCounts),
                    datasets: [{
                        label: 'Tahta Sayısı',
                        data: Object.values(stats.brandCounts),
                        backgroundColor: ['#212121', '#9e9e9e', '#d32f2f', '#ffc107']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Markalara Göre Tahta Sayıları' }
                    }
                }
            });
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Raporlar hazırlanıyor...</p>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h2 className="mb-4 fw-bold text-primary"><i className="fas fa-chart-pie me-2"></i>Genel Raporlar</h2>

            {/* Summary Cards */}
            <Row className="g-4 mb-5">
                <Col md={6} lg={3}>
                    <Card className="h-100 border-0 shadow-sm bg-primary text-white">
                        <Card.Body className="text-center">
                            <h1 className="display-4 fw-bold">{stats.totalInstitutions}</h1>
                            <Card.Text>Toplam Kurum</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="h-100 border-0 shadow-sm bg-success text-white">
                        <Card.Body className="text-center">
                            <h1 className="display-4 fw-bold">{stats.totalBoards}</h1>
                            <Card.Text>Toplam Tahta</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row className="g-4 mb-5">
                <Col md={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <canvas ref={infraChartRef}></canvas>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <canvas ref={brandChartRef}></canvas>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Detailed Table */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">İnternet Bağlantı Türleri</Card.Header>
                <Card.Body>
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th>Bağlantı Türü</th>
                                <th>Kurum Sayısı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(stats.internetCounts).map(([type, count]) => (
                                <tr key={type}>
                                    <td>{type}</td>
                                    <td className="fw-bold">{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
}
