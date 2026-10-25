// components/DistrictTable.js
import { useState, useMemo } from 'react';
import { Table, Card, Row, Col, Form, Button, Pagination } from 'react-bootstrap';

export default function DistrictTable({ districts }) {
  // --------------- SAYFALAMA (Pagination) ---------------
  // Burada “entries per page” ve “current page” state’ini tutuyoruz
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Toplam sayfa sayısını hesapla
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(districts.length / entriesPerPage));
  }, [districts.length, entriesPerPage]);

  // O an gösterilecek dilim
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return districts.slice(startIndex, startIndex + entriesPerPage);
  }, [currentPage, entriesPerPage, districts]);

  // Eğer “entriesPerPage” değiştiyse sayfayı 1’e sıfırla
  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // Önceki sayfaya git
  const goPrev = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };
  // Sonraki sayfaya git
  const goNext = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };
  // Belirli bir sayfaya git
  const goPage = (num) => {
    setCurrentPage(num);
  };

  // Pagination öğelerini oluştur (sayfa numaraları)
  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item
        key={number}
        active={number === currentPage}
        onClick={() => goPage(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        {/* -------------------- ÜST SAĞDA "Show X Entries" Seçimi -------------------- */}
        <Row className="align-items-center mb-3">
          <Col md={6}>
            <Form.Label>Show&nbsp;</Form.Label>
            <Form.Select
              value={entriesPerPage}
              onChange={handleEntriesChange}
              style={{ width: '80px', display: 'inline-block' }}
            >
              {[5, 10, 25, 50, 100].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Form.Select>
            <Form.Label>&nbsp;entries</Form.Label>
          </Col>
          <Col md={6} className="text-end">
            <Form.Label>Search:&nbsp;</Form.Label>
            {/* Ekranda arama yapmak istersen, burada bir input ekle. 
                Örneğin “districts” array’ini filtreleyip state’e yazarsın. 
                Bu örnekte arama kısmını basit bıraktık. */}
            <Form.Control
              type="text"
              placeholder="Search…"
              style={{ display: 'inline-block', width: '200px' }}
              onChange={(e) => {
                // Opsiyonel: districsts’ı filtrele, currentPage=1 yap
                // (Kod örneği sade tutuluyor; eğer arama istiyorsan ekleyebilirsin.)
              }}
            />
          </Col>
        </Row>

        {/* -------------------- TABLO -------------------- */}
        <Table striped hover responsive bordered>
          <thead className="table-primary">
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>İlçe Adı</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="text-center py-4">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* -------------------- SAYFALAMA BUTONLARI -------------------- */}
        <Row className="align-items-center">
          <Col md={6}>
            <small>
              Showing {currentData.length > 0
                ? (currentPage - 1) * entriesPerPage + 1
                : 0}{' '}
              to{' '}
              {Math.min(currentPage * entriesPerPage, districts.length)} of{' '}
              {districts.length} entries
            </small>
          </Col>
          <Col md={6} className="text-end">
            <Pagination className="mb-0">
              <Pagination.Prev disabled={currentPage === 1} onClick={goPrev} />
              {paginationItems}
              <Pagination.Next disabled={currentPage === totalPages} onClick={goNext} />
            </Pagination>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
