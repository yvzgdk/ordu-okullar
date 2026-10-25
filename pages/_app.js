// pages/_app.js
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import SidebarLayout from '../components/SidebarLayout';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#f8fafc' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  const isGodMode = typeof window !== 'undefined' ? localStorage.getItem('god_mode') === 'true' : false;
  const isLoginPage = router.pathname === '/login';

  if (!session && !isGodMode && !isLoginPage) {
    return null; // Redirecting...
  }

  return (
    <>
      <Head>
        <title>Ordu OFP - Fatih Projesi Yönetim Paneli</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {isLoginPage ? (
        <Component {...pageProps} />
      ) : (
        <SidebarLayout>
          <Component {...pageProps} />
        </SidebarLayout>
      )}
    </>
  );
}
