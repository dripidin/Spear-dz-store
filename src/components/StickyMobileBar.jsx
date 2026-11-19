import React from 'react';

export default function StickyMobileBar({
  locale = 'fr',
  price = '20,400 DZD',
  bundleName = 'Pack High-Tech 5 en 1',
  isSubmitting = false,
  isCompleted = false,
  onSubmitOrder,
  hidden = false
}) {
  const isAr = locale === 'ar';

  const handleClick = () => {
    if (isSubmitting) return;
    if (isCompleted) {
      const formEl = document.getElementById('orderForm') || document.getElementById('commander');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }
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
      aria-hidden={hidden}
      className={`fixed bottom-0 inset-x-0 z-30 pb-safe pt-2 px-margin-sm md:px-margin bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/95 to-transparent backdrop-blur-md transition-all duration-300 ease-in-out transform flex flex-col items-center ${
        hidden
          ? 'translate-y-full opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
    >
      <div className="w-full max-w-xl pb-2 flex flex-col gap-1.5">
        {/* Quick Pricing & In-stock Indicator */}
        <div className="flex items-center justify-between px-2 text-[11px] text-secondary">
          <span>{bundleName || (isAr ? 'عرض النخبة 5 في 1 الفاخر' : 'Pack High-Tech 5 en 1')}</span>
          <span className="font-mono font-bold text-primary whitespace-nowrap">{price}</span>
        </div>

        {/* Black Pill Button CTA with Synchronous Loading State */}
        <button
          id="mainCtaBtn"
          type="button"
          disabled={isSubmitting}
          tabIndex={hidden ? -1 : 0}
          onClick={handleClick}
          className={`w-full h-12 bg-primary text-on-primary rounded-full font-label-lg text-label-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer group ${
            isSubmitting
              ? 'opacity-85 cursor-wait'
              : isCompleted
                ? '!bg-emerald-900 !text-white'
                : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{isAr ? 'جارٍ تأكيد طلبك...' : 'Confirmation de votre commande...'}</span>
            </>
          ) : isCompleted ? (
            <>
              <span className="text-emerald-300 font-bold">✓</span>
              <span>{isAr ? 'تم تأكيد طلبك بنجاح' : 'Commande confirmée'}</span>
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
