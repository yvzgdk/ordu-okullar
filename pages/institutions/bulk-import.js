import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { Container, Card, Row, Col, Form, Button, Table, Badge, Alert, Spinner, Modal, Tab, Nav, ProgressBar } from 'react-bootstrap';
import * as XLSX from 'xlsx';

// ─── STANDART ALAN TANIMLARI VE EŞLEŞTİRME HARİTASI ───
const STANDARD_FIELDS = {
  district: { label: 'İlçe', group: 'basic', required: true, aliases: ['ilçe', 'ilce', 'ilçe adı', 'ilce adi', 'district'] },
  code: { label: 'Kurum Kodu', group: 'basic', required: true, aliases: ['kurum kodu', 'okul kodu', 'meb kodu', 'kurum_kodu', 'code'] },
  name: { label: 'Kurum Adı', group: 'basic', required: true, aliases: ['kurum adı', 'kurum adi', 'okul adı', 'okul adi', 'okul', 'name'] },
  status: { label: 'Kurum Durumu', group: 'basic', required: false, aliases: ['kurum durumu', 'durum', 'status', 'ev sahibi / misafir'] },
  bds: { label: 'Derslik Sayısı (BDS)', group: 'basic', required: false, aliases: ['derslik sayısı', 'derslik sayisi', 'bds', 'derslik'] },
  
  has_infrastructure: { label: 'Altyapı Var mı?', group: 'infrastructure', required: false, aliases: ['altyapı var mı', 'altyapi var mi', 'has_infrastructure', 'altyapı durumu'] },
  is_fatih: { label: 'Fatih Projesi Kapsamı', group: 'infrastructure', required: false, aliases: ['fatih projesi', 'fatih projesinde mi', 'is_fatih', 'fatih'] },
  faz: { label: 'Faz', group: 'infrastructure', required: false, aliases: ['faz', 'proje fazı', 'faz bilgisi', 'phase'] },
  altyapi: { label: 'Altyapı Tipi', group: 'infrastructure', required: false, aliases: ['altyapı tipi', 'altyapi tipi', 'altyapı', 'altyapi', 'altyapı seç'] },
  internet_type: { label: 'İnternet Tipi', group: 'infrastructure', required: false, aliases: ['internet tipi', 'internet', 'bağlantı tipi', 'internet_type'] },
  infra_owner: { label: 'Altyapı Sahibi', group: 'infrastructure', required: false, aliases: ['altyapı sahibi', 'altyapi sahibi', 'infra_owner'] },
  
  vestel_black_boards: { label: 'Vestel Siyah Tahta', group: 'equipment', required: false, aliases: ['vestel siyah', 'vestel siyah tahta', 'vestel_black', 'faz 1 tahta'] },
  vestel_grey_boards: { label: 'Vestel Gri Tahta', group: 'equipment', required: false, aliases: ['vestel gri', 'vestel gri tahta', 'vestel_grey', 'faz 2 tahta'] },
  arcelik_boards: { label: 'Arçelik Tahta', group: 'equipment', required: false, aliases: ['arçelik', 'arcelik', 'arçelik tahta', 'arcelik tahta', 'faz 3 arçelik'] },
  aidata_boards: { label: 'Aidata Tahta', group: 'equipment', required: false, aliases: ['aidata', 'aidata tahta', 'faz 3 aidata'] },
  board_owner: { label: 'Tahta Sahibi', group: 'equipment', required: false, aliases: ['tahta sahibi', 'tahtalar kime ait', 'board_owner'] },
  
  director: { label: 'Müdür Adı Soyadı', group: 'management', required: false, aliases: ['müdür', 'mudur', 'müdür adı soyadı', 'okul müdürü', 'director'] },
  director_phone: { label: 'Müdür Telefonu', group: 'management', required: false, aliases: ['müdür telefon', 'mudur telefon', 'telefon', 'iletişim', 'director_phone', 'phone'] },
  has_bt_class: { label: 'BT Sınıfı Var mı?', group: 'management', required: false, aliases: ['bt sınıfı', 'bt sinifi', 'bilişim sınıfı', 'has_bt_class'] },
  cbs1: { label: 'CBS 1 (Enlem)', group: 'management', required: false, aliases: ['cbs1', 'cbs 1', 'enlem', 'latitude'] },
  cbs2: { label: 'CBS 2 (Boylam)', group: 'management', required: false, aliases: ['cbs2', 'cbs 2', 'boylam', 'longitude'] }
};

const FIELD_GROUPS = {
  basic: { title: 'Temel Bilgiler', icon: 'fas fa-school' },
  infrastructure: { title: 'Ağ & Altyapı', icon: 'fas fa-network-wired' },
  equipment: { title: 'Etkileşimli Tahta', icon: 'fas fa-chalkboard' },
  management: { title: 'Yönetim & İletişim', icon: 'fas fa-user-tie' }
};

