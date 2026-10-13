import React, { useState, useEffect, useRef } from 'react';
import CupertinoVideoHero from './components/CupertinoVideoHero';
import OrderForm from './components/OrderForm';
import StickyMobileBar from './components/StickyMobileBar';
import ConfirmationModal from './components/ConfirmationModal';

export default function App() {
  const [locale, setLocale] = useState('ar'); // Default Arabic or French
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const isAr = locale === 'ar';

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'fr';
  }, [isAr]);

  const handleFloatingCta = () => {
    if (isSubmitting) return; // Strictly ignore duplicate clicks
    if (formRef.current) {
      if (typeof formRef.current.requestSubmit === 'function') {
        formRef.current.requestSubmit();
      } else {
        const submitBtn = formRef.current.querySelector('button[type="submit"]') || formRef.current;
        submitBtn.click();
      }
    } else {
      const el = document.getElementById('commander');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-surface-container-lowest text-on-surface pt-safe pb-safe ${isAr ? 'rtl' : 'ltr'}`}>
      
      {/* Discrete Top Branding Bar */}
      <header
        className="w-full max-w-xl mx-auto px-margin-sm md:px-margin pt-2 flex items-center justify-between text-xs text-secondary z-20"
        style={{ marginBottom: '8px' }}
      >
        <div className="flex items-center gap-1.5 font-medium text-primary tracking-tight">
          <span className="font-bold">SPEAR.DZ</span>
          <span className="text-[10px] text-secondary font-normal uppercase tracking-wider">Store</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-md text-[11px]">
          <span>🇩🇿</span>
          <span>توصيل 58 ولاية • الدفع عند الاستلام</span>
        </div>
      </header>

      {/* Main Container - Single Column Max-w-xl from code.html */}
      <main className="flex flex-col relative w-full bg-surface-container-lowest flex-1">
        <div className="flex flex-col w-full max-w-xl mx-auto pb-28">
          
          {/* 1. Cinematic Video Frame (video products - bundl.mp4 -> last frame 16-9.jpg) */}
          <CupertinoVideoHero
            videoSrc="/videos/video-products-bundl.mp4"
            lastFrameSrc="/images/last-frame-16-9.jpg"
          />

          {/* 2. Cupertino Minimalist Order Form with DZShip Wilayas & Communes */}
          <OrderForm
            locale={locale}
            formRef={formRef}
            onSubmittingChange={setIsSubmitting}
            onOrderSuccess={(orderData) => setCompletedOrder(orderData)}
          />

        </div>

        {/* 3. Floating Bottom Glass Bar with White Blur & Black Pill CTA */}
        <StickyMobileBar
          locale={locale}
          price="21,900 DZD"
          bundleName="Pack High-Tech 5 en 1"
          isSubmitting={isSubmitting}
          onSubmitOrder={handleFloatingCta}
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
