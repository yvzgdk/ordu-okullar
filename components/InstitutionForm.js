// components/InstitutionForm.js

import { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert, Card, Modal, Nav, Tab, Spinner } from 'react-bootstrap';
import { supabase } from '../lib/supabase';
import { mutate } from 'swr';
import { useRouter } from 'next/router';

const FIELD_GROUPS = {
  basic: {
    title: <span><i className="fas fa-info-circle me-2 text-primary"></i>Kurum</span>,
    fields: [
      { name: 'status', label: 'Kurum Durumu', type: 'status', required: false },
      { name: 'district', label: 'İlçe Seçiniz', type: 'district', required: false },
      { name: 'code', label: 'Kurum Kodu', type: 'code', required: false },
      { name: 'name', label: 'Kurum Adı', type: 'name', required: false },
      { name: 'bds', label: 'Derslik Sayısı', type: 'bds', required: false },
      { name: 'cbs1_cbs2_row', label: '', type: 'cbs1_cbs2_row', required: false },
      { name: 'related_institution', label: 'İlişkili Kurum', type: 'related_institution', required: false }
    ]
  },
  infrastructure: {
    title: <span><i className="fas fa-network-wired me-2 text-info"></i>Altyapı</span>,
    fields: [
      { name: 'has_infrastructure', label: 'Altyapı Var mı?', type: 'has_infrastructure', required: false },
      { name: 'infrastructure_owner', label: 'Altyapı Hangi Kuruma Ait?', type: 'infrastructure_owner', required: false },
      { name: 'is_fatih', label: 'Altyapı Fatih Projesi Kapsamında mı?', type: 'is_fatih', required: false },
      { name: 'faz', label: 'Faz Seç', type: 'faz', required: false },
      { name: 'infrastructure', label: 'Altyapı Seç', type: 'infrastructure', required: false },
      { name: 'altyapi_planlama', label: 'Altyapı Planlama', type: 'altyapi_planlama', required: false },
      { name: 'internet_type', label: 'İnternet Tipi', type: 'internet_type', required: false }
    ]
  },
  equipment: {
    title: <span><i className="fas fa-chalkboard me-2 text-warning"></i>Tahta</span>,
    fields: [
      { name: 'board_owner', label: 'Tahtalar Hangi Kuruma Ait?', type: 'board_owner', required: false },
      { name: 'vestel_black', label: 'Vestel Siyah Tahta', type: 'vestel_black', required: false },
      { name: 'vestel_gray', label: 'Vestel Gri Tahta', type: 'vestel_gray', required: false },
      { name: 'arcelik', label: 'Arçelik Tahta', type: 'arcelik', required: false },
      { name: 'aidata', label: 'Aidata Tahta', type: 'aidata', required: false },
      { name: 'total_boards', label: 'Toplam Tahta', type: 'total_boards', required: false }
    ]
  },
  bt_class: {
    title: <span><i className="fas fa-desktop me-2 text-success"></i>BT Sınıfı</span>,
    fields: [
      { name: 'has_bt_class', label: 'BT Sınıfı Var mı?', type: 'has_bt_class', required: false },
      { name: 'bt_labs', label: 'BT Laboratuvarları', type: 'bt_labs', required: false }
    ]
  },
  contact: {
    title: <span><i className="fas fa-user-tie me-2 text-secondary"></i>İletişim</span>,
    fields: [
      { name: 'contact_name', label: 'Yetkili Ad Soyad', type: 'contact_name', required: false },
      { name: 'contact_phone', label: 'Yetkili Telefon', type: 'contact_phone', required: false }
    ]
  }
};

const validFields = [
  'district_id', 'code', 'cbs1', 'cbs2', 'name', 'status', 'related_institution_id',
  'infrastructure_owner', 'is_fatih', 'phase', 'infrastructure', 'infrastructure_plan',
  'internet_type', 'board_owner', 'vestel_black', 'vestel_gray', 'arcelik', 'aidata',
  'total_boards', 'director', 'director_phone', 'has_bt_class', 'bt_labs',
  'has_infrastructure', 'altyapi_planlama'
];

