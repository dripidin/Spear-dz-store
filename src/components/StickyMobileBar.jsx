import React from 'react';

export default function StickyMobileBar({
  locale = 'fr',
  price = '21,900 DZD',
  bundleName = 'Pack High-Tech 5 en 1',
  isSubmitting = false,
  onSubmitOrder
}) {
  const isAr = locale === 'ar';

  const handleClick = () => {
    if (isSubmitting) return;
    if (onSubmitOrder) {
      onSubmitOrder();
    } else {
      const formEl = document.getElementById('orderForm') || document.getElementById('commander');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
        const firstInput = formEl.querySelector('input');
        if (firstInput) firstInput.focus();
      }
    }
  };

  return (
    <div
      id="floatingBar"
      className="fixed bottom-0 inset-x-0 z-30 pb-safe pt-2 px-margin-sm md:px-margin bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/95 to-transparent backdrop-blur-md transition-all duration-500 transform translate-y-0 flex flex-col items-center"
    >
      <div className="w-full max-w-xl pb-2 flex flex-col gap-1.5">
        {/* Quick Pricing & In-stock Indicator */}
        <div className="flex items-center justify-between px-2 text-[11px] text-secondary">
          <span>{isAr ? 'عرض النخبة 5 في 1 الفاخر' : 'Pack High-Tech 5 en 1'}</span>
          <span className="font-mono font-bold text-primary">{price}</span>
        </div>

        {/* Black Pill Button CTA with Synchronous Loading State */}
        <button
          id="mainCtaBtn"
          type="button"
          disabled={isSubmitting}
          onClick={handleClick}
          className={`w-full h-12 bg-primary text-on-primary rounded-full font-label-lg text-label-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer group ${
            isSubmitting ? 'opacity-85 cursor-wait' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{isAr ? 'جارٍ تأكيد طلبك...' : 'Confirmation de votre commande...'}</span>
            </>
          ) : (
            <>
              <span>{isAr ? 'اطلب الآن (الدفع عند الاستلام)' : 'Commander Maintenant (Paiement COD)'}</span>
              <span className="material-symbols-outlined text-[18px] rotate-180 group-hover:-translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