// Ordu İlçeleri Eşleştirme Haritası
const DISTRICT_MAP = {
  'akkuş': 1, 'akkus': 1,
  'altınordu': 2, 'altinordu': 2,
  'aybastı': 3, 'aybasti': 3,
  'çamaş': 4, 'camas': 4,
  'çatalpınar': 5, 'catalpinar': 5,
  'çaybaşı': 6, 'caybasi': 6,
  'fatsa': 7,
  'gölköy': 8, 'golkoy': 8,
  'gülyalı': 9, 'gulyali': 9,
  'gürgentepe': 10, 'gurgentepe': 10,
  'ikizce': 11, 'ikizce': 11,
  'kabadüz': 12, 'kabaduz': 12,
  'kabataş': 13, 'kabatas': 13,
  'korgan': 14,
  'kumru': 15,
  'mesudiye': 16,
  'perşembe': 17, 'persembe': 17,
  'ulubey': 18,
  'ünye': 19, 'unye': 19
};

const DISTRICT_NAMES_BY_ID = {
  1: 'Akkuş', 2: 'Altınordu', 3: 'Aybastı', 4: 'Çamaş', 5: 'Çatalpınar',
  6: 'Çaybaşı', 7: 'Fatsa', 8: 'Gölköy', 9: 'Gülyalı', 10: 'Gürgentepe',
  11: 'İkizce', 12: 'Kabadüz', 13: 'Kabataş', 14: 'Korgan', 15: 'Kumru',
  16: 'Mesudiye', 17: 'Perşembe', 18: 'Ulubey', 19: 'Ünye'
};