export default function InstitutionForm({ initialValues = {}, editMode = false, onSuccess, onClose, guestMode = false }) {
  const router = useRouter();
  const [districtId, setDistrictId] = useState('');
  const [code, setCode] = useState('');
  const [cbs1, setCbs1] = useState('');
  const [cbs2, setCbs2] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [relatedInstitutionId, setRelatedInstitutionId] = useState('');
  const [infraOwner, setInfraOwner] = useState('');
  const [isFatih, setIsFatih] = useState(false);
  const [faz, setFaz] = useState('');
  const [altyapi, setAltyapi] = useState('');
  const [altyapiPlan, setAltyapiPlan] = useState('');
  const [internetType, setInternetType] = useState('');
  const [boardOwner, setBoardOwner] = useState('');
  const [vestelBlack, setVestelBlack] = useState(0);
  const [vestelGrey, setVestelGrey] = useState(0);
  const [arcelik, setArcelik] = useState(0);
  const [aidata, setAidata] = useState(0);
  const [director, setDirector] = useState('');
  const [directorPhone, setDirectorPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [hasGuestInstitution, setHasGuestInstitution] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasBtClass, setHasBtClass] = useState('');
  const [btLabs, setBtLabs] = useState([]);
  const [hasInfrastructure, setHasInfrastructure] = useState('');
  const [altyapiPlanlama, setAltyapiPlanlama] = useState('');
  const [districts, setDistricts] = useState([]);
  // 1. State ekle
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [bds, setBds] = useState('');

  // Toplam tahta otomatik hesaplama
  const totalBoards =
    (parseInt(vestelBlack) || 0) +
    (parseInt(vestelGrey) || 0) +
    (parseInt(arcelik) || 0) +
    (parseInt(aidata) || 0);

  // Diğer kurumları Supabase'den çek (misafir/ev sahibi için)
  useEffect(() => {
    async function fetchInstitutions() {
      const { data, error } = await supabase
        .from('kurum_kayit')
        .select('id, name, district_id, status, code')
        .order('name', { ascending: true });
      if (!error) setInstitutions(data || []);
    }
    fetchInstitutions();
  }, []);

  useEffect(() => {
    async function fetchDistricts() {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name', { ascending: true });
      if (!error) setDistricts(data || []);
    }
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (editMode && initialValues) {
      console.log('InstitutionForm initialValues:', initialValues);
      setDistrictId(initialValues.district_id ? String(initialValues.district_id) : '');
      setCode(initialValues.code || '');
      setCbs1(initialValues.cbs1 || '');
      setCbs2(initialValues.cbs2 || '');
      setName(initialValues.name || '');
      setBds(initialValues.bds !== undefined ? String(initialValues.bds) : '');
      setStatus(initialValues.status || '');
      setRelatedInstitutionId(initialValues.related_institution_id || '');
      setInfraOwner(initialValues.infra_owner || '');
      setIsFatih(!!initialValues.is_fatih);
      setFaz(initialValues.faz || '');
      setAltyapi(initialValues.altyapi || '');
      setAltyapiPlanlama(initialValues.altyapi_planlama || 'yok');
      setInternetType(initialValues.internet_type || '');
      setBoardOwner(initialValues.board_owner || 'ev_sahibi');
      setVestelBlack(initialValues.vestel_black_boards || 0);
      setVestelGrey(initialValues.vestel_grey_boards || 0);
      setArcelik(initialValues.arcelik_boards || 0);
      setAidata(initialValues.aidata_boards || 0);
      setDirector(initialValues.director || initialValues.contact_name || '');
      setDirectorPhone(initialValues.director_phone || initialValues.contact_phone || '');
      setHasBtClass(initialValues.has_bt_class ? 'var' : 'yok');
      setBtLabs(initialValues.bt_labs || []);
      setHasInfrastructure(initialValues.has_infrastructure ? 'var' : 'yok');
      setAltyapiPlanlama(initialValues.altyapi_planlama || 'yok');
    }
  }, [JSON.stringify(initialValues), editMode]);

  useEffect(() => {
    if (status === 'ev_sahibi' && hasInfrastructure === 'yok') {
      setInfraOwner('yok');
    }
  }, [status, hasInfrastructure]);

  // guestMode ise kurum durumu otomatik misafir ve değiştirilemez
  useEffect(() => {
    if (guestMode) {
      setStatus('misafir');
    }
  }, [guestMode]);

  useEffect(() => {
    if (!isFatih) {
      setFaz('');
    }
  }, [isFatih]);

  useEffect(() => {
    if (editMode && initialValues && initialValues.faz !== undefined) {
      setFaz(initialValues.faz || '');
    }
  }, [editMode, initialValues?.faz]);

  // 2. handleSubmit'i ikiye böl
  
  const handleCodeBlur = async () => {
    if (code) {
       const { data } = await supabase.from('kurum_kayit').select('id').eq('code', code).maybeSingle();
       if (data && (!editMode || String(data.id) !== String(initialValues.id))) {
          setShowDuplicateModal(true);
       }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (code) {
       const { data } = await supabase.from('kurum_kayit').select('id, name').eq('code', code).maybeSingle();
       if (data && (!editMode || String(data.id) !== String(initialValues.id))) {
          setShowDuplicateModal(true);
          return;
       }
    }
    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);

    try {
      // Eğer ev sahibi + misafir kurum seçildiyse ve seçilen kurumun status'ü ev_sahibi ise, onu misafir yap
      if (status === 'ev_sahibi' && hasGuestInstitution && relatedInstitutionId) {
        const selectedGuest = institutions.find(i => String(i.id) === String(relatedInstitutionId));
        if (selectedGuest && selectedGuest.status === 'ev_sahibi') {
          await supabase
            .from('kurum_kayit')
            .update({ status: 'misafir' })
            .eq('id', relatedInstitutionId);
        }
      }

      const institution = {
        district_id: districtId ? Number(districtId) : null,
        code,
        cbs1,
        cbs2,
        name,
        bds: bds !== '' ? Number(bds) : null,
        status,
        related_institution_id: relatedInstitutionId ? Number(relatedInstitutionId) : null,
        infra_owner: infraOwner,
        is_fatih: !!isFatih,
        faz: faz,
        altyapi: altyapi,
        infrastructure_plan: altyapiPlan,
        internet_type: internetType,
        board_owner: boardOwner,
        vestel_black_boards: Number(vestelBlack) || 0,
        vestel_grey_boards: Number(vestelGrey) || 0,
        arcelik_boards: Number(arcelik) || 0,
        aidata_boards: Number(aidata) || 0,
        total_boards: Number(totalBoards) || 0,
        director: director,
        director_phone: directorPhone,
        has_bt_class: hasBtClass === 'var',
        bt_labs: Array.isArray(btLabs) ? btLabs : [],
        has_infrastructure: hasInfrastructure === 'var',
        altyapi_planlama: altyapiPlanlama
      };

      // allowedFields dizisine tahta sayısı alanlarını ekle
      const allowedFields = [
        'district_id', 'code', 'cbs1', 'cbs2', 'name', 'status', 'related_institution_id',
        'infra_owner', 'is_fatih', 'faz', 'altyapi', 'infrastructure_plan', 'internet_type',
        'board_owner', 'vestel_black_boards', 'vestel_grey_boards', 'arcelik_boards', 'aidata_boards',
        'total_boards', 'director', 'director_phone', 'has_bt_class', 'bt_labs', 'has_infrastructure',
        'altyapi_planlama', 'created_at', 'bds'
      ];

      // Sadece allowedFields alanlarını gönder
      const filteredInstitution = {};
      Object.keys(institution).forEach(key => {
        if (allowedFields.includes(key)) filteredInstitution[key] = institution[key];
      });
      // status alanı boşsa otomatik olarak 'ev_sahibi' ata
      if (!filteredInstitution.status) filteredInstitution.status = 'ev_sahibi';
      console.log('filteredInstitution:', filteredInstitution);

      let data, error;
      if (editMode && initialValues.id) {
        // GÜNCELLEME
        const result = await supabase
          .from('kurum_kayit')
          .update(filteredInstitution)
          .eq('id', initialValues.id)
          .select(); // Güncellenen veriyi döndür

        data = result.data;
        error = result.error;
        console.log('UPDATE result:', { data, error, id: initialValues.id, filteredInstitution });

        if (!error) {
          if (onSuccess) onSuccess(data?.[0] || null);
          // SWR cache'ini yenile
          mutate('institutions');
          setErrorMsg('');
          setShowSuccessModal(true);
          // Formu temizle
          setDistrictId('');
          setCode('');
          setCbs1('');
          setCbs2('');
          setName('');
          setBds('');
          setStatus('');
          setRelatedInstitutionId('');
          setInfraOwner('');
          setIsFatih(false);
          setFaz('');
          setAltyapi('');
          setAltyapiPlan('');
          setInternetType('');
          setBoardOwner('ev_sahibi');
          setVestelBlack(0);
          setVestelGrey(0);
          setArcelik(0);
          setAidata(0);
          setDirector('');
          setDirectorPhone('');
          setHasBtClass('yok');
          setBtLabs([]);
          setHasInfrastructure('var');
          setAltyapiPlanlama('yok');
          setActiveTab('basic');
        } else {
          throw error;
        }
      } else {
        // EKLEME
        const result = await supabase
          .from('kurum_kayit')
          .insert([filteredInstitution])
          .select();

        data = result.data;
        error = result.error;
        console.log('INSERT result:', { data, error, filteredInstitution });

        if (!error) {
          if (onSuccess) onSuccess(data?.[0] || null);
          // SWR cache'ini yenile
          mutate('institutions');
          setErrorMsg('');
          setShowSuccessModal(true);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrorMsg(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const tabs = Object.keys(FIELD_GROUPS);
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const tabs = Object.keys(FIELD_GROUPS);
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const addBtLab = () => setBtLabs([...btLabs, { pc_count: '', lab_status: '', lab_source: '', has_board: 'yok' }]);
  const removeBtLab = (idx) => setBtLabs(btLabs.filter((_, i) => i !== idx));
  const updateBtLab = (idx, field, value) => setBtLabs(btLabs.map((lab, i) => i === idx ? { ...lab, [field]: value } : lab));

  const renderField = (field) => {
    switch (field.name) {
      case 'district':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="districtSelect"
              value={districtId}
              onChange={e => setDistrictId(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Form.Select>
            <label htmlFor="districtSelect">İlçe Seçiniz</label>
          </Form.Floating>
        );
      case 'code':
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id="codeInput"
              type="text"
              placeholder=" "
              value={code}
              onChange={e => setCode(e.target.value)}
              onBlur={handleCodeBlur}
              className="border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            />
            <label htmlFor="codeInput">Kurum Kodu</label>
          </Form.Floating>
        );
      case 'name':
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id="nameInput"
              type="text"
              placeholder=" "
              value={name}
              onChange={e => setName(e.target.value)}
              className="border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            />
            <label htmlFor="nameInput">Kurum Adı</label>
          </Form.Floating>
        );
      case 'bds':
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id="bdsInput"
              type="number"
              min="0"
              placeholder=" "
              value={bds}
              onChange={e => setBds(e.target.value.replace(/[^0-9]/g, ''))}
              className="border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            />
            <label htmlFor="bdsInput">Derslik Sayısı</label>
          </Form.Floating>
        );
      case 'cbs1_cbs2_row':
        return (
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Floating>
                <Form.Control
                  id="cbs1Input"
                  type="text"
                  placeholder=" "
                  value={cbs1}
                  onChange={e => setCbs1(e.target.value)}
                  className="border-0 shadow-sm bg-light"
                  style={{ height: '3.5rem' }}
                  disabled={guestMode}
                />
                <label htmlFor="cbs1Input">CBS 1 Numarası</label>
              </Form.Floating>
            </Col>
            <Col md={6}>
              <Form.Floating>
                <Form.Control
                  id="cbs2Input"
                  type="text"
                  placeholder=" "
                  value={cbs2}
                  onChange={e => setCbs2(e.target.value)}
                  className="border-0 shadow-sm bg-light"
                  style={{ height: '3.5rem' }}
                  disabled={guestMode}
                />
                <label htmlFor="cbs2Input">CBS 2 Numarası</label>
              </Form.Floating>
            </Col>
          </Row>
        );
      case 'status':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="statusSelect"
              value={status}
              disabled={guestMode}
              onChange={e => {
                const val = e.target.value;
                if (!editMode && val === 'misafir') {
                  router.push('/institutions/guest-add');
                  return;
                }
                setStatus(val);
                setRelatedInstitutionId('');
                setHasGuestInstitution(false);
              }}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              <option value="ev_sahibi">Ev Sahibi</option>
              <option value="misafir">Misafir</option>
            </Form.Select>
            <label htmlFor="statusSelect">Kurum Durumu</label>
          </Form.Floating>
        );
      case 'related_institution':
        // ... (Logic remains same, just styling update)
        let content = null;
        if (status === 'ev_sahibi') {
          if (hasGuestInstitution) {
            content = (
              <Form.Select
                value={relatedInstitutionId || 'add_later'}
                onChange={e => setRelatedInstitutionId(e.target.value === 'add_later' ? '' : e.target.value)}
                className="form-select border-0 shadow-sm bg-light"
                style={{ height: '3.5rem' }}
                disabled={!districtId}
              >
                <option value="add_later">Misafir kurumu sonra seç</option>
                <option value=""></option>
                {districtId && institutions
                  .filter(i => (String(i.district_id) === String(districtId) || Number(i.district_id) === Number(districtId)) && i.status === 'misafir')
                  .map(i => (
                    <option key={i.id} value={i.id}>{i.code ? `${i.code} - ${i.name}` : i.name}</option>
                  ))}
              </Form.Select>
            );
          } else {
            content = (
              <Form.Select value={relatedInstitutionId} className="form-select border-0 shadow-sm bg-light" style={{ height: '3.5rem' }} disabled>
                <option value=""></option>
              </Form.Select>
            );
          }
        } else if (status === 'misafir' || guestMode) {
          content = (
            <Form.Select
              value={relatedInstitutionId || 'add_later'}
              onChange={e => setRelatedInstitutionId(e.target.value === 'add_later' ? '' : e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
              disabled={!districtId}
            >
              <option value=""></option>
              {districtId && institutions
                .filter(i => (String(i.district_id) === String(districtId) || Number(i.district_id) === Number(districtId)) && i.status === 'ev_sahibi')
                .map(i => (
                  <option key={i.id} value={i.id}>{i.code ? `${i.code} - ${i.name}` : i.name}</option>
                ))}
            </Form.Select>
          );
        }

        if (!content) return null;

        return (
          <Form.Floating className="mb-3">
            {content}
            <label>İlişkili Kurum</label>
          </Form.Floating>
        );

      case 'infrastructure_owner':
        const shouldLockInfraOwner = status === 'ev_sahibi' && !hasGuestInstitution;
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="infraOwnerSelect"
              value={infraOwner}
              onChange={e => setInfraOwner(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
              disabled={shouldLockInfraOwner || (status === 'ev_sahibi' && hasInfrastructure === 'yok')}
            >
              <option value="ev_sahibi">Ev Sahibi Kurum</option>
              <option value="misafir">Misafir Kurum</option>
            </Form.Select>
            <label htmlFor="infraOwnerSelect">Altyapı Hangi Kuruma Ait?</label>
          </Form.Floating>
        );
      case 'is_fatih':
        return (
          <div className="d-flex align-items-center p-3 bg-light rounded shadow-sm mb-3 border-0">
            <span className="fw-bold me-3">Altyapı Fatih Projesi Kapsamında mı?</span>
            <Form.Check
              type="switch"
              id="isFatihSwitch"
              label={isFatih ? 'Evet' : 'Hayır'}
              checked={!!isFatih}
              onChange={() => setIsFatih(!isFatih)}
              disabled={hasInfrastructure === 'yok'}
              className="fs-5"
            />
          </div>
        );
      case 'faz':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="fazSelect"
              value={editMode ? (initialValues.faz || '') : faz}
              onChange={e => setFaz(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
              disabled={hasInfrastructure === 'yok'}
            >
              <option value=""></option>
              <option value="Faz 1">Faz 1</option>
              <option value="Faz 2">Faz 2</option>
              <option value="Faz 1250">Faz 1250</option>
              <option value="Faz 4">Faz 4</option>
              <option value="Uyumlaştırma">Uyumlaştırma</option>
            </Form.Select>
            <label htmlFor="fazSelect">Faz Seç</label>
          </Form.Floating>
        );
      case 'infrastructure':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="infraSelect"
              value={altyapi}
              onChange={e => setAltyapi(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
              disabled={hasInfrastructure === 'yok' || isFatih}
            >
              <option value=""></option>
              <option value="kendi">Kendi İmkanları</option>
              <option value="siva_alti">Sıva Altı</option>
            </Form.Select>
            <label htmlFor="infraSelect">Altyapı Seç</label>
          </Form.Floating>
        );
      case 'internet_type':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="internetSelect"
              value={internetType}
              onChange={e => setInternetType(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              <option>ADSL</option>
              <option>Fatih VPN</option>
              <option>MEB ADSL</option>
              <option>GSM</option>
              <option>Ev Sahibi Kurum</option>
              <option>Misafir Kurum</option>
            </Form.Select>
            <label htmlFor="internetSelect">İnternet Tipi</label>
          </Form.Floating>
        );
      case 'board_owner':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="boardOwnerSelect"
              value={boardOwner}
              onChange={e => setBoardOwner(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              <option value="ev_sahibi">Ev Sahibi Kurum</option>
              <option value="misafir">Misafir Kurum</option>
            </Form.Select>
            <label htmlFor="boardOwnerSelect">Tahtalar Hangi Kuruma Ait?</label>
          </Form.Floating>
        );
      case 'vestel_black':
      case 'vestel_gray':
      case 'arcelik':
      case 'aidata':
        const labels = {
          vestel_black: 'Vestel Siyah',
          vestel_gray: 'Vestel Gri',
          arcelik: 'Arçelik',
          aidata: 'Aidata'
        };
        const values = {
          vestel_black: vestelBlack,
          vestel_gray: vestelGrey,
          arcelik: arcelik,
          aidata: aidata
        };
        const setters = {
          vestel_black: setVestelBlack,
          vestel_gray: setVestelGrey,
          arcelik: setArcelik,
          aidata: setAidata
        };
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id={`${field.name}Input`}
              type="number"
              min="0"
              value={values[field.name]}
              onChange={e => setters[field.name](parseInt(e.target.value) || 0)}
              className="border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
              placeholder=" "
            />
            <label htmlFor={`${field.name}Input`}>{labels[field.name]}</label>
          </Form.Floating>
        );
      case 'total_boards':
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id="totalBoardsInput"
              type="number"
              value={totalBoards}
              readOnly
              className="border-0 shadow-sm bg-white fw-bold text-primary"
              style={{ height: '3.5rem' }}
              placeholder=" "
            />
            <label htmlFor="totalBoardsInput">Toplam Tahta</label>
          </Form.Floating>
        );
      case 'contact_name':
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id="contactNameInput"
              type="text"
              placeholder=" "
              value={director}
              onChange={e => setDirector(e.target.value)}
              className="border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            />
            <label htmlFor="contactNameInput">Yetkili Ad Soyad</label>
          </Form.Floating>
        );
      case 'contact_phone':
        return (
          <Form.Floating className="mb-3">
            <Form.Control
              id="contactPhoneInput"
              type="text"
              placeholder=" "
              value={directorPhone}
              onChange={e => setDirectorPhone(e.target.value)}
              className="border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            />
            <label htmlFor="contactPhoneInput">Yetkili Telefon</label>
          </Form.Floating>
        );
      case 'has_bt_class':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="hasBtClassSelect"
              value={hasBtClass}
              onChange={e => setHasBtClass(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              <option value="yok">Yok</option>
              <option value="var">Var</option>
            </Form.Select>
            <label htmlFor="hasBtClassSelect">BT Sınıfı Var mı?</label>
          </Form.Floating>
        );
      case 'bt_labs':
        if (hasBtClass !== 'var') return null;
        return (
          <div className="p-3 bg-light rounded shadow-sm border-0">
            {btLabs.map((lab, idx) => (
              <Card key={idx} className="mb-3 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-primary mb-0">Laboratuvar #{idx + 1}</h6>
                    <Button variant="outline-danger" size="sm" onClick={() => removeBtLab(idx)} className="rounded-circle">
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Floating>
                        <Form.Control
                          id={`pcCount${idx}`}
                          type="number"
                          min="0"
                          value={lab.pc_count}
                          onChange={e => updateBtLab(idx, 'pc_count', e.target.value)}
                          className="border-0 bg-light"
                          placeholder=" "
                        />
                        <label htmlFor={`pcCount${idx}`}>PC Sayısı</label>
                      </Form.Floating>
                    </Col>
                    <Col md={6}>
                      <Form.Floating>
                        <Form.Select
                          id={`labStatus${idx}`}
                          value={lab.lab_status}
                          onChange={e => updateBtLab(idx, 'lab_status', e.target.value)}
                          className="form-select border-0 bg-light"
                        >
                          <option value=""></option>
                          <option value="yeni">Yeni</option>
                          <option value="eski">Eski</option>
                        </Form.Select>
                        <label htmlFor={`labStatus${idx}`}>Lab Durumu</label>
                      </Form.Floating>
                    </Col>
                    <Col md={6}>
                      <Form.Floating>
                        <Form.Select
                          id={`labSource${idx}`}
                          value={lab.lab_source}
                          onChange={e => updateBtLab(idx, 'lab_source', e.target.value)}
                          className="form-select border-0 bg-light"
                        >
                          <option value=""></option>
                          <option value="meb">MEB</option>
                          <option value="yenilikci">Yenilikçi Sınıf</option>
                          <option value="kendi">Kendi İmkanları</option>
                          <option value="bagis">Bağış</option>
                        </Form.Select>
                        <label htmlFor={`labSource${idx}`}>Lab Kaynağı</label>
                      </Form.Floating>
                    </Col>
                    <Col md={6}>
                      <Form.Floating>
                        <Form.Select
                          id={`hasBoard${idx}`}
                          value={lab.has_board}
                          onChange={e => updateBtLab(idx, 'has_board', e.target.value)}
                          className="form-select border-0 bg-light"
                        >
                          <option value=""></option>
                          <option value="yok">Yok</option>
                          <option value="var">Var</option>
                        </Form.Select>
                        <label htmlFor={`hasBoard${idx}`}>Tahta Var mı?</label>
                      </Form.Floating>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
            <Button variant="outline-primary" onClick={addBtLab} className="w-100 dashed-border">
              <i className="fas fa-plus me-2"></i>BT Lab Ekle
            </Button>
          </div>
        );
      case 'has_infrastructure':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="hasInfraSelect"
              value={hasInfrastructure}
              onChange={e => setHasInfrastructure(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              <option value="var">Var</option>
              <option value="yok">Yok</option>
            </Form.Select>
            <label htmlFor="hasInfraSelect">Altyapı Var mı?</label>
          </Form.Floating>
        );
      case 'altyapi_planlama':
        return (
          <Form.Floating className="mb-3">
            <Form.Select
              id="altyapiPlanSelect"
              value={altyapiPlanlama}
              onChange={e => setAltyapiPlanlama(e.target.value)}
              className="form-select border-0 shadow-sm bg-light"
              style={{ height: '3.5rem' }}
            >
              <option value=""></option>
              <option value="yok">Yok</option>
              <option value="uyumlastirma_1">Uyumlaştırma 1</option>
              <option value="uyumlastirma_2">Uyumlaştırma 2</option>
              <option value="uyumlastirma_3">Uyumlaştırma 3</option>
              <option value="faz4">Faz 4</option>
            </Form.Select>
            <label htmlFor="altyapiPlanSelect">Altyapı Planlama</label>
          </Form.Floating>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-100" key={initialValues.id || ''}>
      <Card className="border-0 shadow-sm rounded-4 w-100 bg-white">
        <Card.Body className="p-3 p-md-4">
          {editMode && (
            <div className="d-flex align-items-center mb-4 gap-3 border-bottom pb-3">
              <div className="rounded-3 bg-primary-soft d-flex align-items-center justify-content-center shadow-sm" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                <i className="fas fa-edit text-primary"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-dark">Kurum Bilgilerini Düzenle</h5>
                <p className="text-muted small mb-0">Değişiklikleri form üzerinden güncelleyebilirsiniz.</p>
              </div>
            </div>
          )}
          <form onSubmit={handleFormSubmit}>
            {errorMsg && (
              <Alert variant="danger" className="mb-4 shadow-sm border-0 rounded-3">
                <i className="fas fa-exclamation-circle me-2"></i>{errorMsg}
              </Alert>
            )}
            <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
              {/* Mobil Yatay Sekmeler */}
              <Nav variant="pills" className="d-flex d-lg-none flex-nowrap overflow-auto gap-2 pb-2 mb-3 institution-tab-nav">
                {Object.entries(FIELD_GROUPS).map(([key, group]) => (
                  <Nav.Item key={key} className="flex-shrink-0">
                    <Nav.Link eventKey={key} className="py-2 px-3 rounded-pill text-nowrap">
                      {group.title}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>

              <Row className="g-4">
                {/* Desktop Yan Menü Sekmeleri */}
                <Col lg={3} className="d-none d-lg-block">
                  <Nav variant="pills" className="flex-column gap-2 sticky-top institution-tab-nav" style={{ top: '90px' }}>
                    {Object.entries(FIELD_GROUPS).map(([key, group], idx) => (
                      <Nav.Item key={key}>
                        <Nav.Link eventKey={key} className="py-3 px-3 text-start rounded-3 d-flex align-items-center justify-content-between">
                          <span className="d-flex align-items-center gap-2">
                            {group.title}
                          </span>
                          <span className="badge rounded-pill bg-light text-muted small border">{idx + 1}</span>
                        </Nav.Link>
                      </Nav.Item>
                    ))}
                  </Nav>
                </Col>

                {/* Sekme İçerikleri */}
                <Col lg={9}>
                  <Tab.Content>
                    {Object.entries(FIELD_GROUPS).map(([key, group], tabIndex) => (
                      <Tab.Pane key={key} eventKey={key} className="fade-in-up">
                        <div className="form-section-card mb-4">
                          <div className="form-section-header">
                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                              {group.title}
                            </h6>
                            <span className="badge bg-primary-soft text-primary rounded-pill px-3 py-1 small">
                              Adım {tabIndex + 1} / 5
                            </span>
                          </div>
                          <div className="p-4">
                            {key === 'infrastructure' ? (
                              <Row className="g-3">
                                <Col md={12}>{renderField({ name: 'has_infrastructure' })}</Col>
                                <Col md={12}>{renderField({ name: 'infrastructure_owner' })}</Col>
                                <Col md={12}>{renderField({ name: 'is_fatih' })}</Col>
                                <Col md={6}>{renderField({ name: 'faz' })}</Col>
                                <Col md={6}>{renderField({ name: 'infrastructure' })}</Col>
                                <Col md={6}>{renderField({ name: 'altyapi_planlama' })}</Col>
                                <Col md={6}>{renderField({ name: 'internet_type' })}</Col>
                              </Row>
                            ) : (
                              <Row className="g-3">
                                {group.fields.map((field, idx) => (
                                  <Col key={idx} md={field.type === 'cbs1_cbs2_row' || field.type === 'bt_labs' ? 12 : 6}>
                                    {renderField(field)}
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2">
                          <Button
                            variant="light"
                            onClick={handlePrevious}
                            disabled={Object.keys(FIELD_GROUPS).indexOf(key) === 0}
                            className="px-4 py-2 rounded-pill fw-semibold border shadow-sm d-inline-flex align-items-center gap-2"
                          >
                            <i className="fas fa-arrow-left small"></i>
                            <span>Önceki Adım</span>
                          </Button>

                          {Object.keys(FIELD_GROUPS).indexOf(key) === Object.keys(FIELD_GROUPS).length - 1 ? (
                            <Button
                              variant="success"
                              type="submit"
                              disabled={loading}
                              className="px-5 py-2 rounded-pill fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none' }}
                            >
                              {loading ? (
                                <>
                                  <Spinner size="sm" animation="border" className="me-1" />
                                  <span>Kaydediliyor...</span>
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-check-circle"></i>
                                  <span>Kurumu Kaydet</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              onClick={handleNext}
                              className="px-4 py-2 rounded-pill fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
                              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none' }}
                            >
                              <span>Sonraki Adım</span>
                              <i className="fas fa-arrow-right small"></i>
                            </Button>
                          )}
                        </div>
                      </Tab.Pane>
                    ))}
                  </Tab.Content>
                </Col>
              </Row>
            </Tab.Container>
          </form>
        </Card.Body>
      </Card>



      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Kurum Kaydedilecek</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-4">Emin misiniz?</p>
          <div className="d-flex justify-content-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Hayır</Button>
            <Button variant="primary" onClick={handleConfirmedSubmit}>Evet</Button>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Kurum Kaydedildi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-4">Kurum başarıyla kaydedildi.</p>
          <div className="d-flex justify-content-end">
            <Button variant="primary" onClick={() => {
              setShowSuccessModal(false);
              setActiveTab('basic');
              setDistrictId('');
              setCode('');
              setCbs1('');
              setCbs2('');
              setName('');
              setBds('');
              setStatus('');
              setRelatedInstitutionId('');
              setInfraOwner('');
              setIsFatih(false);
              setFaz('');
              setAltyapi('');
              setAltyapiPlan('');
              setInternetType('');
              setBoardOwner('');
              setVestelBlack(0);
              setVestelGrey(0);
              setArcelik(0);
              setAidata(0);
              setDirector('');
              setDirectorPhone('');
              setHasBtClass('');
              setBtLabs([]);
              setHasInfrastructure('');
              setAltyapiPlanlama('');
            }}>Tamam</Button>
          </div>
        </Modal.Body>
      </Modal>



      <Modal show={showDuplicateModal} onHide={() => setShowDuplicateModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title><i className="fas fa-exclamation-triangle me-2"></i>Mükerrer Kayıt</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-4">Girdiğiniz <strong>{code}</strong> kurum koduna sahip bir kurum zaten sistemde kayıtlı. Lütfen farklı bir kurum kodu giriniz.</p>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" onClick={() => setShowDuplicateModal(false)}>Tamam</Button>
          </div>
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .form-input-uniform {
          min-height: 48px !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          box-sizing: border-box;
          font-size: 1rem !important;
          font-family: inherit !important;
        }
        .form-control::placeholder {
          color: #6c757d !important;
          font-size: 1rem !important;
          font-family: inherit !important;
        }
        .form-label {
          margin-bottom: 0.25rem !important;
        }
        .row.gy-4 {
          row-gap: 1.5rem !important;
        }
        .form-group {
          margin-bottom: 0 !important;
        }
        .nav-modern-tabs {
          flex-wrap: wrap !important;
          overflow-x: unset !important;
          white-space: normal !important;
          border-bottom: 2px solid #e3eafc;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .nav-modern-tabs .nav-item {
          flex: 1 1 0%;
        }
        .nav-modern-tabs .nav-link {
          min-width: 80px;
          text-align: center;
          border-radius: 1.5rem 1.5rem 0 0 !important;
          background: #f6faff !important;
          color: #13b6ff !important;
          margin-right: 0.25rem;
          font-size: 1rem;
          font-weight: 600;
          border: none !important;
          transition: background 0.18s, color 0.18s;
          padding: 0.6rem 0.7rem 0.6rem 0.7rem;
        }
        .nav-modern-tabs .nav-link.active, .nav-modern-tabs .nav-link:focus {
          background: #13b6ff !important;
          color: #fff !important;
          box-shadow: 0 4px 16px 0 rgba(21,110,226,0.10);
        }
        .nav-modern-tabs .nav-link:hover:not(.active) {
          background: #e3eafc !important;
          color: #13b6ff !important;
        }
        .tab-modern-link i {
          margin-right: 0.5rem;
        }
        @media (max-width: 900px) {
          .nav-modern-tabs .nav-link {
            min-width: 60px;
            font-size: 0.92rem;
            padding: 0.5rem 0.4rem 0.5rem 0.4rem;
          }
        }
        .card.shadow-lg {
          background: linear-gradient(135deg, #f6faff 0%, #eaf1fb 100%);
          border: none;
        }
        .card .card-body {
          background: #fff;
          border-radius: 1.5rem;
        }
        .form-control-lg, .form-select-lg {
          border-radius: 0.75rem !important;
          border: 1.5px solid #e3eafc !important;
          background: #fafdff !important;
        }
        .form-control-lg:focus, .form-select-lg:focus {
          border-color: #156ee2 !important;
          box-shadow: 0 0 0 2px #156ee233 !important;
        }
      `}</style>
    </div >
  );
}
