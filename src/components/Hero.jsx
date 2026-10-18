import React, { useState } from 'react';
import MobileHeroVideo from './MobileHeroVideo';

const BUNDLE_SLIDES = [
  {
    id: 'pack',
    tagFr: 'Coffret Complet',
    tagAr: 'الباك المتكامل',
    titleFr: 'Le Pack High-Tech 5 en 1',
    titleAr: 'باك هاي تيك 5 في 1 الفاخر',
    subtitleFr: 'Cinq indispensables réunis dans une boîte premium',
    subtitleAr: 'خمس أجهزة تكنولوجية أساسية في علبة واحدة فاخرة',
    image: '/images/products/pack.jpg',
    specs: ['5 Accessoires Premium', 'Boîte Cadeau Rigide', '100% Testé & Certifié']
  },
  {
    id: 'smartphone',
    tagFr: 'Smartphone Buzz Prime+ 7',
    tagAr: 'هاتف Buzz Prime+ 7',
    titleFr: 'Buzz Prime+ 7 • 128 Go & 10 Go RAM',
    titleAr: 'هاتف Buzz Prime+ 7 سعة 128GB و 10GB رام',
    subtitleFr: 'Double SIM 4G LTE, écran immersif HD et grande autonomie',
    subtitleAr: 'شريحتين 4G LTE مع شاشة واضحة وكاميرا متطورة',
    image: '/images/products/Smartphone.jpg',
    specs: ['128 Go Stockage', '10 Go RAM (3+7 Go)', 'Réseau 4G LTE', 'Double SIM']
  },
  {
    id: 'headphones',
    tagFr: 'Casque P9 Hi-Fi',
    tagAr: 'سماعات P9 اللاسلكية',
    titleFr: 'Casque Sans Fil P9 Hi-Fi Stéréo',
    titleAr: 'سماعات رأس لاسلكية P9 صوت فائق النقاء',
    subtitleFr: 'Isolation sonore passive, arceau ergonomique et basses profondes',
    subtitleAr: 'عزل صوتي مريح، صوت ستيريو محيطي وبطارية تدوم طويلاً',
    image: '/images/products/Headphones.jpg',
    specs: ['Bluetooth 5.3', 'Audio Hi-Fi Stéréo', 'Commandes Intégrées', 'Coussinets Confort']
  },
  {
    id: 'powerbank',
    tagFr: 'Power Bank HOCO 10 000 mAh',
    tagAr: 'باور بانك هوكو 10000mAh',
    titleFr: 'Batterie Externe HOCO J200',
    titleAr: 'باور بانك أصلي HOCO J200 سعة 10000 ميلي أمبير',
    subtitleFr: 'Double sortie USB avec indicateur LED de charge',
    subtitleAr: 'شحن جهازين في وقت واحد مع مؤشر رقمي LED',
    image: '/images/products/Power bank.jpg',
    specs: ['10 000 mAh Réels', '2 Ports USB', 'Indicateur LED', 'Protection Surchauffe']
  },
  {
    id: 'charger',
    tagFr: 'Chargeur Rapide 25W',
    tagAr: 'شاحن سريع 25W',
    titleFr: 'Adaptateur Mural Fast Charge 25W',
    titleAr: 'شاحن جداري فائق السرعة 25 واط مخرج Type-C',
    subtitleFr: 'Recharge ultra-rapide avec puce de sécurité intelligente',
    subtitleAr: 'شحن آمن وفائق السرعة متوافق مع كل الأجهزة',
    image: '/images/products/Charger.jpg',
    specs: ['Puissance 25W PD', 'Connecteur Type-C', 'Contrôle Température', 'Format Compact']
  },
  {
    id: 'cable',
    tagFr: 'Câble Blindé 3-en-1',
    tagAr: 'كابل شحن 3 في 1',
    titleFr: 'Câble Multi-Connecteurs Renforcé',
    titleAr: 'كابل شحن سريع متعدد 3 في 1 ضد القطع',
    subtitleFr: 'Type-C, Lightning & Micro-USB avec tressage haute résistance',
    subtitleAr: 'يدعم جميع أنواع الهواتف، قوي ومقاوم للثني والانحناء',
    image: '/images/products/Cable.jpg',
    specs: ['3-en-1 Universel', 'Tressage Renforcé', 'Débit Rapide', 'Longueur 1.2m']
  }
];

