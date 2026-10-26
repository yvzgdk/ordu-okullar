import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Table, Badge, InputGroup, Modal } from 'react-bootstrap';

const BOARD_TYPES = [
  { key: 'vestel_black_boards', label: 'Vestel Siyah' },
  { key: 'vestel_grey_boards', label: 'Vestel Gri' },
  { key: 'arcelik_boards', label: 'Arçelik' },
  { key: 'aidata_boards', label: 'Aidata' },
];

const KAT_OPTIONS = [
  'ZEMİN', 'GİRİŞ', 
  '1.KAT', '2.KAT', '3.KAT', '4.KAT', '5.KAT',
  '1.KAT A', '1.KAT B', '2.KAT A', '2.KAT B', 
  '3.KAT A', '3.KAT B', '4.KAT A', '4.KAT B', 
  '5.KAT A', '5.KAT B'
];

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function BoardTransferPage() {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [districts, setDistricts] = useState([]);
  
  // Kaynak Kurum filtreleri
  const [sourceDistrictId, setSourceDistrictId] = useState('');
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  
  // Hedef Kurum filtreleri
  const [targetDistrictId, setTargetDistrictId] = useState('');
  const [targetSearchTerm, setTargetSearchTerm] = useState('');
  
  // Kurulum yeri
  const [targetBina, setTargetBina] = useState('');
  const [targetKat, setTargetKat] = useState('');
  const [targetSinif, setTargetSinif] = useState('');
  
  // Fazlalık tahtalar
  const [surplusBoards, setSurplusBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  
  // Form işlem durumları
  const [loading, setLoading] = useState(false);
  const [transferDate, setTransferDate] = useState(getToday());
  const [officialLetterNo, setOfficialLetterNo] = useState('');
  
  // ─── Modal / Pop-up State'leri ───
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [lastTransferSummary, setLastTransferSummary] = useState(null);
  
  // Geçmiş Transferler & Filtre State'leri
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDistrict, setHistoryDistrict] = useState('');
  const [historyBoardType, setHistoryBoardType] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  useEffect(() => {
    async function fetchInstitutions() {
      const { data, error } = await supabase
        .from('kurum_kayit')
        .select('id, name, code, district_id, vestel_black_boards, vestel_grey_boards, arcelik_boards, aidata_boards')
        .order('name', { ascending: true });
      if (!error) setInstitutions(data || []);
    }
    async function fetchDistricts() {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name', { ascending: true });
      if (!error) setDistricts(data || []);
    }
    fetchInstitutions();
    fetchDistricts();
  }, []);

  // Kaynak kurum için fazlalık tahtaları çek
  useEffect(() => {
    async function fetchSurplusBoards() {
      if (!sourceId) {
        setSurplusBoards([]);
        setSelectedBoardIds([]);
        return;
      }
      setLoadingBoards(true);
      const { data, error } = await supabase
        .from('et_detay')
        .select('*')
        .eq('institution_id', sourceId)
        .eq('et_durumu', 'Fazlalık')
        .order('id', { ascending: true });
        
      setLoadingBoards(false);
      if (!error) {
         setSurplusBoards(data || []);
      }
    }
    fetchSurplusBoards();
  }, [sourceId]);

  // Tüm Geçmiş Transferleri Çeken Fonksiyon
  const fetchAllTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    const { data, error } = await supabase
      .from('board_transfers')
      .select('id, date, board_type, count, from_institution_id, to_institution_id, official_letter_no')
      .order('date', { ascending: false })
      .order('id', { ascending: false });
    if (!error) {
      setTransfers(data || []);
    }
    setLoadingTransfers(false);
  }, []);

  useEffect(() => {
    fetchAllTransfers();
  }, [fetchAllTransfers]);

  const getInstitutionObj = useCallback((id) => {
    return institutions.find(i => String(i.id) === String(id));
  }, [institutions]);

  const getInstitutionName = useCallback((id) => {
    const inst = getInstitutionObj(id);
    return inst ? `${inst.name}${inst.code ? ' (' + inst.code + ')' : ''}` : '-';
  }, [getInstitutionObj]);

  const getDistrictName = useCallback((districtId) => {
    const d = districts.find(item => String(item.id) === String(districtId));
    return d ? d.name : '-';
  }, [districts]);

  const getBoardTypeLabel = (key) => {
    const t = BOARD_TYPES.find(t => t.key === key);
    return t ? t.label : key;
  };

  const selectedSourceInst = useMemo(() => {
    return institutions.find(i => String(i.id) === String(sourceId));
  }, [institutions, sourceId]);

  const selectedTargetInst = useMemo(() => {
    return institutions.find(i => String(i.id) === String(targetId));
  }, [institutions, targetId]);

  // Seçilen tahtaların tam nesne listesi
  const selectedBoardsList = useMemo(() => {
    return surplusBoards.filter(b => selectedBoardIds.includes(b.id));
  }, [surplusBoards, selectedBoardIds]);

  // Kaynak Kurum Seçim Listesi (İlçe ve Arama ile filtrelenmiş)
  const availableSourceInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const districtMatch = !sourceDistrictId || String(inst.district_id) === String(sourceDistrictId);
      const searchMatch = !sourceSearchTerm.trim() || 
        (inst.name || '').toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
        (inst.code || '').toLowerCase().includes(sourceSearchTerm.toLowerCase());
      return districtMatch && searchMatch;
    });
  }, [institutions, sourceDistrictId, sourceSearchTerm]);

  // Hedef Kurum Seçim Listesi (İlçe ve Arama ile filtrelenmiş, kaynak hariç)
  const availableTargetInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      if (sourceId && String(inst.id) === String(sourceId)) return false;
      
      const districtMatch = !targetDistrictId || String(inst.district_id) === String(targetDistrictId);
      const searchMatch = !targetSearchTerm.trim() || 
        (inst.name || '').toLowerCase().includes(targetSearchTerm.toLowerCase()) ||
        (inst.code || '').toLowerCase().includes(targetSearchTerm.toLowerCase());
      return districtMatch && searchMatch;
    });
  }, [institutions, sourceId, targetDistrictId, targetSearchTerm]);

  // Geçmiş Transferler Filtreleme Mantığı
  const filteredTransfers = useMemo(() => {
    return transfers.filter(tr => {
      const fromInst = getInstitutionObj(tr.from_institution_id);
      const toInst = getInstitutionObj(tr.to_institution_id);
      
      if (historySearch.trim()) {
        const q = historySearch.trim().toLowerCase();
        const fromMatch = (fromInst?.name || '').toLowerCase().includes(q) || (fromInst?.code || '').toLowerCase().includes(q);
        const toMatch = (toInst?.name || '').toLowerCase().includes(q) || (toInst?.code || '').toLowerCase().includes(q);
        if (!fromMatch && !toMatch) return false;
      }
      
      if (historyDistrict) {
        const fromDistMatch = String(fromInst?.district_id) === String(historyDistrict);
        const toDistMatch = String(toInst?.district_id) === String(historyDistrict);
        if (!fromDistMatch && !toDistMatch) return false;
      }
      
      if (historyBoardType) {
        if (tr.board_type !== historyBoardType) return false;
      }
      
      if (historyStartDate && tr.date < historyStartDate) return false;
      if (historyEndDate && tr.date > historyEndDate) return false;
      
      return true;
    });
  }, [transfers, getInstitutionObj, historySearch, historyDistrict, historyBoardType, historyStartDate, historyEndDate]);

  const totalTransferredCount = useMemo(() => {
    return filteredTransfers.reduce((sum, tr) => sum + (parseInt(tr.count, 10) || 0), 0);
  }, [filteredTransfers]);

  const resetHistoryFilters = () => {
    setHistorySearch('');
    setHistoryDistrict('');
    setHistoryBoardType('');
    setHistoryStartDate('');
    setHistoryEndDate('');
  };

  const handleBoardToggle = (id) => {
     if (selectedBoardIds.includes(id)) {
        setSelectedBoardIds(selectedBoardIds.filter(bid => bid !== id));
     } else {
        setSelectedBoardIds([...selectedBoardIds, id]);
     }
  };
  
  const handleSelectAll = () => {
     if (selectedBoardIds.length === surplusBoards.length) {
         setSelectedBoardIds([]);
     } else {
         setSelectedBoardIds(surplusBoards.map(b => b.id));
     }
  };

  // ─── Transfer Başlatma & Doğrulama (Butona basıldığında) ───
  const handleInitiateTransfer = () => {
    if (!sourceId) {
      setValidationMessage('Lütfen önce tahtanın alınacağı "1. Kaynak Kurum"u seçiniz.');
      setShowValidationModal(true);
      return;
    }
    if (surplusBoards.length === 0) {
      setValidationMessage('Seçtiğiniz kaynak kurumda "Fazlalık" durumunda kayıtlı tahta bulunmamaktadır.');
      setShowValidationModal(true);
      return;
    }
    if (selectedBoardIds.length === 0) {
      setValidationMessage('Lütfen transfer edilecek tahtaların sol tarafındaki kutucukları işaretleyiniz (En az 1 tahta seçilmelidir).');
      setShowValidationModal(true);
      return;
    }
    if (!targetId) {
      setValidationMessage('Lütfen tahtanın gönderileceği "2. Hedef Kurum"u seçiniz.');
      setShowValidationModal(true);
      return;
    }
    if (sourceId === targetId) {
      setValidationMessage('Kaynak kurum ile hedef kurum aynı olamaz! Lütfen farklı bir okul seçiniz.');
      setShowValidationModal(true);
      return;
    }
    if (!officialLetterNo || !officialLetterNo.trim()) {
      setValidationMessage('Lütfen "Resmi Onay Yazı No" alanını doldurunuz.');
      setShowValidationModal(true);
      return;
    }
    if (!transferDate) {
      setValidationMessage('Lütfen "Transfer Tarihi" seçiniz.');
      setShowValidationModal(true);
      return;
    }

    // Doğrulamalar başarılı -> Onay pop-up'ını aç
    setShowConfirmModal(true);
  };

  // ─── Kesin Onay Verildiğinde Transferi Gerçekleştir ───
  const handleExecuteTransfer = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      // 1. et_detay tablosunu güncelle
      const { error: updateErr } = await supabase
         .from('et_detay')
         .update({
             institution_id: targetId,
             et_durumu: 'Kullanımda',
             is_transferred: true,
             transfer_tarihi: transferDate,
             resmi_yazi_no: officialLetterNo.trim(),
             transfer_from: sourceId,
             bina: targetBina || '',
             kat: targetKat || '',
             sinif_lab: targetSinif || ''
         })
         .in('id', selectedBoardIds);
         
      if (updateErr) throw new Error('Tahtalar güncellenirken hata oluştu: ' + updateErr.message);

      // 2. Tahta tiplerine göre adet hesapla
      const countsByType = {
         'Vestel Siyah': 0, 'Vestel Gri': 0, 'Arçelik': 0, 'Aidata': 0
      };
      
      selectedBoardIds.forEach(id => {
         const b = surplusBoards.find(x => x.id === id);
         if (b && countsByType[b.et_tipi] !== undefined) {
             countsByType[b.et_tipi]++;
         }
      });
      
      const dbTypeMap = {
         'Vestel Siyah': 'vestel_black_boards',
         'Vestel Gri': 'vestel_grey_boards',
         'Arçelik': 'arcelik_boards',
         'Aidata': 'aidata_boards'
      };
      
      const sourceInst = institutions.find(i => String(i.id) === String(sourceId));
      const targetInst = institutions.find(i => String(i.id) === String(targetId));
      
      if (sourceInst && targetInst) {
          let sourceUpdate = {};
          let targetUpdate = {};
          for(let type in countsByType) {
             if (countsByType[type] > 0) {
                const dbKey = dbTypeMap[type];
                sourceUpdate[dbKey] = Math.max(0, parseInt(sourceInst[dbKey] || 0, 10) - countsByType[type]);
                targetUpdate[dbKey] = parseInt(targetInst[dbKey] || 0, 10) + countsByType[type];
             }
          }
          
          if (Object.keys(sourceUpdate).length > 0) {
              const sTotal = (sourceUpdate.vestel_black_boards ?? sourceInst.vestel_black_boards ?? 0) +
                             (sourceUpdate.vestel_grey_boards ?? sourceInst.vestel_grey_boards ?? 0) +
                             (sourceUpdate.arcelik_boards ?? sourceInst.arcelik_boards ?? 0) +
                             (sourceUpdate.aidata_boards ?? sourceInst.aidata_boards ?? 0);
              const tTotal = (targetUpdate.vestel_black_boards ?? targetInst.vestel_black_boards ?? 0) +
                             (targetUpdate.vestel_grey_boards ?? targetInst.vestel_grey_boards ?? 0) +
                             (targetUpdate.arcelik_boards ?? targetInst.arcelik_boards ?? 0) +
                             (targetUpdate.aidata_boards ?? targetInst.aidata_boards ?? 0);
              sourceUpdate.total_boards = sTotal;
              targetUpdate.total_boards = tTotal;

              await supabase.from('kurum_kayit').update(sourceUpdate).eq('id', sourceId);
              await supabase.from('kurum_kayit').update(targetUpdate).eq('id', targetId);
          }
      }
      
      // 3. board_transfers geçmiş tablosuna ekle
      const transferInserts = [];
      for(let type in countsByType) {
         if (countsByType[type] > 0) {
            transferInserts.push({
               date: transferDate,
               board_type: dbTypeMap[type],
               count: countsByType[type],
               from_institution_id: parseInt(sourceId, 10),
               to_institution_id: parseInt(targetId, 10),
               official_letter_no: officialLetterNo.trim(),
            });
         }
      }
      if (transferInserts.length > 0) {
         await supabase.from('board_transfers').insert(transferInserts);
      }
      
      // Başarı özetini hazırla
      setLastTransferSummary({
        fromName: sourceInst?.name || 'Kaynak Okul',
        toName: targetInst?.name || 'Hedef Okul',
        count: selectedBoardIds.length,
        date: transferDate,
        letterNo: officialLetterNo.trim()
      });

      // Geçmiş transfer listesini anında yenile
      fetchAllTransfers();
      
      // Form alanlarını sıfırla
      setTargetId('');
      setSelectedBoardIds([]);
      setOfficialLetterNo('');
      setTargetBina('');
      setTargetKat('');
      setTargetSinif('');
      
      const temp = sourceId;
      setSourceId('');
      setTimeout(() => setSourceId(temp), 50);

      // Başarı modalını aç
      setShowSuccessModal(true);
    } catch (err) {
      setValidationMessage('İşlem sırasında bir hata oluştu: ' + err.message);
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="rounded-3 bg-success-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
            <i className="fas fa-arrows-split-up-and-left text-success"></i>
          </span>
          <div>
            <h4 className="fw-bold mb-0 text-dark">Okullar Arası Tahta Transferi</h4>
            <span className="text-muted small">Kurumlardaki fazlalık etkileşimli tahtaların ihtiyaç sahibi okullara resmi devir işlemi</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/tahtalar/liste" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-list-check"></i>
            <span>Tahta Listesi</span>
          </Link>
          <Link href="/tahtalar/ekle" className="btn btn-primary-soft btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2">
            <i className="fas fa-plus-circle"></i>
            <span>Yeni Tahta Ekle</span>
          </Link>
        </div>
      </div>

      {/* ─── TRANSFER İŞLEM FORMU ─── */}
      <Form onSubmit={e => { e.preventDefault(); handleInitiateTransfer(); }}>
        <Row className="g-4 mb-5">
          {/* ─── 1. BÖLÜM: KAYNAK KURUM (TAHTANIN ALINACAĞI OKUL) ─── */}
          <Col lg={12}>
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="d-flex align-items-center gap-2">
                  <span className="section-icon-badge bg-danger-soft">
                    <i className="fas fa-arrow-up-from-bracket text-danger"></i>
                  </span>
                  <div>
                    <div className="section-title">1. Kaynak Kurum (Tahtanın Alınacağı Okul)</div>
                    <div className="text-muted small">Fazlalık durumunda etkileşimli tahtası bulunan okulu seçiniz</div>
                  </div>
                </div>
                <span className="badge-pill badge-pill-danger">Veren Okul</span>
              </div>
              <div className="p-4">
                <Row className="g-3 mb-3">
                  {/* İlçe Seçimi */}
                  <Col md={4}>
                    <Form.Floating>
                      <Form.Select
                        id="sourceDistrictId"
                        value={sourceDistrictId}
                        onChange={e => {
                          const val = e.target.value;
                          setSourceDistrictId(val);
                          setSourceId('');
                        }}
                        disabled={loading}
                      >
                        <option value="">Tüm İlçeler (19 İlçe)</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Form.Select>
                      <label htmlFor="sourceDistrictId">
                        <i className="fas fa-map-marker-alt me-2 text-muted"></i>İlçe Seçimi
                      </label>
                    </Form.Floating>
                  </Col>

                  {/* Doğrudan Okul Seçimi Dropdown'ı */}
                  <Col md={5}>
                    <Form.Floating>
                      <Form.Select
                        id="sourceId"
                        value={sourceId}
                        onChange={e => setSourceId(e.target.value)}
                        disabled={loading}
                        className={sourceId ? 'border-primary fw-bold' : ''}
                      >
                        <option value="">
                          {sourceDistrictId 
                            ? `-- ${getDistrictName(sourceDistrictId)} İlçesindeki Okulu Seçiniz (${availableSourceInstitutions.length} Okul) --` 
                            : `-- Okul Seçiniz (${availableSourceInstitutions.length} Okul) --`}
                        </option>
                        {availableSourceInstitutions.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} {inst.code ? `(Kod: ${inst.code})` : ''} - [{getDistrictName(inst.district_id)}]
                          </option>
                        ))}
                      </Form.Select>
                      <label htmlFor="sourceId">
                        <i className="fas fa-school me-2 text-primary"></i>Okul Seçimi *
                      </label>
                    </Form.Floating>
                  </Col>

                  {/* Hızlı Arama Kutusu */}
                  <Col md={3}>
                    <Form.Floating>
                      <Form.Control
                        type="text"
                        id="sourceSearchTerm"
                        placeholder="İsim veya kod ile daralt..."
                        value={sourceSearchTerm}
                        onChange={e => setSourceSearchTerm(e.target.value)}
                        disabled={loading}
                      />
                      <label htmlFor="sourceSearchTerm">
                        <i className="fas fa-filter me-2 text-muted"></i>Listeyi Daralt (İsim/Kod)
                      </label>
                    </Form.Floating>
                  </Col>
                </Row>

                {/* Seçilen Kaynak Kurum Rozeti / Bilgi Kartı */}
                {selectedSourceInst && (
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border mt-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                      <div className="avatar-mini bg-primary-soft text-primary" style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-check fa-lg"></i>
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-6">{selectedSourceInst.name}</div>
                        <div className="text-muted small">
                          İlçe: <strong className="text-dark">{getDistrictName(selectedSourceInst.district_id)}</strong> | Kurum Kodu: <strong className="text-dark font-monospace">{selectedSourceInst.code || '-'}</strong>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="rounded-pill px-3"
                      onClick={() => setSourceId('')}
                    >
                      <i className="fas fa-xmark me-1"></i> Başka Okul Seç
                    </Button>
                  </div>
                )}

                {/* Seçilen Kurumdaki Fazlalık Tahtalar Tablosu */}
                {sourceId && (
                  <div className="mt-4 pt-3 border-top">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <i className="fas fa-chalkboard text-warning"></i>
                        <span className="fw-bold text-dark">Bu Okuldaki Fazlalık Tahtalar</span>
                        <span className={`badge-pill ${surplusBoards.length > 0 ? 'badge-pill-success' : 'badge-pill-warning'}`}>
                          {surplusBoards.length} Adet
                        </span>
                      </div>
                      {surplusBoards.length > 0 && (
                        <div className="d-flex align-items-center gap-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={handleSelectAll} 
                            className="rounded-pill px-3"
                          >
                            <i className="fas fa-check-double me-1"></i>
                            {selectedBoardIds.length === surplusBoards.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                          </Button>
                          <span className="badge bg-primary px-3 py-2 rounded-pill">
                            {selectedBoardIds.length} Seçildi
                          </span>
                        </div>
                      )}
                    </div>

                    {loadingBoards ? (
                      <div className="text-center py-4 text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        <span>Fazlalık tahtalar yükleniyor...</span>
                      </div>
                    ) : surplusBoards.length > 0 ? (
                      <div className="table-responsive rounded-3 border">
                        <Table hover className="align-middle mb-0">
                          <thead className="bg-light">
                            <tr>
                              <th style={{ width: '48px' }} className="text-center">
                                <Form.Check 
                                  type="checkbox" 
                                  checked={selectedBoardIds.length === surplusBoards.length && surplusBoards.length > 0} 
                                  onChange={handleSelectAll} 
                                />
                              </th>
                              <th>Bina & Kat</th>
                              <th>Sınıf / Lab</th>
                              <th>ET Tipi (Model)</th>
                              <th>Boyut / Yön</th>
                              <th>Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {surplusBoards.map(b => (
                              <tr 
                                key={b.id} 
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleBoardToggle(b.id)}
                                className={selectedBoardIds.includes(b.id) ? 'table-primary' : ''}
                              >
                                <td className="text-center" onClick={e => e.stopPropagation()}>
                                  <Form.Check 
                                    type="checkbox" 
                                    checked={selectedBoardIds.includes(b.id)} 
                                    onChange={() => handleBoardToggle(b.id)} 
                                  />
                                </td>
                                <td>
                                  <span className="fw-semibold text-dark">{b.bina || 'Ana Bina'}</span>
                                  <span className="text-muted small ms-1">({b.kat || '-'})</span>
                                </td>
                                <td>{b.sinif_lab || '-'}</td>
                                <td>
                                  <span className="badge bg-light text-dark border font-monospace">{b.et_tipi}</span>
                                </td>
                                <td>{b.et_boyutu || '-'} / {b.et_yonu || '-'}</td>
                                <td>
                                  <span className="badge-pill badge-pill-warning">Fazlalık</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <Alert variant="warning" className="rounded-3 border-0 shadow-none mb-0">
                        <i className="fas fa-circle-info me-2"></i>
                        Seçilen bu kurumda <strong>Fazlalık</strong> statüsünde kayıtlı etkileşimli tahta bulunamadı. Tahtaları transfer edebilmek için önce "Kurum Tahta Listesi" ekranından tahtanın durumunu <em>"Fazlalık"</em> olarak güncellemelisiniz.
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* ─── 2. BÖLÜM: HEDEF KURUM (TAHTANIN GÖNDERİLECEĞİ OKUL) ─── */}
          <Col lg={12}>
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="d-flex align-items-center gap-2">
                  <span className="section-icon-badge bg-success-soft">
                    <i className="fas fa-arrow-down-to-bracket text-success"></i>
                  </span>
                  <div>
                    <div className="section-title">2. Hedef Kurum (Tahtanın Gönderileceği Okul)</div>
                    <div className="text-muted small">Tahtaların yeni kurulumunun yapılacağı ihtiyaç sahibi okulu seçiniz</div>
                  </div>
                </div>
                <span className="badge-pill badge-pill-success">Alan Okul</span>
              </div>
              <div className="p-4">
                <Row className="g-3 mb-3">
                  {/* Hedef İlçe Seçimi */}
                  <Col md={4}>
                    <Form.Floating>
                      <Form.Select
                        id="targetDistrictId"
                        value={targetDistrictId}
                        onChange={e => {
                          const val = e.target.value;
                          setTargetDistrictId(val);
                          setTargetId('');
                        }}
                        disabled={loading}
                      >
                        <option value="">Tüm İlçeler (19 İlçe)</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Form.Select>
                      <label htmlFor="targetDistrictId">
                        <i className="fas fa-map-marker-alt me-2 text-muted"></i>Hedef İlçe Seçimi
                      </label>
                    </Form.Floating>
                  </Col>

                  {/* Doğrudan Hedef Okul Dropdown'ı */}
                  <Col md={5}>
                    <Form.Floating>
                      <Form.Select
                        id="targetId"
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        disabled={loading}
                        className={targetId ? 'border-success fw-bold' : ''}
                      >
                        <option value="">
                          {targetDistrictId 
                            ? `-- ${getDistrictName(targetDistrictId)} İlçesindeki Hedef Okulu Seçiniz (${availableTargetInstitutions.length} Okul) --` 
                            : `-- Hedef Okulu Seçiniz (${availableTargetInstitutions.length} Okul) --`}
                        </option>
                        {availableTargetInstitutions.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} {inst.code ? `(Kod: ${inst.code})` : ''} - [{getDistrictName(inst.district_id)}]
                          </option>
                        ))}
                      </Form.Select>
                      <label htmlFor="targetId">
                        <i className="fas fa-school me-2 text-success"></i>Hedef Okul Seçimi *
                      </label>
                    </Form.Floating>
                  </Col>

                  {/* Hedef Arama Kutusu */}
                  <Col md={3}>
                    <Form.Floating>
                      <Form.Control
                        type="text"
                        id="targetSearchTerm"
                        placeholder="İsim veya kod ile daralt..."
                        value={targetSearchTerm}
                        onChange={e => setTargetSearchTerm(e.target.value)}
                        disabled={loading}
                      />
                      <label htmlFor="targetSearchTerm">
                        <i className="fas fa-filter me-2 text-muted"></i>Listeyi Daralt (İsim/Kod)
                      </label>
                    </Form.Floating>
                  </Col>
                </Row>

                {/* Seçilen Hedef Kurum Rozeti */}
                {selectedTargetInst && (
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border mt-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                      <div className="avatar-mini bg-success-soft text-success" style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-check fa-lg"></i>
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-6">{selectedTargetInst.name}</div>
                        <div className="text-muted small">
                          İlçe: <strong className="text-dark">{getDistrictName(selectedTargetInst.district_id)}</strong> | Kurum Kodu: <strong className="text-dark font-monospace">{selectedTargetInst.code || '-'}</strong>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="rounded-pill px-3"
                      onClick={() => setTargetId('')}
                    >
                      <i className="fas fa-xmark me-1"></i> Başka Okul Seç
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* ─── 3. BÖLÜM: YERLEŞİM & RESMİ YAZI BİLGİLERİ ─── */}
          <Col lg={12}>
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="d-flex align-items-center gap-2">
                  <span className="section-icon-badge bg-info-soft">
                    <i className="fas fa-file-signature text-info"></i>
                  </span>
                  <div>
                    <div className="section-title">3. Yeni Kurulum Yeri & Resmi Evrak Bilgileri</div>
                    <div className="text-muted small">Tahtaların hedef okuldaki yerleşimi ve resmi onay evrakı</div>
                  </div>
                </div>
                <span className="badge-pill badge-pill-info">Kurulum & Onay</span>
              </div>
              <div className="p-4">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Floating>
                      <Form.Select 
                        id="targetBina"
                        value={targetBina} 
                        onChange={e => setTargetBina(e.target.value)}
                      >
                        <option value="">Seçiniz (Varsayılan: Ana Bina)</option>
                        <option value="Ana Bina">Ana Bina</option>
                        <option value="Ek Bina">Ek Bina</option>
                      </Form.Select>
                      <label htmlFor="targetBina">
                        <i className="fas fa-building me-2 text-muted"></i>Kurulacak Bina
                      </label>
                    </Form.Floating>
                  </Col>
                  <Col md={4}>
                    <Form.Floating>
                      <Form.Select 
                        id="targetKat"
                        value={targetKat} 
                        onChange={e => setTargetKat(e.target.value)}
                      >
                        <option value="">Seçiniz</option>
                        {KAT_OPTIONS.map(ko => <option key={ko} value={ko}>{ko}</option>)}
                      </Form.Select>
                      <label htmlFor="targetKat">
                        <i className="fas fa-stairs me-2 text-muted"></i>Kurulacak Kat
                      </label>
                    </Form.Floating>
                  </Col>
                  <Col md={4}>
                    <Form.Floating>
                      <Form.Control 
                        type="text" 
                        id="targetSinif"
                        placeholder="Örn: 9/A, Bilişim Lab" 
                        value={targetSinif} 
                        onChange={e => setTargetSinif(e.target.value)} 
                      />
                      <label htmlFor="targetSinif">
                        <i className="fas fa-chalkboard-user me-2 text-muted"></i>Sınıf / Laboratuvar Adı
                      </label>
                    </Form.Floating>
                  </Col>
                  <Col md={6}>
                    <Form.Floating>
                      <Form.Control
                        type="date"
                        id="transferDate"
                        value={transferDate}
                        onChange={e => setTransferDate(e.target.value)}
                        required
                      />
                      <label htmlFor="transferDate">
                        <i className="fas fa-calendar-day me-2 text-muted"></i>Transfer Tarihi *
                      </label>
                    </Form.Floating>
                  </Col>
                  <Col md={6}>
                    <Form.Floating>
                      <Form.Control
                        type="text"
                        id="officialLetterNo"
                        placeholder="Örn: E-12345678-903-8877"
                        value={officialLetterNo}
                        onChange={e => setOfficialLetterNo(e.target.value)}
                        required
                      />
                      <label htmlFor="officialLetterNo">
                        <i className="fas fa-file-lines me-2 text-muted"></i>Resmi Onay Yazı No *
                      </label>
                    </Form.Floating>
                  </Col>
                </Row>
                <div className="mt-3 text-muted small">
                  <i className="fas fa-circle-info me-1 text-primary"></i>
                  Bina, kat ve sınıf bilgileri isteğe bağlıdır; birden fazla tahta seçilmişse girilen yerleşim bilgileri seçilen tüm tahtalara uygulanacaktır.
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Transfer Onay & Gönderim Butonu */}
        <div className="d-flex align-items-center justify-content-end gap-3 mt-4 pt-2 mb-5">
          <Link href="/tahtalar/liste" className="btn btn-light rounded-pill px-4 border">
            İptal
          </Link>
          <Button
            type="button"
            variant="success"
            onClick={handleInitiateTransfer}
            disabled={loading}
            className="rounded-pill px-5 shadow fw-semibold d-inline-flex align-items-center gap-2"
            style={{ height: 50, fontSize: '1.05rem' }}
          >
            {loading ? (
              <>
                <Spinner size="sm" animation="border" />
                <span>Transfer Ediliyor...</span>
              </>
            ) : (
              <>
                <i className="fas fa-arrows-split-up-and-left"></i>
                <span>{selectedBoardIds.length > 0 ? `${selectedBoardIds.length} Adet Tahtanın Transferini Tamamla` : 'Transferi Tamamla'}</span>
              </>
            )}
          </Button>
        </div>
      </Form>

      {/* ─── 4. BÖLÜM: TÜM GEÇMİŞ TRANSFER HAREKETLERİ & GELİŞMİŞ FİLTRELEME ─── */}
      <div className="form-section-card mb-5">
        <div className="form-section-header flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="section-icon-badge bg-primary-soft">
              <i className="fas fa-clock-rotate-left text-primary"></i>
            </span>
            <div>
              <div className="section-title">Geçmiş Tahta Transfer Hareketleri & Kayıtları</div>
              <div className="text-muted small">Ordu il genelinde okullar arasında gerçekleşen tüm tahta nakil işlemleri</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge-pill badge-pill-info">
              {filteredTransfers.length} / {transfers.length} İşlem
            </span>
            <span className="badge-pill badge-pill-success">
              Toplam {totalTransferredCount} Tahta
            </span>
          </div>
        </div>

        {/* Filtreleme Çubuğu */}
        <div className="p-3 bg-light border-bottom">
          <Row className="g-2 align-items-center">
            {/* 1. Kelime / Okul Arama */}
            <Col xs={12} md={3}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0">
                  <i className="fas fa-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Okul adı veya kodu ara..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>

            {/* 2. İlçe Filtresi */}
            <Col xs={6} md={2}>
              <Form.Select 
                size="sm"
                value={historyDistrict}
                onChange={e => setHistoryDistrict(e.target.value)}
              >
                <option value="">Tüm İlçeler</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Form.Select>
            </Col>

            {/* 3. Tahta Modeli Filtresi */}
            <Col xs={6} md={2}>
              <Form.Select
                size="sm"
                value={historyBoardType}
                onChange={e => setHistoryBoardType(e.target.value)}
              >
                <option value="">Tüm Tahta Tipleri</option>
                {BOARD_TYPES.map(bt => (
                  <option key={bt.key} value={bt.key}>{bt.label}</option>
                ))}
              </Form.Select>
            </Col>

            {/* 4. Başlangıç Tarihi */}
            <Col xs={6} md={2}>
              <Form.Control
                size="sm"
                type="date"
                title="Başlangıç Tarihi"
                value={historyStartDate}
                onChange={e => setHistoryStartDate(e.target.value)}
              />
            </Col>

            {/* 5. Bitiş Tarihi */}
            <Col xs={6} md={2}>
              <Form.Control
                size="sm"
                type="date"
                title="Bitiş Tarihi"
                value={historyEndDate}
                onChange={e => setHistoryEndDate(e.target.value)}
              />
            </Col>

            {/* 6. Temizle Butonu */}
            <Col xs={12} md={1} className="d-flex justify-content-end">
              {(historySearch || historyDistrict || historyBoardType || historyStartDate || historyEndDate) ? (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={resetHistoryFilters}
                  className="rounded-pill w-100"
                  title="Filtreleri Sıfırla"
                >
                  <i className="fas fa-rotate-left me-1"></i>Sıfırla
                </Button>
              ) : (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={fetchAllTransfers}
                  className="rounded-pill w-100"
                  title="Yenile"
                >
                  <i className="fas fa-arrows-rotate"></i>
                </Button>
              )}
            </Col>
          </Row>
        </div>

        {/* Tablo Alanı */}
        <div className="p-0">
          {loadingTransfers ? (
            <div className="text-center py-5">
              <Spinner animation="border" size="sm" className="me-2 text-primary" />
              <span className="text-muted">Transfer geçmişi yükleniyor...</span>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{ minWidth: 120 }}>Tarih</th>
                    <th style={{ minWidth: 140 }}>Tahta Modeli</th>
                    <th style={{ minWidth: 90 }} className="text-center">Adet</th>
                    <th style={{ minWidth: 260 }}>Gönderen Okul (Kaynak)</th>
                    <th style={{ minWidth: 260 }}>Alan Okul (Hedef)</th>
                    <th style={{ minWidth: 80 }} className="text-end">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map(tr => {
                    const fromInst = getInstitutionObj(tr.from_institution_id);
                    const toInst = getInstitutionObj(tr.to_institution_id);
                    return (
                      <tr key={tr.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-calendar-day text-muted small"></i>
                            <span className="fw-semibold text-dark">{tr.date}</span>
                          </div>
                          {tr.official_letter_no && (
                            <div className="small text-muted font-monospace mt-1">
                              <i className="fas fa-file-lines me-1 text-secondary"></i>{tr.official_letter_no}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">
                            {getBoardTypeLabel(tr.board_type)}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary-soft text-primary rounded-pill px-3 py-1 fw-bold fs-6">
                            {tr.count} Adet
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-dark">
                              {fromInst ? fromInst.name : `Kurum ID: ${tr.from_institution_id}`}
                            </span>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              {fromInst && (
                                <>
                                  <span className="badge bg-light text-muted border small">
                                    {getDistrictName(fromInst.district_id)}
                                  </span>
                                  {fromInst.code && (
                                    <span className="text-muted small font-monospace">#{fromInst.code}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-success">
                              {toInst ? toInst.name : `Kurum ID: ${tr.to_institution_id}`}
                            </span>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              {toInst && (
                                <>
                                  <span className="badge bg-light text-muted border small">
                                    {getDistrictName(toInst.district_id)}
                                  </span>
                                  {toInst.code && (
                                    <span className="text-muted small font-monospace">#{toInst.code}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-end">
                          {toInst && (
                            <Link 
                              href={`/kurumlar/bilgi/${toInst.id}`} 
                              className="btn btn-outline-primary btn-sm rounded-pill px-2 py-1"
                              title="Hedef Okul Detayını Gör"
                            >
                              <i className="fas fa-eye small"></i>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <i className="fas fa-inbox fa-3x text-muted mb-3 opacity-50"></i>
                          <h6 className="fw-bold mb-1">Kayıt Bulunamadı</h6>
                          <p className="small text-muted mb-0">
                            {(historySearch || historyDistrict || historyBoardType || historyStartDate || historyEndDate)
                              ? 'Belirlediğiniz filtreleme kriterlerine uygun transfer işlemi bulunamadı.'
                              : 'Sistemde henüz kayıtlı tahta transfer işlemi bulunmuyor.'}
                          </p>
                          {(historySearch || historyDistrict || historyBoardType || historyStartDate || historyEndDate) && (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={resetHistoryFilters} 
                              className="mt-3 rounded-pill px-4"
                            >
                              Filtreleri Temizle
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ─── POP-UP 1: EKSİK BİLGİ / DOĞRULAMA UYARI MODALI ─── */}
      {/* ============================================================ */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-warning text-dark border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-triangle-exclamation fa-lg text-dark"></i>
              <h5 className="modal-title fw-bold mb-0">Eksik Bilgi Uyarısı</h5>
            </div>
            <button type="button" className="btn-close" onClick={() => setShowValidationModal(false)}></button>
          </div>
          <div className="modal-body p-4 text-center">
            <div className="avatar-mini mx-auto mb-3 bg-warning-soft text-warning" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-circle-exclamation"></i>
            </div>
            <h6 className="fw-bold mb-2 text-dark">İşlem Başlatılamadı</h6>
            <p className="text-muted mb-0">{validationMessage}</p>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-center">
            <Button variant="primary" className="rounded-pill px-4" onClick={() => setShowValidationModal(false)}>
              Tamam, Dolduracağım
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* ─── POP-UP 2: İŞLEMİ ONAYLIYOR MUSUNUZ? (EMİN MİSİNİZ?) ─── */}
      {/* ============================================================ */}
      <Modal show={showConfirmModal} onHide={() => !loading && setShowConfirmModal(false)} centered size="lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-primary text-white border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-question-circle fa-lg"></i>
              <h5 className="modal-title fw-bold mb-0">Tahta Transfer Onayı</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" disabled={loading} onClick={() => setShowConfirmModal(false)}></button>
          </div>
          <div className="modal-body p-4">
            <div className="text-center mb-4">
              <div className="avatar-mini mx-auto mb-2 bg-primary-soft text-primary" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-arrows-split-up-and-left"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Transfer İşlemini Onaylıyor musunuz?</h5>
              <p className="text-muted small mb-0">Lütfen aşağıdaki transfer detaylarını kontrol ediniz. Bu işlem geri alınamaz.</p>
            </div>

            <Card className="border shadow-none rounded-3 mb-3 bg-light">
              <Card.Body className="p-3">
                <Row className="g-3">
                  <Col md={6}>
                    <div className="p-3 bg-white rounded-3 border h-100">
                      <div className="small text-danger fw-bold text-uppercase mb-1">
                        <i className="fas fa-arrow-up-from-bracket me-1"></i> Gönderen Kurum (Kaynak)
                      </div>
                      <div className="fw-bold text-dark">{selectedSourceInst?.name}</div>
                      <div className="small text-muted">
                        İlçe: {getDistrictName(selectedSourceInst?.district_id)} | Kod: {selectedSourceInst?.code || '-'}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 bg-white rounded-3 border h-100">
                      <div className="small text-success fw-bold text-uppercase mb-1">
                        <i className="fas fa-arrow-down-to-bracket me-1"></i> Alan Kurum (Hedef)
                      </div>
                      <div className="fw-bold text-dark">{selectedTargetInst?.name}</div>
                      <div className="small text-muted">
                        İlçe: {getDistrictName(selectedTargetInst?.district_id)} | Kod: {selectedTargetInst?.code || '-'}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <div className="p-3 bg-white rounded-3 border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">
                  <i className="fas fa-chalkboard text-warning me-2"></i>Transfer Edilecek Tahtalar:
                </span>
                <span className="badge-pill badge-pill-success">{selectedBoardIds.length} Adet</span>
              </div>
              <ul className="list-unstyled mb-0 small text-muted">
                {selectedBoardsList.map((b, idx) => (
                  <li key={b.id} className="py-1 border-bottom d-flex justify-content-between">
                    <span><strong>#{idx + 1}</strong> - {b.et_tipi} ({b.bina || 'Ana Bina'} - {b.kat || '-'} / {b.sinif_lab || '-'})</span>
                    <span className="badge bg-light text-dark border font-monospace">{b.et_boyutu || ''}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-3 bg-light border small text-muted">
              <div><strong>Transfer Tarihi:</strong> {transferDate}</div>
              <div><strong>Resmi Onay Yazı No:</strong> {officialLetterNo}</div>
              {targetBina && <div><strong>Yeni Yerleşim:</strong> {targetBina} {targetKat ? `- ${targetKat}` : ''} {targetSinif ? `(${targetSinif})` : ''}</div>}
            </div>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-end gap-2">
            <Button variant="secondary" className="rounded-pill px-4" disabled={loading} onClick={() => setShowConfirmModal(false)}>
              Vazgeç
            </Button>
            <Button 
              variant="success" 
              className="rounded-pill px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
              disabled={loading}
              onClick={handleExecuteTransfer}
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>İşlem Yapılıyor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  <span>Evet, Transferi Gerçekleştir</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* ─── POP-UP 3: İŞLEM TAMAMLANDI BAŞARI MODALI ─── */}
      {/* ============================================================ */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-success text-white border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-circle-check fa-lg"></i>
              <h5 className="modal-title fw-bold mb-0">İşlem Tamamlandı!</h5>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={() => setShowSuccessModal(false)}></button>
          </div>
          <div className="modal-body p-4 text-center">
            <div className="avatar-mini mx-auto mb-3 bg-success-soft text-success" style={{ width: 72, height: 72, fontSize: '2.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-check"></i>
            </div>
            <h5 className="fw-bold mb-2 text-dark">Tahta Transferi Başarıyla Gerçekleşti</h5>
            <p className="text-muted small mb-3">
              Seçilen <strong>{lastTransferSummary?.count || 1} adet</strong> etkileşimli tahta, <strong>{lastTransferSummary?.fromName}</strong> kurumundan <strong>{lastTransferSummary?.toName}</strong> kurumuna başarıyla devredildi ve resmi envanter güncellendi.
            </p>
            <div className="p-3 bg-light rounded-3 border text-start small">
              <div className="text-muted mb-1">
                <strong>Resmi Yazı No:</strong> {lastTransferSummary?.letterNo}
              </div>
              <div className="text-muted">
                <strong>Transfer Tarihi:</strong> {lastTransferSummary?.date}
              </div>
            </div>
          </div>
          <div className="modal-footer border-0 bg-light px-4 py-3 justify-content-center">
            <Button variant="success" className="rounded-pill px-5 fw-bold shadow-sm" onClick={() => setShowSuccessModal(false)}>
              Harika, Teşekkürler
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
}
