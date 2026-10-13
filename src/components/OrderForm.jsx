import React, { useState, useId, useEffect } from 'react';
import wilayas from '../../config/wilayas.json';
import communes from '../../config/communes.json';
import shippingRates from '../../config/shippingRates.json';

const BASE_BUNDLE_PRICE = 21900;

export default function OrderForm({ locale = 'fr', onOrderSuccess, formRef }) {
  const isAr = locale === 'ar';
  const nameId = useId();
  const phoneId = useId();
  const wilayaId = useId();
  const cityId = useId();
  const addressId = useId();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayaCode, setWilayaCode] = useState(16); // Default: Alger (16)
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('stopdesk'); // 'stopdesk' or 'domicile'
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate Algerian phone
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  const isPhoneValid = /^0[567]\d{8}$/.test(cleanPhone);

  // Compute shipping fee based on Wilaya and Delivery Preference
  const currentRate = shippingRates[String(wilayaCode)] || { home: 600, desk: 400, time: '24 - 48 H' };
  const shippingFee = deliveryType === 'domicile' ? currentRate.home : currentRate.desk;
  const grandTotal = BASE_BUNDLE_PRICE + shippingFee;

  const selectedWilayaObj = wilayas.find((w) => w.code === Number(wilayaCode)) || wilayas[15];

  // Filter communes based on selected Wilaya
  const filteredCommunes = communes.filter((c) => c.wilayaCode === Number(wilayaCode));

  // Initialize or update default commune when wilaya changes
  useEffect(() => {
    if (filteredCommunes.length > 0 && (!city || !filteredCommunes.some(c => c.name === city))) {
      setCity(filteredCommunes[0].name);
    }
  }, [wilayaCode]);

  const handleWilayaChange = (e) => {
    const newCode = Number(e.target.value);
    setWilayaCode(newCode);
    const matching = communes.filter((c) => c.wilayaCode === newCode);
    if (matching.length > 0) {
      setCity(matching[0].name);
    } else {
      setCity('');
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMsg(isAr ? 'يرجى إدخال الاسم الكامل (3 أحرف على الأقل)' : 'Veuillez renseigner votre nom complet (min. 3 caractères)');
      return;
    }

    if (!isPhoneValid) {
      setErrorMsg(
        isAr
          ? 'يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456 أو 0660123456 أو 0770123456)'
          : 'Veuillez saisir un numéro de mobile algérien valide (ex: 0550123456, 0660123456, 0770123456)'
      );
      return;
    }

    if (!city.trim()) {
      setErrorMsg(isAr ? 'يرجى تحديد البلدية' : 'Veuillez préciser votre commune');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        phone: cleanPhone,
        wilaya: `${selectedWilayaObj.code} - ${selectedWilayaObj.name} (${selectedWilayaObj.nameAr})`,
        commune: city.trim(),
        deliveryType: deliveryType === 'domicile' ? 'home' : 'stopdesk',
        notes: address.trim(),
        website_url: honeypot,
        quantity: 1
      };

      const res = await fetch('/api/send-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement de votre commande.');
      }

      if (onOrderSuccess) {
        onOrderSuccess(data.order || {
          orderId: data.orderId,
          fullName: payload.fullName,
          phone: payload.phone,
          wilaya: payload.wilaya,
          commune: payload.commune,
          deliveryType: payload.deliveryType,
          totalPrice: grandTotal
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la validation. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Commande"
      id="commander"
      className="px-margin-sm md:px-margin mt-2 flex flex-col gap-6"
      style={{ marginBottom: '40px' }}
    >
      
      {/* Title (requested headline) */}
      <h3 className="text-2xl sm:text-[28px] font-bold tracking-tight text-primary text-center -mt-6 mb-3 relative z-20">
        باك جامي يجي في بالك استغل الفرصة !
      </h3>

      {/* Mode de réception / Segmented Control */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md text-secondary">
          {isAr ? 'طريقة الاستلام' : 'Mode de réception'}
        </label>
        
        <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-xl gap-1">
          {/* Tab Stopdesk */}
          <button
            type="button"
            id="tabStopdesk"
            onClick={() => setDeliveryType('stopdesk')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-label-md text-label-md transition-all duration-200 cursor-pointer ${
              deliveryType === 'stopdesk'
                ? 'text-primary bg-surface-container-lowest shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span className="tracking-tight">مكتب التوصيل(Stopdesk)</span>
          </button>

          {/* Tab Domicile */}
          <button
            type="button"
            id="tabDomicile"
            onClick={() => setDeliveryType('domicile')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-label-md text-label-md transition-all duration-200 cursor-pointer ${
              deliveryType === 'domicile'
                ? 'text-primary bg-surface-container-lowest shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">home_pin</span>
            <span className="tracking-tight">{isAr ? 'توصيل للمنزل' : 'Domicile'}</span>
          </button>
        </div>

        {/* Dynamic Delivery Hint */}
        <p className="font-caption text-caption text-secondary px-1" id="deliveryHint">
          {deliveryType === 'stopdesk'
            ? (isAr ? `استلام من مكتب التوزيع (+${currentRate.desk} د.ج)` : `Retrait immédiat au bureau le plus proche de votre ville (+${currentRate.desk} DZD).`)
            : (isAr ? `توصيل سريع لباب منزلك (+${currentRate.home} د.ج)` : `Colis remis en main propre directement à votre porte (+${currentRate.home} DZD).`)}
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Minimalist Form */}
      <form
        ref={formRef}
        id="orderForm"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5"
      >
        {/* Anti-bot Honeypot */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website_url">Website</label>
          <input
            id="website_url"
            name="website_url"
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex="-1"
            autoComplete="off"
          />
        </div>

        {/* 1. Nom complet */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-secondary" htmlFor={nameId}>
            {isAr ? 'الاسم واللقب *' : 'Nom complet'}
          </label>
          <div className="relative flex items-center">
            <input
              id={nameId}
              name="fullName"
              type="text"
              required
              placeholder={isAr ? 'محمد بن علي' : 'Jean Dupont'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md placeholder-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all"
            />
          </div>
        </div>

        {/* 2. Numéro de téléphone */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="font-label-md text-label-md text-secondary" htmlFor={phoneId}>
              {isAr ? 'رقم الهاتف *' : 'Numéro de téléphone'}
            </label>
            {phone && (
              <span className={`font-caption text-caption ${isPhoneValid ? 'text-emerald-600 font-semibold' : 'text-amber-600'}`}>
                {isPhoneValid ? (isAr ? '✓ رقم صحيح' : '✓ Format valide') : (isAr ? '05/06/07...' : '10 chiffres requis')}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id={phoneId}
              name="phoneNumber"
              type="tel"
              required
              placeholder={isAr ? '0550 12 34 56' : '+213 550 12 34 56'}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md placeholder-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all font-mono"
            />
          </div>
        </div>

        {/* 3. Wilaya Selection (58 Wilayas from dzship) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-secondary" htmlFor={wilayaId}>
            {isAr ? 'الولاية (58 ولاية) *' : 'Wilaya (58 Wilayas)'}
          </label>
          <div className="relative flex items-center">
            <select
              id={wilayaId}
              name="wilaya"
              value={wilayaCode}
              onChange={handleWilayaChange}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all cursor-pointer appearance-none"
            >
              {wilayas.map((w) => (
                <option key={w.code} value={w.code} className="bg-white text-primary">
                  {w.code} - {w.name} ({w.nameAr})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[20px] text-secondary absolute right-3 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* 4. Commune Dynamic Selector (from dzship communes.json) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-secondary" htmlFor={cityId}>
            {isAr ? 'البلدية *' : 'Commune *'}
          </label>
          <div className="relative flex items-center">
            <select
              id={cityId}
              name="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all cursor-pointer appearance-none"
            >
              <option value="">{isAr ? '-- اختر البلدية --' : '-- Sélectionner la commune --'}</option>
              {filteredCommunes.map((c, idx) => (
                <option key={idx} value={c.name} className="bg-white text-primary">
                  {c.name} ({c.nameAr})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[20px] text-secondary absolute right-3 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* 5. Adresse de livraison */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-secondary" htmlFor={addressId}>
            {isAr ? 'العنوان بالتفصيل (أو ملاحظة للتوصيل)' : 'Adresse de livraison'}
          </label>
          <div className="relative flex items-center">
            <input
              id={addressId}
              name="address"
              type="text"
              placeholder={isAr ? 'الحي / رقم العمارة / الوقت المفضل' : 'Rue, Quartier, Bâtiment'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md placeholder-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all"
            />
          </div>
        </div>

        {/* Subtotal & Delivery tariff display */}
        <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between font-label-md text-label-md text-secondary">
          <span>{isAr ? 'سعر الباك + التوصيل' : 'Pack + Frais de livraison'} ({selectedWilayaObj.name})</span>
          <span className="font-bold text-primary font-mono text-sm">{grandTotal.toLocaleString()} DZD</span>
        </div>

      </form>

    </section>
  );
}
