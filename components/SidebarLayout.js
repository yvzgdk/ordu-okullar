import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Container, Dropdown, Badge, Button } from 'react-bootstrap';

const MENU_GROUPS = [
  {
    title: 'GENEL BAKIŞ',
    items: [
      { href: '/', legacyHref: '/', label: 'Anasayfa & İstatistik', icon: 'fas fa-chart-line' },
      { href: '/raporlar', legacyHref: '/reports', label: 'Grafiksel Raporlar', icon: 'fas fa-chart-pie' },
    ]
  },
  {
    title: 'KURUM İŞLEMLERİ',
    items: [
      { href: '/kurumlar', legacyHref: '/institutions/detail', label: 'Kurum Detay Listesi', icon: 'fas fa-school' },
      { href: '/kurum-ekle', legacyHref: '/institutions', label: 'Yeni Kurum Ekle', icon: 'fas fa-plus-circle' },
      { href: '/kurumlar/misafir-ekle', legacyHref: '/institutions/guest-add', label: 'Misafir Kurum Ekle', icon: 'fas fa-house-chimney-user' },
      { href: '/kurumlar/duzenle', legacyHref: '/institutions/edit', label: 'Kurum Düzenle & Sil', icon: 'fas fa-sliders' },
      { href: '/kurumlar/toplu-ice-aktar', legacyHref: '/institutions/bulk-import', label: 'Excel Toplu İçe Aktar', icon: 'fas fa-file-excel', badge: 'Excel' },
    ]
  },
  {
    title: 'ETKİLEŞİMLİ TAHTA (ET)',
    items: [
      { href: '/tahtalar/ekle', legacyHref: '/boards/add', label: 'Kat/Sınıf Tahta Ekle', icon: 'fas fa-chalkboard' },
      { href: '/tahtalar/liste', legacyHref: '/boards/details', label: 'Kurum Tahta Listesi', icon: 'fas fa-list-check' },
      { href: '/tahtalar/transfer', legacyHref: '/boards/transfer', label: 'Okullar Arası Transfer', icon: 'fas fa-arrows-split-up-and-left', badge: 'Yeni' },
    ]
  },
  {
    title: 'BTR ÖĞRETMENLERİ',
    items: [
      { href: '/btr-ogretmenleri', legacyHref: '/btr/edit', label: 'BTR Öğretmen Listesi', icon: 'fas fa-user-graduate' },
      { href: '/btr-ekle', legacyHref: '/btr/add', label: 'Yeni BTR Görevlendir', icon: 'fas fa-user-plus' },
    ]
  },
  {
    title: 'SİSTEM & YÖNETİM',
    items: [
      { href: '/ilceler', legacyHref: '/districts', label: 'İlçe Yönetimi (19)', icon: 'fas fa-map-location-dot' },
    ]
  }
];

