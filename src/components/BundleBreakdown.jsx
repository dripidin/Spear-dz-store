import React from 'react';

const BUNDLE_PRODUCTS = [
  {
    id: 1,
    ref: 'SMARTPHONE-BUZZ-PRIME-7',
    nameFr: 'Smartphone Buzz Prime+ 7 (128 Go)',
    nameAr: 'هاتف ذكي Buzz Prime+ 7 (سعة 128 جيغابايت)',
    descFr: 'Écran immersif haute résolution, 10 Go RAM (3 Go physique + 7 Go mémoire étendue), double SIM 4G LTE et caméra haute définition.',
    descAr: 'شاشة واضحة بدقة عالية، ذاكرة رام 10 جيغابايت (3 جيغا فعلية + 7 جيغا افتراضية)، يدعم شريحتين مع شبكة 4G LTE وبطارية تدوم طويلاً.',
    valeur: '15,500 DZD',
    specs: ['Écran HD Immersif', '128 Go Stockage', '10 Go RAM (3+7 Go)', 'Double SIM 4G'],
    image: '/images/products/Smartphone.jpg'
  },
  {
    id: 2,
    ref: 'CASQUE-P9-HIFI',
    nameFr: 'Casque Sans Fil P9 Hi-Fi Stéréo',
    nameAr: 'سماعات الرأس اللاسلكية P9 صوت نقي',
    descFr: 'Audio haute fidélité sans fil Bluetooth 5.3, coussinets ergonomiques respirants et commandes multimédias physiques intégrées.',
    descAr: 'صوت نقي عالي الدقة (Hi-Fi)، اتصال بلوتوث لاسلكي سريع ومستقر، وسائد أذن مريحة للاستخدام الطويل مع أزرار تحكم مدمجة.',
    valeur: '3,500 DZD',
    specs: ['Bluetooth 5.3', 'Basses Stéréo Hi-Fi', 'Micro HD Intégré', 'Autonomie Prolongée'],
    image: '/images/products/Headphones.jpg'
  },
  {
    id: 3,
    ref: 'PB-HOCO-10000',
    nameFr: 'Power Bank HOCO J200 (10 000 mAh)',
    nameAr: 'باور بانك أصلي HOCO J200 (10000 ميلي أمبير)',
    descFr: 'Capacité réelle 10 000 mAh avec double port de sortie pour charger deux appareils en simultané et indicateur LED de charge.',
    descAr: 'سعة حقيقية 10,000 ملي أمبير، منافذ شحن مزدوجة لشحن جهازين في وقت واحد، مؤشر طاقة LED، وتصميم متين مناسب للسفر.',
    valeur: '4,500 DZD',
    specs: ['Capacité 10 000 mAh', '2 Ports Sortie USB', 'Indicateur LED', 'Protection Puce IC'],
    image: '/images/products/Power bank.jpg'
  },
  {
    id: 4,
    ref: 'CHARGEUR-25W-PD',
    nameFr: 'Adaptateur Charge Rapide 25W USB-C',
    nameAr: 'شاحن سريع جداري 25W بمخرج USB-C',
    descFr: 'Chargeur mural Power Delivery 25W avec gestion thermique intelligente et protection contre les surtensions.',
    descAr: 'قدرة شحن سريعة تصل إلى 25 واط متوافقة مع أحدث بروتوكولات الشحن السريع وحماية من الجهد الزائد والحرارة.',
    valeur: '2,800 DZD',
    specs: ['Charge Rapide 25W', 'Connecteur Type-C', 'Contrôle Thermique', 'Format Voyage'],
    image: '/images/products/Charger.jpg'
  },
  {
    id: 5,
    ref: 'CABLE-3IN1-FAST',
    nameFr: 'Câble Fast-Charging 3-en-1 Renforcé',
    nameAr: 'كابل شحن سريع متعدد 3 في 1 مصفح',
    descFr: 'Connecteurs interchangeables Type-C, Lightning et Micro-USB compatibles avec tous vos appareils, tresse renforcée anti-torsion.',
    descAr: 'رؤوس شحن ثلاثية متوافقة مع جميع أنواع الهواتف والأجهزة، تصميم مضاد للقطع ومقاوم للثني والانحناء، شحن سريع ونقل بيانات.',
    valeur: '3,200 DZD',
    specs: ['Connecteur 3-en-1', 'Type-C / Lightning / Micro', 'Tressage Blindé', 'Charge Rapide'],
    image: '/images/products/Cable.jpg'
  }
];

