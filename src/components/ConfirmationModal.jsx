import React from 'react';

export default function ConfirmationModal({ order, onClose, locale }) {
  if (!order) return null;
  const isAr = locale === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.12)] text-center">
        
        {/* Success Icon */}
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-4 text-primary text-2xl font-bold">
          ✓
        </div>

        {/* Title */}
        <h3 className="font-title-lg text-title-lg text-primary tracking-tight mb-1">
          {isAr ? 'تم استلام طلبك بنجاح!' : 'Commande Confirmée !'}
        </h3>
        <p className="font-body-md text-body-md text-secondary mb-6 leading-relaxed">
          {isAr
            ? 'شكراً لثقتكم بنا. سيتصل بكم فريقنا قريباً لتأكيد العنوان وموعد التوصيل.'
            : 'Merci pour votre confiance. Notre service client vous contactera par téléphone pour valider l\'expédition.'}
        </p>

        {/* Order Details Card */}
        <div className="p-4 rounded-2xl bg-surface-container-low text-left font-mono text-xs sm:text-sm space-y-2 mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-surface-container">
            <span className="text-secondary">{isAr ? 'رقم الطلب:' : 'N° Commande:'}</span>
            <span className="font-bold text-primary">{order.orderId}</span>
          </div>

          <div className="flex justify-between text-primary">
            <span className="text-secondary">{isAr ? 'العميل:' : 'Client:'}</span>
            <span>{order.fullName}</span>
          </div>

          <div className="flex justify-between text-primary">
            <span className="text-secondary">{isAr ? 'الهاتف:' : 'Téléphone:'}</span>
            <span>{order.phone}</span>
          </div>

          <div className="flex justify-between text-primary">
            <span className="text-secondary">{isAr ? 'الوجهة:' : 'Destination:'}</span>
            <span className="truncate max-w-[200px]">{order.wilaya}</span>
          </div>

          <div className="flex justify-between text-primary">
            <span className="text-secondary">{isAr ? 'طريقة الاستلام:' : 'Mode:'}</span>
            <span>{order.deliveryType === 'home' || order.deliveryType === 'domicile' ? 'À Domicile' : 'Bureau Yalidine (Stop-Desk)'}</span>
          </div>

          <div className="pt-2 border-t border-surface-container flex justify-between items-baseline font-bold text-primary text-base">
            <span>{isAr ? 'المجموع عند الاستلام:' : 'Total COD:'}</span>
            <span>{order.totalPrice ? order.totalPrice.toLocaleString() : '22,400'} DZD</span>
          </div>
        </div>

        {/* Instruction Message */}
        <div className="p-3 rounded-xl bg-surface-container-low text-secondary text-[12px] mb-6">
          📞 <strong>{isAr ? 'تنبيه مهم:' : 'Rappel :'}</strong>{' '}
          {isAr
            ? 'يرجى إبقاء هاتفك قريباً منك للرد على اتصال موزع التوصيل.'
            : 'Veuillez garder votre téléphone allumé afin de répondre à l\'appel de confirmation de notre livreur.'}
        </div>

        {/* Black Pill Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-medium shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
        >
          {isAr ? 'حسناً، فهمت' : 'Parfait, Merci'}
        </button>

      </div>
    </div>
  );
}