export default function Hero({ locale, onScrollToOrder }) {
  const isAr = locale === 'ar';
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const activeSlide = BUNDLE_SLIDES[activeSlideIndex];

  return (
    <section id="design" className="product-viewer-component relative pt-6 pb-16 sm:pt-10 sm:pb-24 bg-[#f5f5f7] overflow-hidden select-none">
      
      {/* Viewport Content Header (Apple .viewport-content / .ric-type-lockup) */}
      <div className="viewport-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12 text-center">
        <div className="ric-type-lockup space-y-2">
          
          {/* Eyebrow */}
          <div className="ric-type-lockup-eyebrow-container">
            <span className="ric-type-lockup-eyebrow inline-block text-xs uppercase tracking-widest font-semibold text-[#86868b]">
              {isAr ? 'التصميم • الهندسة • الأداء' : 'Design & Ingénierie • Algérie'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="ric-type-lockup-headline text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1d1d1f] max-w-4xl mx-auto leading-[1.12]">
            {isAr ? (
              <>
                باك <span className="text-[#0071e3]">هاي تيك 5 في 1</span> الفاخر.
                <br />
                <span className="text-[#86868b] text-2xl sm:text-4xl lg:text-5xl font-normal">
                  تجربة استثنائية متكاملة.
                </span>
              </>
            ) : (
              <>
                Le Pack <span className="text-[#0071e3]">High-Tech 5 en 1</span>.
                <br />
                <span className="text-[#86868b] text-2xl sm:text-4xl lg:text-5xl font-normal">
                  La technologie essentielle, sublimée.
                </span>
              </>
            )}
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base text-[#86868b] max-w-2xl mx-auto pt-2 leading-relaxed">
            {isAr
              ? 'هاتف ذكي Buzz Prime+ 7 مع ذاكرة 128GB، سماعات P9 عازلة، باور بانك HOCO أصلي، شاحن سريع 25W وكابل 3 في 1 — بسعر استثنائي مع الدفع عند الاستلام.'
              : 'Cinq équipements high-tech rigoureusement sélectionnés et réunis dans un seul coffret officiel. Commandez aujourd\'hui et payez à la livraison après vérification.'}
          </p>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* =========================================================================
            1. MOBILE SMARTPHONE EXPERIENCE ONLY (< 1024px)
            User requirement:
            - Plays video layer 2 as the first element
            - The exact same ms video stops, places last fram video.png in exact same placement
            - 3:4 format rectangle with white framing
            - Website background in off-white color (#f5f5f7)
            - Do NOT include this at desktop, activate it just on user open website with mobile smartphone
            ========================================================================= */}
        <div className="block lg:hidden space-y-6">
          
          {/* First Element to Play on Mobile: 3:4 White Framed Video with Millisecond Freeze */}
          <div className="flex justify-center">
            <MobileHeroVideo
              videoSrc="/videos/video-layer-2.mp4"
              lastFrameSrc="/images/last-frame-video.png"
              locale={locale}
            />
          </div>

          {/* Mobile Pricing & Order Lockup */}
          <div className="apple-card p-5 max-w-[340px] mx-auto text-center space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            
            <div className="flex items-center justify-between border-b border-[#e5e5e7] pb-3">
              <span className="text-xs text-[#86868b] font-medium">
                {isAr ? 'السعر الترويجي الخاص' : 'Prix Pack Complet'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                {isAr ? 'توفير 9,100 دج' : 'Économie 9,100 DZD'}
              </span>
            </div>

            <div className="flex items-baseline justify-center gap-2">
              <span className="text-3xl font-bold text-[#1d1d1f] tracking-tight font-mono">
                20,400
              </span>
              <span className="text-sm font-semibold text-[#86868b]">DZD</span>
              <span className="text-sm line-through text-[#a1a1a6] font-mono ml-2">
                29,500 DZD
              </span>
            </div>

            {/* Urgency Stock Note */}
            <div className="text-[11px] text-[#86868b] flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'الكمية محدودة: باقي 14 علبة فقط' : 'Stock officiel: Plus que 14 packs disponibles'}</span>
            </div>

            {/* Apple Blue Pill CTA */}
            <button
              type="button"
              onClick={onScrollToOrder}
              className="w-full py-3.5 px-6 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              {isAr ? 'اطلب الآن — الدفع عند الاستلام' : 'Commander le Pack — Paiement COD'}
            </button>

            <div className="text-[11px] text-[#86868b] pt-1 flex items-center justify-center gap-2">
              <span>🇩🇿 58 Wilayas</span>
              <span>•</span>
              <span>🛡️ Garantie 12 Mois</span>
              <span>•</span>
              <span>✓ Test avant paiement</span>
            </div>

          </div>

        </div>

        {/* =========================================================================
            2. DESKTOP EXPERIENCE ONLY (lg:block)
            User requirement:
            - As user experience do not include the video freeze flow at desktop
            - Built according to devtools_can_you_able_to_explain_this_how_it_works_and_can_y.md
            - Apple Interactive Product Viewer (#design / .product-viewer-component)
            ========================================================================= */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Interactive Product Viewer Stage */}
          <div className="lg:col-span-7">
            <div className="product-viewer-container relative bg-white rounded-3xl p-6 border border-[#d2d2d7]/60 shadow-[0_10px_35px_rgba(0,0,0,0.05)]">
              
              {/* Product Visual Stage with Smooth Cross-Fade */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#fafafc] flex items-center justify-center border border-[#e5e5e7]">
                <img
                  key={activeSlide.id}
                  src={activeSlide.image}
                  alt={isAr ? activeSlide.titleAr : activeSlide.titleFr}
                  className="max-h-[85%] max-w-[85%] object-contain animate-apple-fade transition-transform duration-500 hover:scale-105"
                />

                {/* Top Badge */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-xs font-semibold text-[#1d1d1f] border border-[#d2d2d7]/50 shadow-sm">
                    {isAr ? activeSlide.tagAr : activeSlide.tagFr}
                  </span>
                </div>

                {/* Specs Pills */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5 justify-center">
                  {activeSlide.specs.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-medium text-[#1d1d1f] border border-[#d2d2d7]/40 shadow-xs"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Apple-style Interactive Product Switcher Bar (.controls / .colornav-item) */}
              <div className="mt-5 pt-4 border-t border-[#e5e5e7] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                  {isAr ? 'استكشف محتويات العلبة:' : 'Explorer les composants :'}
                </span>
                
                <div className="flex items-center gap-2">
                  {BUNDLE_SLIDES.map((slide, index) => {
                    const isActive = index === activeSlideIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveSlideIndex(index)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#1d1d1f] text-white shadow-sm'
                            : 'bg-[#e8e8ed] text-[#1d1d1f] hover:bg-[#d8d8dd]'
                        }`}
                        title={isAr ? slide.titleAr : slide.titleFr}
                      >
                        {isAr ? slide.tagAr : slide.tagFr}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Apple Value Proposition & Pricing Card */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Active Component Details Lockup */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest font-semibold text-[#0071e3]">
                {isAr ? 'عرض الإطلاق الحصري بالجزائر' : 'Offre Officielle de Lancement'}
              </span>
              <h2 className="text-3xl font-semibold text-[#1d1d1f] tracking-tight leading-tight">
                {isAr ? activeSlide.titleAr : activeSlide.titleFr}
              </h2>
              <p className="text-sm text-[#86868b] leading-relaxed">
                {isAr ? activeSlide.subtitleAr : activeSlide.subtitleFr}
              </p>
            </div>

            {/* Apple Pricing Lockup Card */}
            <div className="apple-card p-6 bg-white space-y-5">
              
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-[#86868b] block mb-1">
                    {isAr ? 'السعر الترويجي للباك كاملاً' : 'Prix Spécial Coffret Complet'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#1d1d1f] tracking-tight font-mono">
                      20,400
                    </span>
                    <span className="text-sm font-semibold text-[#86868b]">DZD</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#86868b] block mb-1">
                    {isAr ? 'القيمة المنفصلة' : 'Valeur Réelle'}
                  </span>
                  <span className="line-through text-sm text-[#a1a1a6] font-mono block">
                    29,500 DZD
                  </span>
                  <span className="inline-block mt-1 text-[11px] font-semibold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full">
                    {isAr ? 'توفير 9,100 دج' : 'Économie 9,100 DZD'}
                  </span>
                </div>
              </div>

              {/* Stock Indicator */}
              <div className="pt-3 border-t border-[#e5e5e7] flex items-center justify-between text-xs text-[#86868b]">
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isAr ? 'متوفر للتسليم الفوري' : 'En stock immédiat'}
                </span>
                <span className="font-semibold text-[#1d1d1f]">
                  {isAr ? 'باقي 14 علبة فقط' : 'Plus que 14 packs disponibles'}
                </span>
              </div>

              {/* Apple Blue Pill CTA Button */}
              <button
                type="button"
                onClick={onScrollToOrder}
                className="w-full py-3.5 px-8 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm shadow-md transition-all hover:shadow-lg active:scale-98 cursor-pointer text-center"
              >
                {isAr ? 'اطلب الآن — الدفع عند الاستلام' : 'Commander le Pack — Paiement à la Livraison'}
              </button>

              <div className="flex items-center justify-between text-xs text-[#86868b] pt-1">
                <span>🚚 Livraison 58 Wilayas</span>
                <span>🛡️ Garantie 12 Mois</span>
                <span>💵 Paiement COD</span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
