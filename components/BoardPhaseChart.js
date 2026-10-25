import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function BoardPhaseChart({ data, type = 'doughnut', title }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: type,
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        label: title,
                        data: Object.values(data),
                        backgroundColor: [
                            '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#795548', '#607d8b', '#212121'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            display: type === 'doughnut'
                        },
                        title: {
                            display: !!title,
                            text: title
                        }
                    }
                }
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, type, title]);

    return (
        <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <canvas ref={chartRef} />
        </div>
    );
}
