import React from 'react';

export default function TrustBadges({ locale }) {
  const isAr = locale === 'ar';

  const BADGES = [
    {
      icon: '🚚',
      titleFr: 'Livraison 58 Wilayas',
      titleAr: 'توصيل لـ 58 ولاية',
      descFr: 'Expédition rapide 24h à 48h directement chez vous ou en bureau de retrait.',
      descAr: 'شحن سريع وموثوق يصلك لباب منزلك أو لأقرب مكتب استلام ياليدين.'
    },
    {
      icon: '💵',
      titleFr: 'Paiement à la Livraison',
      titleAr: 'الدفع عند الاستلام',
      descFr: 'Aucun prépaiement. Vous vérifiez le contenu de votre coffret avant de payer.',
      descAr: 'لا تدفع أي دينار مسبقاً. عاين العلبة ومحتوياتها ثم ادفع للموزع.'
    },
    {
      icon: '🛡️',
      titleFr: 'Garantie 12 Mois',
      titleAr: 'ضمان 12 شهراً',
      descFr: 'Échange immédiat en cas de défaut technique sous couverture constructeur.',
      descAr: 'استبدال فوري للجهاز في حال وجود أي خلل مصنعي طيلة عام كامل.'
    },
    {
      icon: '📞',
      titleFr: 'Support Client Dédié',
      titleAr: 'خدمة عملاء 7/7',
      descFr: 'Une équipe algérienne réactive pour vous accompagner avant et après achat.',
      descAr: 'فريق عمل جزائري جاهز للإجابة على جميع استفساراتكم ومرافقتكم.'
    }
  ];

  return (
    <section className="py-10 bg-[#f5f5f7] border-y border-[#d2d2d7]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BADGES.map((b, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-[#d2d2d7]/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all flex items-start gap-4"
            >
              <div className="text-2xl p-2.5 rounded-xl bg-[#f5f5f7] border border-[#e5e5e7] flex-shrink-0">
                {b.icon}
              </div>
              <div>
                <h4 className="font-semibold text-[#1d1d1f] text-sm sm:text-base">
                  {isAr ? b.titleAr : b.titleFr}
                </h4>
                <p className="mt-1 text-xs text-[#86868b] leading-relaxed">
                  {isAr ? b.descAr : b.descFr}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