export default function SidebarLayout({ children }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isGod, setIsGod] = useState(false);

  useEffect(() => {
    setIsGod(localStorage.getItem('god_mode') === 'true');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('god_mode');
    await supabase.auth.signOut();
    router.push('/login');
  };

  const currentPath = router.pathname;
  const currentAsPath = (router.asPath || '').split('?')[0];

  // Aktif sayfa başlığını tespit et
  const activeItem = MENU_GROUPS.flatMap(g => g.items).find(item => {
    return currentAsPath === item.href ||
           currentPath === item.legacyHref ||
           (item.href !== '/' && currentAsPath.startsWith(item.href)) ||
           (item.legacyHref !== '/' && currentPath.startsWith(item.legacyHref));
  });

  return (
    <div className={`layout-wrapper ${collapsed ? 'layout-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Mobil Backdrop */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop d-lg-none" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ============================================================ */}
      {/* 1. SOL YAN MENÜ (SIDEBAR)                                    */}
      {/* ============================================================ */}
      <aside className="modern-sidebar">
        {/* Sidebar Header / Logo */}
        <div className="sidebar-header">
          <Link href="/" className="sidebar-brand">
            <div className="brand-logo-box">
              <i className="fas fa-layer-group"></i>
            </div>
            {!collapsed && (
              <div className="brand-text">
                <span className="brand-title">ORDU OFP</span>
                <span className="brand-subtitle">Fatih Projesi Portalı</span>
              </div>
            )}
          </Link>
          <button 
            type="button" 
            className="sidebar-toggle-btn d-none d-lg-flex" 
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Genişlet' : 'Daralt'}
          >
            <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        {/* Sidebar Menü Listesi */}
        <div className="sidebar-menu-scroll">
          {MENU_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="menu-group">
              {!collapsed && <div className="menu-group-title">{group.title}</div>}
              {group.items.map((item, iIdx) => {
                const isActive = currentAsPath === item.href ||
                                 currentPath === item.legacyHref ||
                                 (item.href !== '/' && currentAsPath.startsWith(item.href)) ||
                                 (item.legacyHref !== '/' && currentPath.startsWith(item.legacyHref));
                return (
                  <Link 
                    key={iIdx} 
                    href={item.href} 
                    className={`menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="menu-item-icon">
                      <i className={item.icon}></i>
                    </div>
                    {!collapsed && (
                      <>
                        <span className="menu-item-text">{item.label}</span>
                        {item.badge && (
                          <span className={`badge-pill ${item.badge === 'Yeni' ? 'badge-pill-success' : 'badge-pill-info'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer (Kullanıcı & Çıkış) */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-avatar">
              <i className={`fas fa-${isGod ? 'user-shield' : 'user'}`}></i>
            </div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">
                  {isGod ? 'Yönetici (God Mode)' : (userEmail ? userEmail.split('@')[0] : 'Kullanıcı')}
                </div>
                <div className="user-role">
                  <span className="status-indicator"></span> Ordu İl MEM
                </div>
              </div>
            )}
            <button 
              onClick={handleLogout} 
              className="logout-btn" 
              title="Güvenli Çıkış"
            >
              <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. ANA İÇERİK ALANI                                          */}
      {/* ============================================================ */}
      <div className="main-content-wrapper">
        {/* Üst Header / Topbar */}
        <header className="modern-topbar">
          <div className="d-flex align-items-center gap-3">
            {/* Mobil Menü Butonu */}
            <button 
              type="button" 
              className="mobile-menu-btn d-lg-none"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <i className="fas fa-bars"></i>
            </button>

            {/* Breadcrumb / Başlık Bilgisi */}
            <div className="topbar-breadcrumb d-none d-md-flex align-items-center gap-2">
              <Link href="/" className="breadcrumb-root text-decoration-none">
                <i className="fas fa-home me-1"></i> Ordu OFP
              </Link>
              {activeItem && activeItem.href !== '/' && (
                <>
                  <i className="fas fa-chevron-right text-muted" style={{ fontSize: '0.7rem' }}></i>
                  <span className="breadcrumb-current text-dark fw-semibold">{activeItem.label}</span>
                </>
              )}
            </div>
          </div>

          {/* Sağ Taraftaki Kullanıcı Menüsü */}
          <div className="d-flex align-items-center gap-2">
            <Dropdown align="end">
              <Dropdown.Toggle as="div" className="user-dropdown-toggle">
                <div className="avatar-mini">
                  <i className="fas fa-user-gear"></i>
                </div>
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow-lg border-0 rounded-3 mt-2">
                <Dropdown.Header className="small text-muted text-uppercase fw-bold">Oturum</Dropdown.Header>
                <Dropdown.Item as={Link} href="/profil">
                  <i className="fas fa-id-badge me-2 text-primary"></i> Profil Bilgileri
                </Dropdown.Item>
                <Dropdown.Item as={Link} href="/ilceler">
                  <i className="fas fa-map-location-dot me-2 text-info"></i> İlçeler
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger fw-semibold">
                  <i className="fas fa-right-from-bracket me-2"></i> Güvenli Çıkış
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        {/* Sayfa Gövdesi */}
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
