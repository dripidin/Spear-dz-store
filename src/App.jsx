import React, { useState, useEffect, useRef } from 'react';
import CupertinoVideoHero from './components/CupertinoVideoHero';
import OrderForm from './components/OrderForm';
import StickyMobileBar from './components/StickyMobileBar';
import ConfirmationModal from './components/ConfirmationModal';

export default function App({ initialBundle }) {
  const [locale, setLocale] = useState('ar'); // Default Arabic or French
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormButtonVisible, setIsFormButtonVisible] = useState(false);
  const formRef = useRef(null);

  // Detect whether current page is Pack 3 (Speaker + Mic), Pack 2, or Pack 1
  const [activeBundle, setActiveBundle] = useState(() => {
    if (initialBundle) return initialBundle;
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const s = window.location.search.toLowerCase();
      const bodyBundle = document.body?.dataset?.bundle;
      if (
        p.includes('pack3') ||
        p.includes('pack-3') ||
        p.includes('speaker') ||
        s.includes('pack=3') ||
        bodyBundle === 'pack3'
      ) {
        return 'pack3';
      }
      if (
        p.includes('pack2') ||
        p.includes('pack-2') ||
        s.includes('pack=2') ||
        bodyBundle === 'pack2'
      ) {
        return 'pack2';
      }
    }
    return 'pack1';
  });

  const isAr = locale === 'ar';

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'fr';
  }, [isAr]);

  const BUNDLES = {
    pack1: {
      id: 'pack_hightech_5in1',
      title: isAr
        ? 'عرض النخبة 5 في 1 الفاخر (PACK HIGH-TECH 5 EN 1)'
        : 'PACK HIGH-TECH 5 EN 1 (Offre Élite)',
      shortName: isAr ? 'باك النخبة 5 في 1' : 'Pack High-Tech 5 en 1',
      headline: isAr ? 'باك جامي يجي في بالك استغل الفرصة !' : 'Pack High-Tech 5 en 1 • Saisissez l\'opportunité !',
      price: 20400,
      priceDisplay: '20,400 DZD',
      imageSrc: '/images/last-frame-16-9.jpg',
      badge: isAr ? 'عرض النخبة 5 في 1 • كمية محدودة' : 'Pack Élite 5 en 1 • Stock Limité'
    },
    pack2: {
      id: 'pack_sound_4in1',
      title: isAr
        ? 'عرض الصوت والطاقة 4 في 1 (PACK SOUND & POWER)'
        : 'PACK SOUND & POWER 4 EN 1 (Enceinte + Casque + Power Bank + Câble)',
      shortName: isAr ? 'باك الصوت والطاقة 4 في 1' : 'Pack Sound & Power 4 en 1',
      headline: isAr ? 'باك جامي يجي في بالك استغل الفرصة !' : 'Offre Spéciale 4 en 1 • Saisissez l\'opportunité !',
      price: 6600,
      priceDisplay: '6,600 DZD',
      imageSrc: '/images/pack-2.jpg',
      badge: isAr ? 'عرض خاص 6600 دج • كمية محدودة' : 'Pack Éco 6,600 DA • Stock Limité'
    },
    pack3: {
      id: 'speaker_mic_bs232',
      title: isAr
        ? 'مكبر صوت بلوتوث BS-232A مع ميكروفون كاريوكي'
        : 'Enceinte Bluetooth BS-232A + Microphone Karaoké',
      shortName: isAr ? 'سبيكر بلوتوث + ميكروفون' : 'Enceinte + Micro BS-232A',
      headline: isAr ? 'سبيكر بلوتوث + مايك استغل الفرصة !' : 'Enceinte Bluetooth + Micro • Saisissez l\'opportunité !',
      price: 4500,
      priceDisplay: '4,500 DZD',
      imageSrc: '/images/speaker-mic.jpg',
      badge: isAr ? 'سبيكر + مايك 4500 دج • كمية محدودة' : 'Offre Spéciale 4,500 DA • Stock Limité'
    }
  };

  const BUNDLE_TABS = [
    {
      key: 'pack1',
      href: '/',
      matchPaths: ['/', '/index.html'],
      label: isAr ? 'باك 5 في 1 (20,400 دج)' : 'Pack 5 en 1 (20,400 DA)'
    },
    {
      key: 'pack2',
      href: '/pack2',
      matchPaths: ['/pack2', '/pack-2', '/pack2.html'],
      label: isAr ? 'باك 4 في 1 (6,600 دج) 🔥' : 'Pack 4 en 1 (6,600 DA) 🔥'
    },
    {
      key: 'pack3',
      href: '/speaker',
      matchPaths: ['/speaker', '/speaker.html', '/pack3', '/pack-3', '/pack3.html'],
      label: isAr ? 'سبيكر + مايك (4,500 دج)' : 'Enceinte + Micro (4,500 DA)'
    }
  ];

  const bundleData = BUNDLES[activeBundle] || BUNDLES.pack1;

  const handleFloatingCta = () => {
    if (isSubmitting) return; // Strictly ignore duplicate clicks
    if (completedOrder) {
      const formEl = document.getElementById('commander') || formRef.current || document.getElementById('orderForm');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const form = formRef.current || document.getElementById('orderForm');
    const formEl = document.getElementById('commander') || form;

    const nameInput = form?.querySelector('input[name="fullName"], #fullName');
    const phoneInput = form?.querySelector('input[name="phoneNumber"], #phoneNumber, #phone');
    const nameVal = nameInput?.value?.trim();
    const phoneVal = phoneInput?.value?.trim();

    if (!nameVal || !phoneVal) {
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
        const targetInput = !nameVal ? nameInput : phoneInput;
        if (targetInput) setTimeout(() => targetInput.focus(), 350);
      }
      return;
    }

    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        const submitBtn = form.querySelector('button[type="submit"]') || form;
        submitBtn.click();
      }
    } else {
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-surface-container-lowest text-on-surface pt-safe pb-safe ${isAr ? 'rtl' : 'ltr'}`}>
      
      {/* Discrete Top Branding Bar with Bundle Switcher */}
      <header
        className="w-full max-w-xl mx-auto px-margin-sm md:px-margin pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-secondary z-20"
        style={{ marginBottom: '8px' }}
      >
        <div className="flex items-center gap-1.5 font-medium text-primary tracking-tight">
          <img src="/favicon.png" alt="Logo" className="w-5 h-5 rounded-sm object-contain" />
          <span className="font-bold">SPEAR.DZ</span>
          <span className="text-[10px] text-secondary font-normal uppercase tracking-wider">Store</span>
        </div>

        {/* Bundle Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-0.5 p-0.5 rounded-2xl sm:rounded-full bg-surface-container-low border border-outline-variant/30 text-[10px] sm:text-[11px] font-medium">
          {BUNDLE_TABS.map((tab) => {
            const isCurrent = activeBundle === tab.key;
            return (
              <a
                key={tab.key}
                href={tab.href}
                onClick={(e) => {
                  const p = window.location.pathname.toLowerCase();
                  if (tab.matchPaths.includes(p)) {
                    e.preventDefault();
                    setActiveBundle(tab.key);
                  }
                }}
                className={`px-2 sm:px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-black text-white shadow-xs font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-md text-[11px]">
          <span>🇩🇿</span>
          <span>{isAr ? 'توصيل 58 ولاية • الدفع عند الاستلام' : 'Livraison 58 Wilayas • Paiement COD'}</span>
        </div>
      </header>

      {/* Main Container - Single Column Max-w-xl */}
      <main className="flex flex-col relative w-full bg-surface-container-lowest flex-1">
        <div className="flex flex-col w-full max-w-xl mx-auto pb-28">
          
          {/* 1. Product Showcase Image Frame (Instant-loading High-Res Pack Showcase) */}
          <CupertinoVideoHero
            key={bundleData.imageSrc}
            imageSrc={bundleData.imageSrc}
            altText={bundleData.title}
          />

          {/* 2. Cupertino Minimalist Order Form with DZShip Wilayas & Communes */}
          <OrderForm
            key={bundleData.id}
            locale={locale}
            formRef={formRef}
            onSubmittingChange={setIsSubmitting}
            onOrderSuccess={(orderData) => setCompletedOrder(orderData)}
            onButtonVisibilityChange={setIsFormButtonVisible}
            bundleId={bundleData.id}
            basePrice={bundleData.price}
            bundleName={bundleData.title}
            bundleShortName={bundleData.shortName}
            headline={bundleData.headline}
          />

        </div>

        {/* 3. Floating Bottom Glass Bar with White Blur & Black Pill CTA */}
        <StickyMobileBar
          locale={locale}
          price={bundleData.priceDisplay}
          bundleName={bundleData.shortName}
          isSubmitting={isSubmitting}
          isCompleted={Boolean(completedOrder)}
          onSubmitOrder={handleFloatingCta}
          hidden={isFormButtonVisible}
        />
      </main>

      {/* 4. Order Confirmation Modal */}
      {completedOrder && (
        <ConfirmationModal
          order={completedOrder}
          locale={locale}
          onClose={() => setCompletedOrder(null)}
        />
      )}

    </div>
  );
}