export default function BulkImportPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // ─── Dosya ve Veri State'leri ───
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [excelColumns, setExcelColumns] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  // ─── Süreç State'leri ───
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewFilter, setPreviewFilter] = useState('');
  const [importMode, setImportMode] = useState('upsert'); // 'upsert' (varsa güncelle) veya 'insert_only' (atla)

  // ─── Modal / Pop-Up State'leri ───
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Türkçe Karakter Normalleştirici
  const normalizeStr = (str) => {
    if (!str) return '';
    return String(str)
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  };

  // ─── 1. ÖRNEK EXCEL ŞABLONUNU İNDİRME FONKSİYONU ───
  const handleDownloadTemplate = () => {
    // 1. Örnek Veri Satırları (Ordu'dan örnek kurumlar ile)
    const sampleRows = [
      {
        'İlçe': 'Altınordu',
        'Kurum Kodu': '754120',
        'Kurum Adı': 'Altınordu Atatürk Ortaokulu',
        'Kurum Durumu': 'Ev Sahibi',
        'Derslik Sayısı': 24,
        'Müdür Adı Soyadı': 'Ahmet Yılmaz',
        'Müdür Telefonu': '05051234567',
        'Altyapı Var mı?': 'Evet',
        'Fatih Projesi Kapsamı': 'Evet',
        'Faz': 'Faz 2',
        'Altyapı Tipi': 'Yerel Ağ',
        'İnternet Tipi': 'Fiber (MEB)',
        'Vestel Siyah Tahta': 0,
        'Vestel Gri Tahta': 24,
        'Arçelik Tahta': 0,
        'Aidata Tahta': 0,
        'BT Sınıfı Var mı?': 'Evet',
        'CBS 1 (Enlem)': '40.9856',
        'CBS 2 (Boylam)': '37.8765'
      },
      {
        'İlçe': 'Fatsa',
        'Kurum Kodu': '754230',
        'Kurum Adı': 'Fatsa Cahit Zarifoğlu Anadolu Lisesi',
        'Kurum Durumu': 'Ev Sahibi',
        'Derslik Sayısı': 32,
        'Müdür Adı Soyadı': 'Mehmet Demir',
        'Müdür Telefonu': '05329876543',
        'Altyapı Var mı?': 'Evet',
        'Fatih Projesi Kapsamı': 'Evet',
        'Faz': 'Faz 3',
        'Altyapı Tipi': 'Kablolu',
        'İnternet Tipi': 'Fiber (MEB)',
        'Vestel Siyah Tahta': 0,
        'Vestel Gri Tahta': 0,
        'Arçelik Tahta': 32,
        'Aidata Tahta': 0,
        'BT Sınıfı Var mı?': 'Hayır',
        'CBS 1 (Enlem)': '41.0267',
        'CBS 2 (Boylam)': '37.5012'
      },
      {
        'İlçe': 'Ünye',
        'Kurum Kodu': '754340',
        'Kurum Adı': 'Ünye Mehmet Akif Ersoy İlkokulu',
        'Kurum Durumu': 'Ev Sahibi',
        'Derslik Sayısı': 18,
        'Müdür Adı Soyadı': 'Mustafa Kaya',
        'Müdür Telefonu': '05445556677',
        'Altyapı Var mı?': 'Hayır',
        'Fatih Projesi Kapsamı': 'Hayır',
        'Faz': 'Kapsam Dışı',
        'Altyapı Tipi': 'Yok',
        'İnternet Tipi': 'ADSL/VDSL',
        'Vestel Siyah Tahta': 0,
        'Vestel Gri Tahta': 0,
        'Arçelik Tahta': 0,
        'Aidata Tahta': 0,
        'BT Sınıfı Var mı?': 'Hayır',
        'CBS 1 (Enlem)': '41.1278',
        'CBS 2 (Boylam)': '37.2845'
      }
    ];

    // 2. Kılavuz ve İpuçları Sayfası
    const guideRows = [
      { 'Sütun Başlığı': 'İlçe', 'Zorunlu': 'Evet', 'Açıklama ve Kabul Edilen Değerler': 'Ordu ili 19 ilçesinden biri (Örn: Altınordu, Fatsa, Ünye, Akkuş, Kumru...)' },
      { 'Sütun Başlığı': 'Kurum Kodu', 'Zorunlu': 'Evet', 'Açıklama ve Kabul Edilen Değerler': 'MEB Kurum Kodu (6 haneli sayı veya metin, benzersiz olmalıdır)' },
      { 'Sütun Başlığı': 'Kurum Adı', 'Zorunlu': 'Evet', 'Açıklama ve Kabul Edilen Değerler': 'Kurumun tam resmi adı' },
      { 'Sütun Başlığı': 'Kurum Durumu', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Ev Sahibi veya Misafir (Boş ise varsayılan: Ev Sahibi)' },
      { 'Sütun Başlığı': 'Derslik Sayısı', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Sayısal derslik sayısı (BDS)' },
      { 'Sütun Başlığı': 'Müdür Adı Soyadı', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Okul müdürü veya kurum yetkilisinin adı soyadı' },
      { 'Sütun Başlığı': 'Müdür Telefonu', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'İletişim telefon numarası (05XX XXX XX XX)' },
      { 'Sütun Başlığı': 'Altyapı Var mı?', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Evet veya Hayır' },
      { 'Sütun Başlığı': 'Fatih Projesi Kapsamı', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Evet veya Hayır' },
      { 'Sütun Başlığı': 'Faz', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Faz Yok, Faz 1, Faz 2, Faz 1250, Faz 4 veya Uyumlaştırma' },
      { 'Sütun Başlığı': 'Altyapı Tipi', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Yerel Ağ, Kablolu, Kablosuz veya Yok' },
      { 'Sütun Başlığı': 'İnternet Tipi', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Fiber (MEB), ADSL/VDSL, LTE (GSM), Uydu veya Yok' },
      { 'Sütun Başlığı': 'Vestel Siyah Tahta', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Adet (Sayısal, boş ise 0)' },
      { 'Sütun Başlığı': 'Vestel Gri Tahta', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Adet (Sayısal, boş ise 0)' },
      { 'Sütun Başlığı': 'Arçelik Tahta', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Adet (Sayısal, boş ise 0)' },
      { 'Sütun Başlığı': 'Aidata Tahta', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Adet (Sayısal, boş ise 0)' },
      { 'Sütun Başlığı': 'BT Sınıfı Var mı?', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Evet veya Hayır' },
      { 'Sütun Başlığı': 'CBS 1 (Enlem)', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Coğrafi Enlem Koordinatı' },
      { 'Sütun Başlığı': 'CBS 2 (Boylam)', 'Zorunlu': 'Hayır', 'Açıklama ve Kabul Edilen Değerler': 'Coğrafi Boylam Koordinatı' }
    ];

    const wb = XLSX.utils.book_new();

    const wsSample = XLSX.utils.json_to_sheet(sampleRows);
    wsSample['!cols'] = [
      { wch: 15 }, { wch: 14 }, { wch: 38 }, { wch: 15 },
      { wch: 15 }, { wch: 22 }, { wch: 16 }, { wch: 16 },
      { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }
    ];

    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 65 }];

    XLSX.utils.book_append_sheet(wb, wsSample, 'Kurum_Listesi');
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Kullanim_Kilavuzu');

    XLSX.writeFile(wb, 'Ordu_OFP_Toplu_Kurum_Sablonu.xlsx');
  };

  // ─── 2. EXCEL DOSYASI YÜKLEME VE OKUMA ───
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setFileSize((uploadedFile.size / 1024).toFixed(1) + ' KB');
    setValidationErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // İlk sayfayı al
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          setValidationErrors(['Yüklenen Excel dosyasında veri satırı bulunamadı. Lütfen içeriği kontrol ediniz.']);
          setShowErrorModal(true);
          return;
        }

        const cols = Object.keys(jsonData[0] || {});
        setExcelColumns(cols);
        setParsedRows(jsonData);

        // Akıllı Otomatik Eşleştirme Yap
        const autoMapping = {};
        Object.entries(STANDARD_FIELDS).forEach(([fieldKey, fieldDef]) => {
          const matchedCol = cols.find(col => {
            const normalizedCol = normalizeStr(col);
            if (normalizedCol === normalizeStr(fieldDef.label)) return true;
            if (normalizedCol === normalizeStr(fieldKey)) return true;
            return fieldDef.aliases.some(alias => normalizedCol === normalizeStr(alias));
          });
          if (matchedCol) {
            autoMapping[fieldKey] = matchedCol;
          }
        });

        setColumnMapping(autoMapping);
      } catch (err) {
        setValidationErrors(['Excel dosyası okunurken hata oluştu: ' + err.message]);
        setShowErrorModal(true);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // Eşleştirme değiştirme
  const handleMappingChange = (fieldKey, selectedExcelCol) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: selectedExcelCol
    }));
  };

  // ─── 3. FORM DOĞRULAMA VE ONAY POP-UP'I BAŞLATMA ───
  const handleInitiateImport = () => {
    const errors = [];

    if (!file || parsedRows.length === 0) {
      errors.push('Lütfen önce geçerli bir Excel dosyası yükleyiniz.');
    }

    // Zorunlu sütunlar eşleşmiş mi?
    if (!columnMapping.name) {
      errors.push('Zorunlu sütun eşleşmesi eksik: "Kurum Adı" sütunu belirlenmelidir.');
    }
    if (!columnMapping.code) {
      errors.push('Zorunlu sütun eşleşmesi eksik: "Kurum Kodu" sütunu belirlenmelidir.');
    }
    if (!columnMapping.district) {
      errors.push('Zorunlu sütun eşleşmesi eksik: "İlçe" sütunu belirlenmelidir.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorModal(true);
      return;
    }

    setShowConfirmModal(true);
  };

  // Boolean değer dönüştürücü
  const parseBoolean = (val) => {
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'boolean') return val;
    const str = String(val).trim().toLowerCase();
    return ['evet', 'true', '1', 'var', 'yes'].includes(str);
  };

  // ─── 4. VERİTABANINA AKTARMA (SUPABASE BATCH INSERT/UPSERT) ───
  const handleExecuteImport = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setProgress(0);

    let successCount = 0;
    let updateCount = 0;
    let failedCount = 0;
    const errorDetails = [];

    try {
      // Mevcut kurum kodlarını hızlı kontrol için çek
      const { data: existingInstitutions } = await supabase
        .from('kurum_kayit')
        .select('id, code');
      
      const existingCodeMap = new Map();
      if (existingInstitutions) {
        existingInstitutions.forEach(inst => {
          if (inst.code) existingCodeMap.set(String(inst.code).trim(), inst.id);
        });
      }

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const rowNum = i + 2; // Excel satır no (başlık 1. satır)

        try {
          // 1. Kurum Adı ve Kodu
          const rawName = row[columnMapping.name];
          const rawCode = row[columnMapping.code];
          
          if (!rawName || !rawCode) {
            failedCount++;
            errorDetails.push(`Satır ${rowNum}: Kurum adı veya kodu boş olduğundan atlandı.`);
            continue;
          }

          const name = String(rawName).trim();
          const code = String(rawCode).trim();

          // 2. İlçe Tespiti
          let districtId = null;
          const rawDistrict = row[columnMapping.district];
          if (rawDistrict) {
            const normalizedDistrict = normalizeStr(rawDistrict);
            if (DISTRICT_MAP[normalizedDistrict]) {
              districtId = DISTRICT_MAP[normalizedDistrict];
            } else if (!isNaN(Number(rawDistrict)) && Number(rawDistrict) >= 1 && Number(rawDistrict) <= 19) {
              districtId = Number(rawDistrict);
            }
          }

          // 3. Durum (ev_sahibi / misafir)
          let status = 'ev_sahibi';
          if (columnMapping.status && row[columnMapping.status]) {
            const rawStatus = normalizeStr(row[columnMapping.status]);
            if (rawStatus.includes('misafir')) status = 'misafir';
          }

          // 4. Tahta Sayıları
          const vb = parseInt(row[columnMapping.vestel_black_boards]) || 0;
          const vg = parseInt(row[columnMapping.vestel_grey_boards]) || 0;
          const ab = parseInt(row[columnMapping.arcelik_boards]) || 0;
          const ad = parseInt(row[columnMapping.aidata_boards]) || 0;
          const totalBoards = vb + vg + ab + ad;

          // 5. Paylaşım Nesnesi
          const payload = {
            name,
            code,
            district_id: districtId,
            status,
            bds: parseInt(row[columnMapping.bds]) || null,
            director: row[columnMapping.director] ? String(row[columnMapping.director]).trim() : null,
            director_phone: row[columnMapping.director_phone] ? String(row[columnMapping.director_phone]).trim() : null,
            has_infrastructure: parseBoolean(row[columnMapping.has_infrastructure]),
            is_fatih: parseBoolean(row[columnMapping.is_fatih]),
            faz: row[columnMapping.faz] ? String(row[columnMapping.faz]).trim() : null,
            altyapi: row[columnMapping.altyapi] ? String(row[columnMapping.altyapi]).trim() : null,
            internet_type: row[columnMapping.internet_type] ? String(row[columnMapping.internet_type]).trim() : null,
            infra_owner: row[columnMapping.infra_owner] ? String(row[columnMapping.infra_owner]).trim() : null,
            vestel_black_boards: vb,
            vestel_grey_boards: vg,
            arcelik_boards: ab,
            aidata_boards: ad,
            total_boards: totalBoards,
            board_owner: row[columnMapping.board_owner] ? String(row[columnMapping.board_owner]).trim() : null,
            has_bt_class: parseBoolean(row[columnMapping.has_bt_class]),
            cbs1: row[columnMapping.cbs1] ? String(row[columnMapping.cbs1]).trim() : null,
            cbs2: row[columnMapping.cbs2] ? String(row[columnMapping.cbs2]).trim() : null
          };

          const existingId = existingCodeMap.get(code);

          if (existingId) {
            // Zaten mevcut bir kurum var
            if (importMode === 'upsert') {
              const { error: updErr } = await supabase
                .from('kurum_kayit')
                .update(payload)
                .eq('id', existingId);

              if (updErr) throw updErr;
              updateCount++;
            } else {
              // Atla
              continue;
            }
          } else {
            // Yeni Kurum Ekle
            const { error: insErr } = await supabase
              .from('kurum_kayit')
              .insert([payload]);

            if (insErr) throw insErr;
            successCount++;
            existingCodeMap.set(code, true);
          }
        } catch (rowErr) {
          failedCount++;
          errorDetails.push(`Satır ${rowNum} (${row[columnMapping.name] || 'Bilinmeyen'}): ${rowErr.message}`);
        }

        setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
      }

      setImportResults({
        total: parsedRows.length,
        successCount,
        updateCount,
        failedCount,
        errors: errorDetails
      });

      setShowSuccessModal(true);
    } catch (globalErr) {
      setValidationErrors(['Aktarım sırasında genel bir sistem hatası oluştu: ' + globalErr.message]);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Önizleme satırlarını filtrele
  const filteredPreviewRows = useMemo(() => {
    if (!previewFilter.trim()) return parsedRows;
    const q = previewFilter.trim().toLowerCase();
    return parsedRows.filter(row => {
      const name = String(row[columnMapping.name] || '').toLowerCase();
      const code = String(row[columnMapping.code] || '').toLowerCase();
      const dist = String(row[columnMapping.district] || '').toLowerCase();
      return name.includes(q) || code.includes(q) || dist.includes(q);
    });
  }, [parsedRows, previewFilter, columnMapping]);

  // Eşleşen sütun sayısı
  const matchedFieldCount = useMemo(() => {
    return Object.keys(columnMapping).filter(k => !!columnMapping[k]).length;
  }, [columnMapping]);

  return (
    <Container fluid className="px-0">
      {/* ─── Modern Sayfa Başlığı ─── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span
            className="rounded-3 bg-success-soft d-flex align-items-center justify-content-center shadow-sm"
            style={{ width: 48, height: 48, fontSize: '1.3rem' }}
          >
            <i className="fas fa-file-excel text-success"></i>
          </span>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="fw-bold mb-0 text-dark">Excel Toplu Kurum İçe Aktarma</h4>
              <Badge bg="success" className="fw-semibold px-2 py-1">Toplu Kayıt</Badge>
            </div>
            <span className="text-muted small">
              Excel (.xlsx) dosyasındaki okul, derslik, altyapı ve etkileşimli tahta verilerini tek seferde sisteme aktarın
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Örnek Şablonu İndir Butonu */}
          <Button
            variant="success"
            size="sm"
            onClick={handleDownloadTemplate}
            className="rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-2 fw-semibold"
          >
            <i className="fas fa-file-arrow-down"></i>
            <span>Örnek Excel Şablonunu İndir (.xlsx)</span>
          </Button>

          <Link
            href="/kurumlar"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2 shadow-sm"
          >
            <i className="fas fa-school"></i>
            <span>Kurum Listesi</span>
          </Link>
          <Link
            href="/kurum-ekle"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2 shadow-sm"
          >
            <i className="fas fa-plus"></i>
            <span>Tekil Kurum Ekle</span>
          </Link>
        </div>
      </div>

      {/* ─── ADIM BİLGİLENDİRME KARTLARI ─── */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <div className="modern-kpi-card h-100 border-start border-4 border-success">
            <div className="kpi-top">
              <span className="kpi-label">1. Adım</span>
              <div className="kpi-icon-box bg-success-soft">
                <i className="fas fa-download text-success"></i>
              </div>
            </div>
            <div className="fw-bold text-dark mt-2" style={{ fontSize: '1.05rem' }}>Örnek Şablonu İndirin</div>
            <div className="kpi-footer text-muted">
              Yukarıdaki yeşil butona tıklayarak standart sütun başlıklı Excel dosyasını indirin.
            </div>
          </div>
        </Col>

        <Col xs={12} md={4}>
          <div className="modern-kpi-card h-100 border-start border-4 border-primary">
            <div className="kpi-top">
              <span className="kpi-label">2. Adım</span>
              <div className="kpi-icon-box bg-primary-soft">
                <i className="fas fa-pen-to-square text-primary"></i>
              </div>
            </div>
            <div className="fw-bold text-dark mt-2" style={{ fontSize: '1.05rem' }}>Okul Bilgilerini Doldurun</div>
            <div className="kpi-footer text-muted">
              İlçe, Kurum Kodu, Kurum Adı ve varsa tahta sayılarını şablona işleyip kaydedin.
            </div>
          </div>
        </Col>

        <Col xs={12} md={4}>
          <div className="modern-kpi-card h-100 border-start border-4 border-warning">
            <div className="kpi-top">
              <span className="kpi-label">3. Adım</span>
              <div className="kpi-icon-box bg-warning-soft">
                <i className="fas fa-cloud-arrow-up text-warning"></i>
              </div>
            </div>
            <div className="fw-bold text-dark mt-2" style={{ fontSize: '1.05rem' }}>Yükleyin & Onaylayın</div>
            <div className="kpi-footer text-muted">
              Dosyanızı seçip önizleyin, ardından tek tıkla veritabanına aktarın.
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── DOSYA YÜKLEME KARTI (DROPZONE) ─── */}
      <Card className="modern-card mb-4 border-0 shadow-sm">
        <Card.Body className="p-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-5 text-center rounded-4 border-2 border-dashed bg-light transition-all"
            style={{
              cursor: 'pointer',
              borderStyle: 'dashed',
              borderColor: file ? '#198754' : '#ced4da',
              backgroundColor: file ? '#f8fdfa' : '#fcfcfd'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="d-none"
            />

            <div className="mb-3">
              <span
                className={`rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm ${
                  file ? 'bg-success text-white' : 'bg-success-soft text-success'
                }`}
                style={{ width: 64, height: 64, fontSize: '1.8rem' }}
              >
                <i className={`fas fa-${file ? 'check' : 'cloud-arrow-up'}`}></i>
              </span>
            </div>

            {file ? (
              <div>
                <h5 className="fw-bold text-success mb-1">{fileName}</h5>
                <p className="text-muted small mb-3">
                  Boyut: {fileSize} &bull; Toplam <strong>{parsedRows.length}</strong> satır kurum verisi okundu
                </p>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <i className="fas fa-sync-alt me-1"></i> Farklı Bir Dosya Seç
                </Button>
              </div>
            ) : (
              <div>
                <h5 className="fw-bold text-dark mb-1">Excel Dosyanızı Buraya Sürükleyin veya Seçin</h5>
                <p className="text-muted small mb-3">
                  Desteklenen formatlar: <strong>.xlsx</strong> veya <strong>.xls</strong>
                </p>
                <Button
                  variant="success"
                  size="sm"
                  className="rounded-pill px-4 shadow-sm fw-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <i className="fas fa-folder-open me-2"></i>Bilgisayardan Dosya Seç
                </Button>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* ─── EĞER DOSYA YÜKLENDİYSE: SÜTUN EŞLEŞTİRME VE ÖNİZLEME ─── */}
      {parsedRows.length > 0 && (
        <>
          {/* SÜTUN EŞLEŞTİRME PANELİ */}
          <Card className="modern-card mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-columns text-primary"></i>
                <h6 className="mb-0 fw-bold text-dark">Sütun Eşleştirme Ayarları</h6>
                <Badge bg="info" className="px-2 py-1 ms-2">
                  {matchedFieldCount} / {Object.keys(STANDARD_FIELDS).length} Alan Eşleşti
                </Badge>
              </div>
              <span className="text-muted small">
                Şablonumuz kullanıldıysa eşleşmeler otomatik yapılmıştır. Gerekirse açılır listeden değiştiriniz.
              </span>
            </Card.Header>

            <Card.Body className="p-4">
              <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Nav variant="pills" className="mb-4 gap-2 border-bottom pb-3">
                  {Object.entries(FIELD_GROUPS).map(([groupKey, groupDef]) => (
                    <Nav.Item key={groupKey}>
                      <Nav.Link
                        eventKey={groupKey}
                        className="rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                      >
                        <i className={groupDef.icon}></i>
                        <span>{groupDef.title}</span>
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>

                <Tab.Content>
                  {Object.entries(FIELD_GROUPS).map(([groupKey]) => {
                    const fieldsInGroup = Object.entries(STANDARD_FIELDS).filter(
                      ([, def]) => def.group === groupKey
                    );

                    return (
                      <Tab.Pane key={groupKey} eventKey={groupKey}>
                        <Row className="g-3">
                          {fieldsInGroup.map(([fieldKey, fieldDef]) => {
                            const isMatched = !!columnMapping[fieldKey];

                            return (
                              <Col md={6} lg={4} key={fieldKey}>
                                <div className={`p-3 rounded-3 border h-100 ${isMatched ? 'bg-light' : 'bg-white'}`}>
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <Form.Label className="mb-0 small fw-bold text-dark">
                                      {fieldDef.label} {fieldDef.required && <span className="text-danger">*</span>}
                                    </Form.Label>
                                    {isMatched ? (
                                      <Badge bg="success-soft" className="text-success" style={{ fontSize: '0.7rem' }}>
                                        <i className="fas fa-check me-1"></i>Eşleşti
                                      </Badge>
                                    ) : fieldDef.required ? (
                                      <Badge bg="danger-soft" className="text-danger" style={{ fontSize: '0.7rem' }}>
                                        Zorunlu
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <Form.Select
                                    size="sm"
                                    value={columnMapping[fieldKey] || ''}
                                    onChange={(e) => handleMappingChange(fieldKey, e.target.value)}
                                    className={`form-select-sm ${fieldDef.required && !isMatched ? 'border-danger' : ''}`}
                                  >
                                    <option value="">-- Eşleştirilmedi --</option>
                                    {excelColumns.map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </div>
                              </Col>
                            );
                          })}
                        </Row>
                      </Tab.Pane>
                    );
                  })}
                </Tab.Content>
              </Tab.Container>
            </Card.Body>
          </Card>

          {/* ÖNİZLEME TABLOSU */}
          <Card className="modern-card mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-eye text-success"></i>
                <h6 className="mb-0 fw-bold text-dark">
                  Veri Önizleme ({parsedRows.length} Kurum)
                </h6>
              </div>

              <div className="d-flex align-items-center gap-3">
                <Form.Control
                  size="sm"
                  placeholder="Önizlemede Ara (Ad, Kod, İlçe)..."
                  value={previewFilter}
                  onChange={(e) => setPreviewFilter(e.target.value)}
                  style={{ width: 260 }}
                />
              </div>
            </Card.Header>

            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <Table hover className="align-middle mb-0" size="sm">
                <thead className="bg-light sticky-top shadow-sm text-secondary small text-uppercase fw-semibold">
                  <tr>
                    <th style={{ width: 50 }} className="text-center">#</th>
                    <th>İlçe</th>
                    <th>Kurum Kodu</th>
                    <th>Kurum Adı</th>
                    <th>Durum</th>
                    <th>BDS</th>
                    <th>Altyapı</th>
                    <th>Faz</th>
                    <th>Tahtalar (V.Siyah / V.Gri / Arçelik / Aidata)</th>
                    <th>Toplam</th>
                    <th>Müdür</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewRows.slice(0, 100).map((row, index) => {
                    const vb = parseInt(row[columnMapping.vestel_black_boards]) || 0;
                    const vg = parseInt(row[columnMapping.vestel_grey_boards]) || 0;
                    const ab = parseInt(row[columnMapping.arcelik_boards]) || 0;
                    const ad = parseInt(row[columnMapping.aidata_boards]) || 0;
                    const totalB = vb + vg + ab + ad;

                    return (
                      <tr key={index}>
                        <td className="text-center text-muted small">{index + 1}</td>
                        <td>
                          <span className="badge bg-secondary-soft text-dark px-2">
                            {row[columnMapping.district] || '-'}
                          </span>
                        </td>
                        <td className="fw-bold text-dark">
                          {row[columnMapping.code] || '-'}
                        </td>
                        <td className="fw-semibold text-primary">
                          {row[columnMapping.name] || '-'}
                        </td>
                        <td>
                          <Badge bg={String(row[columnMapping.status] || '').toLowerCase().includes('misafir') ? 'warning' : 'success'}>
                            {row[columnMapping.status] || 'Ev Sahibi'}
                          </Badge>
                        </td>
                        <td>{row[columnMapping.bds] || '-'}</td>
                        <td>{row[columnMapping.altyapi] || (parseBoolean(row[columnMapping.has_infrastructure]) ? 'Var' : 'Yok')}</td>
                        <td>{row[columnMapping.faz] || '-'}</td>
                        <td className="small">
                          {vb} / {vg} / {ab} / {ad}
                        </td>
                        <td className="fw-bold text-dark">{totalB}</td>
                        <td className="small text-muted">{row[columnMapping.director] || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {filteredPreviewRows.length > 100 && (
              <div className="p-2 bg-light text-center text-muted small border-top">
                Önizleme performansı için ilk 100 satır gösterilmektedir. Toplam <strong>{filteredPreviewRows.length}</strong> kayıt aktarılacaktır.
              </div>
            )}
          </Card>

          {/* AKTARIM AYARLARI VE BAŞLATMA KARTI */}
          <Card className="modern-card border-0 shadow-sm p-4 bg-white">
            <Row className="align-items-center g-3">
              <Col md={7}>
                <div className="fw-bold text-dark mb-1">Mevcut Kurum Çakışma Yönetimi:</div>
                <div className="d-flex gap-3">
                  <Form.Check
                    type="radio"
                    id="mode-upsert"
                    name="importMode"
                    label="Aynı kurum kodu varsa bilgileri güncelle (Önerilen)"
                    checked={importMode === 'upsert'}
                    onChange={() => setImportMode('upsert')}
                  />
                  <Form.Check
                    type="radio"
                    id="mode-insert"
                    name="importMode"
                    label="Mevcut kurumları atla (Yalnızca yenileri ekle)"
                    checked={importMode === 'insert_only'}
                    onChange={() => setImportMode('insert_only')}
                  />
                </div>
              </Col>

              <Col md={5} className="text-md-end">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleInitiateImport}
                  disabled={loading}
                  className="rounded-pill px-5 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" animation="border" />
                      <span>Aktarılıyor (%{progress})...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-arrow-up"></i>
                      <span>{parsedRows.length} Kurumu Sisteme Aktar</span>
                    </>
                  )}
                </Button>
              </Col>
            </Row>

            {loading && (
              <div className="mt-3">
                <ProgressBar
                  animated
                  now={progress}
                  label={`${progress}%`}
                  variant="success"
                  style={{ height: '12px' }}
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* ─── MODAL 1: HATA / DOĞRULAMA POP-UP'I ───────────────────── */}
      {/* ============================================================ */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <div className="d-flex align-items-center gap-2 text-danger">
            <span
              className="rounded-circle bg-danger-soft d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="fas fa-triangle-exclamation text-danger"></i>
            </span>
            <Modal.Title className="h6 mb-0 fw-bold text-dark">Eksik / Hatalı Bilgi</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <ul className="mb-0 text-danger ps-3 small fw-semibold">
            {validationErrors.map((err, i) => (
              <li key={i} className="py-1">{err}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowErrorModal(false)}>
            Kapat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* ─── MODAL 2: AKTARIM ONAY POP-UP'I ───────────────────────── */}
      {/* ============================================================ */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <div className="d-flex align-items-center gap-2 text-primary">
            <span
              className="rounded-circle bg-primary-soft d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
            >
              <i className="fas fa-clipboard-check text-primary"></i>
            </span>
            <Modal.Title className="h6 mb-0 fw-bold text-dark">Toplu Aktarımı Onayla</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="text-secondary small mb-3">
            Toplam <strong>{parsedRows.length}</strong> adet kurum veritabanına aktarılacaktır.
          </p>

          <div className="p-3 bg-light rounded-3 small border mb-3">
            <div><strong>Dosya Adı:</strong> {fileName}</div>
            <div><strong>Toplam Satır:</strong> {parsedRows.length}</div>
            <div><strong>Eşleşen Sütun:</strong> {matchedFieldCount} / {Object.keys(STANDARD_FIELDS).length}</div>
            <div>
              <strong>Çakışma Davranışı:</strong>{' '}
              {importMode === 'upsert' ? 'Mevcut kurumlar güncellenecek' : 'Mevcut kurumlar atlanacak'}
            </div>
          </div>

          <div className="alert alert-warning py-2 px-3 small mb-0 rounded-3">
            <i className="fas fa-info-circle me-1"></i>
            Aktarım başladığında lütfen işlem bitene kadar tarayıcı penceresini kapatmayınız.
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="outline-secondary" className="rounded-pill px-3" onClick={() => setShowConfirmModal(false)}>
            Vazgeç
          </Button>
          <Button
            variant="success"
            className="rounded-pill px-4 fw-semibold shadow-sm"
            onClick={handleExecuteImport}
          >
            Evet, Aktarımı Başlat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================ */}
      {/* ─── MODAL 3: AKTARIM BAŞARI / SONUÇ POP-UP'I ─────────────── */}
      {/* ============================================================ */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered backdrop="static">
        <Modal.Body className="text-center py-4 px-4">
          <div
            className="rounded-circle bg-success-soft d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
            style={{ width: 68, height: 68 }}
          >
            <i className="fas fa-circle-check text-success fa-2x"></i>
          </div>
          <h5 className="fw-bold text-dark mb-1">Toplu Aktarım Tamamlandı!</h5>
          <p className="text-muted small mb-3">
            Excel dosyanızdaki kurumlar sisteme başarıyla işlendi.
          </p>

          {importResults && (
            <div className="p-3 bg-light rounded-3 text-start small border mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span>Yeni Eklenen Kurum:</span>
                <strong className="text-success">{importResults.successCount}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Güncellenen Kurum:</span>
                <strong className="text-primary">{importResults.updateCount}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Hatalı / Atlanan Satır:</span>
                <strong className={importResults.failedCount > 0 ? 'text-danger' : 'text-muted'}>
                  {importResults.failedCount}
                </strong>
              </div>

              {importResults.errors?.length > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <div className="text-danger fw-bold mb-1">Hata Detayları:</div>
                  <div style={{ maxHeight: 100, overflowY: 'auto' }} className="text-danger small">
                    {importResults.errors.map((e, idx) => (
                      <div key={idx}>&bull; {e}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="d-flex flex-column gap-2">
            <Link href="/kurumlar" className="btn btn-primary w-100 rounded-pill fw-semibold shadow-sm">
              <i className="fas fa-list me-1"></i> Kurum Detay Listesine Git
            </Link>
            <Button
              variant="outline-secondary"
              className="w-100 rounded-pill fw-semibold"
              onClick={() => {
                setShowSuccessModal(false);
                setFile(null);
                setParsedRows([]);
              }}
            >
              <i className="fas fa-plus me-1"></i> Yeni Bir Dosya Daha Yükle
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