export default function BundleBreakdown({ locale }) {
  const isAr = locale === 'ar';

  return (
    <section className="py-14 sm:py-24 relative bg-[#f5f5f7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block text-xs uppercase tracking-widest font-semibold text-[#86868b] mb-2">
            {isAr ? 'محتويات الصندوق' : 'Composition du Coffret'}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1d1d1f] tracking-tight">
            {isAr ? 'المكونات الخمسة بالتفصيل.' : 'Cinq chefs-d\'œuvre. Un seul coffret.'}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#86868b] leading-relaxed">
            {isAr
              ? 'كل عنصر تم اختياره ليقدم لك أعلى مستويات الجودة والاعتمادية في حياتك اليومية.'
              : 'Des équipements haute performance testés et prêts à l\'emploi avec vos appareils iOS et Android.'}
          </p>
        </div>

        {/* 5-Product Museum Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BUNDLE_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="apple-card p-6 flex flex-col justify-between group"
            >
              <div>
                {/* Product Image Stage */}
                <div className="relative w-full aspect-[4/3] rounded-2xl bg-[#fafafc] border border-[#e5e5e7] overflow-hidden mb-5 flex items-center justify-center p-4">
                  <img
                    src={prod.image}
                    alt={isAr ? prod.nameAr : prod.nameFr}
                    className="max-h-[90%] max-w-[90%] object-contain group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="text-[11px] font-semibold text-[#1d1d1f] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#d2d2d7]/50 shadow-xs">
                      {prod.valeur}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg text-[#1d1d1f] tracking-tight mb-2">
                  {isAr ? prod.nameAr : prod.nameFr}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#86868b] leading-relaxed mb-4">
                  {isAr ? prod.descAr : prod.descFr}
                </p>
              </div>

              {/* Specs Pills */}
              <div className="pt-4 border-t border-[#e5e5e7] flex flex-wrap gap-1.5">
                {prod.specs.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-[11px] font-medium border border-[#d2d2d7]/40"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* 6th Card: Bundle Value Summary Card */}
          <div className="apple-card p-6 flex flex-col justify-between bg-gradient-to-b from-white to-[#fafafc] border-2 border-[#0071e3]/30">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-xs font-semibold uppercase tracking-wider mb-3">
                {isAr ? 'قيمة الباك الكلية' : 'Avantage Exclusif'}
              </span>
              <h3 className="font-semibold text-xl text-[#1d1d1f] tracking-tight mb-2">
                {isAr ? 'وفر 7,600 دج مقارنة بالشراء المنفصل' : 'Économisez 7,600 DZD sur le lot complet'}
              </h3>
              <p className="text-xs sm:text-sm text-[#86868b] leading-relaxed mb-4">
                {isAr
                  ? 'شراء هذه الأجهزة كل على حدة يكلفك 29,500 دج. احصل على التشكيلة الكاملة في علبة هدايا واحدة بسعر 21,900 دج فقط.'
                  : 'Achetés séparément, ces équipements vous coûteraient 29,500 DZD. Profitez du tarif préférentiel groupé avec livraison 58 Wilayas.'}
              </p>
            </div>

            <div className="pt-4 border-t border-[#e5e5e7] space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#86868b]">{isAr ? 'السعر النهائي:' : 'Tarif groupé :'}</span>
                <span className="text-2xl font-bold text-[#1d1d1f] font-mono">21,900 DZD</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                <span>✓</span>
                <span>{isAr ? 'الدفع عند الاستلام بعد المعاينة' : 'Paiement à la livraison après inspection'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
