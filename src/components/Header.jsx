import React from 'react';

export default function Header({ locale, setLocale, onScrollToOrder }) {
  const isAr = locale === 'ar';

  return (
    <header className="sticky top-0 z-40 w-full apple-glass-nav transition-all">
      {/* Apple Sub-Banner: Delivery notice */}
      <div className="bg-white/90 border-b border-[#e5e5e7] py-1.5 px-4 text-center text-xs text-[#1d1d1f]">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span>🇩🇿</span>
          <span className="font-normal text-[#515154]">
            {isAr
              ? 'توصيل سريع متوفر لجميع 58 ولاية — الدفع عند الاستلام بعد معاينة المنتج'
              : 'Livraison express disponible sur les 58 Wilayas — Paiement à la livraison après vérification'}
          </span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#1d1d1f] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            S
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-base tracking-tight text-[#1d1d1f]">
              SPEAR<span className="text-[#0071e3]">.DZ</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] text-[#86868b] font-medium tracking-wide">
              Store
            </span>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3">
          {/* Apple Blue Pill CTA */}
          <button
            type="button"
            onClick={onScrollToOrder}
            className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            اطلب الآن (الدفع عند الاستلام)
          </button>
        </div>
      </div>
    </header>
  );
}
