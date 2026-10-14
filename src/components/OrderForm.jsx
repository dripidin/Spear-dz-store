import React, { useState, useId, useEffect, useRef } from 'react';
import wilayas from '../../config/wilayas.json';
import communes from '../../config/communes.json';
import shippingRates from '../../config/shippingRates.json';

const BASE_BUNDLE_PRICE = 21900;

export default function OrderForm({
  locale = 'fr',
  onOrderSuccess,
  onSubmittingChange,
  formRef,
  onButtonVisibilityChange
}) {
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
  const [deliveryType, setDeliveryType] = useState(null); // Unselected by default, user must choose
  const [rates, setRates] = useState(shippingRates);
  const [tariffsLoaded, setTariffsLoaded] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorField, setErrorField] = useState('');
  const [shakeActive, setShakeActive] = useState(false);

  const submitBtnRef = useRef(null);
  const hasTrackedCheckout = useRef(false);

  // Monitor form submit button position to dock/hide floatingBar seamlessly
  useEffect(() => {
    const el = submitBtnRef.current;
    if (!el || !onButtonVisibilityChange) return;

    const checkVisibility = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      // Button is in view or scrolled past downwards
      const isAtOrPast = rect.top < vh;
      onButtonVisibilityChange(isAtOrPast);
    };

    let observer;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          const vh = window.innerHeight || document.documentElement.clientHeight || 800;
          const isAtOrPast = entry.isIntersecting || (entry.boundingClientRect.top < vh && entry.boundingClientRect.bottom <= 0);
          onButtonVisibilityChange(isAtOrPast);
        },
        { root: null, threshold: [0, 0.1, 0.5, 1.0] }
      );
      observer.observe(el);
    }

    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [onButtonVisibilityChange]);

  // Track InitiateCheckout on customer engagement with form
  const handleFieldFocus = () => {
    if (!hasTrackedCheckout.current) {
      hasTrackedCheckout.current = true;
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        try {
          const currentFee = (deliveryType && rates[String(wilayaCode)])
            ? (deliveryType === 'domicile' ? rates[String(wilayaCode)].home : rates[String(wilayaCode)].desk)
            : 0;
          window.fbq('track', 'InitiateCheckout', {
            content_name: 'PACK HIGH-TECH 5 EN 1',
            value: BASE_BUNDLE_PRICE + (currentFee || 0),
            currency: 'DZD'
          });
        } catch (e) {}
      }
    }
  };

  // Fetch live Ecotrack tariffs on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/delivery?action=tariffs')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.success) return;
        if (data.rates) {
          setRates(data.rates);
        } else if (Array.isArray(data.data)) {
          const map = {};
          data.data.forEach((item) => {
            const code = String(item.code || item.wilaya_code);
            map[code] = {
              home: item.homePrice || item.home_fee || 700,
              desk: item.deskPrice || item.desk_fee || 450,
              stopdeskAvailable: item.stopdeskAvailable !== false,
              time: item.estimatedTime || '24 - 48 H'
            };
          });
          setRates(map);
        }
        setTariffsLoaded(true);
      })
      .catch((err) => {
        console.warn('[OrderForm] Dynamic tariffs fetch fallback to local:', err.message);
      });
    return () => { isMounted = false; };
  }, []);

  // Validate Algerian phone
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  const isPhoneValid = /^0[567]\d{8}$/.test(cleanPhone);

  // Compute shipping fee based on Wilaya and Delivery Preference from Ecotrack rates
  const currentRate = rates[String(wilayaCode)] || shippingRates[String(wilayaCode)] || { home: 700, desk: 450, stopdeskAvailable: true, time: '24 - 48 H' };
  const isStopdeskSupported = Boolean(currentRate.desk && currentRate.desk > 0 && currentRate.stopdeskAvailable !== false);
  const shippingFee = deliveryType === 'domicile' ? currentRate.home : (deliveryType === 'stopdesk' ? (isStopdeskSupported ? currentRate.desk : currentRate.home) : 0);
  const grandTotal = BASE_BUNDLE_PRICE + (deliveryType ? shippingFee : 0);

  // Auto-switch to domicile if current wilaya does not support stopdesk
  useEffect(() => {
    if (deliveryType === 'stopdesk' && !isStopdeskSupported) {
      setDeliveryType('domicile');
    }
  }, [wilayaCode, isStopdeskSupported]);

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
    if (errorField === 'city' || errorField === 'wilaya') {
      setErrorField('');
      setErrorMsg('');
    }
  };

  const triggerAlert = (field, msg, elementId) => {
    setErrorField(field);
    setErrorMsg(msg);
    setShakeActive(true);
    setTimeout(() => setShakeActive(false), 550);
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof el.focus === 'function') el.focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return; // Strictly block duplicate clicks
    setErrorMsg('');
    setErrorField('');

    // 1. Behavioral Form Validation Gate
    if (!deliveryType) {
      triggerAlert(
        'deliveryType',
        isAr ? 'يرجى تحديد طريقة الاستلام أولاً (مكتب التوصيل أو التوصيل للمنزل)' : 'Veuillez choisir un mode de livraison (À Domicile ou Stop-Desk)',
        'deliveryTypeContainer'
      );
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      triggerAlert(
        'fullName',
        isAr ? 'يرجى إدخال الاسم واللقب الكامل (3 أحرف على الأقل)' : 'Veuillez entrer votre nom complet (au moins 3 caractères)',
        nameId
      );
      return;
    }

    if (!isPhoneValid) {
      triggerAlert(
        'phone',
        isAr ? 'يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456 أو 0660123456 أو 0770123456)' : 'Veuillez entrer un numéro de téléphone algérien valide (ex: 0550123456)',
        phoneId
      );
      return;
    }

    if (!city || !city.trim()) {
      triggerAlert(
        'city',
        isAr ? 'يرجى تحديد البلدية لتأكيد موقع التوصيل' : 'Veuillez sélectionner votre commune',
        cityId
      );
      return;
    }

    // 2. Set submission-in-progress state synchronously
    setIsSubmitting(true);
    if (onSubmittingChange) onSubmittingChange(true);

    const submitStartTime = Date.now();

    try {
      const payload = {
        fullName: fullName.trim(),
        phone: cleanPhone,
        wilaya: `${selectedWilayaObj.code} - ${selectedWilayaObj.name} (${selectedWilayaObj.nameAr})`,
        wilayaCode: selectedWilayaObj.code,
        commune: city.trim(),
        deliveryType: deliveryType === 'domicile' ? 'home' : 'stopdesk',
        shippingFee: deliveryType ? shippingFee : 0,
        totalPrice: grandTotal,
        notes: address.trim(),
        website_url: honeypot,
        quantity: 1,
        clientSubmissionTime: submitStartTime
      };

      // 7. Send the real order request immediately
      const res = await fetch('/api/send-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // 8. Wait for actual API response
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(isAr ? 'استجابة غير متوقعة من السيرفر. يرجى المحاولة مرة أخرى.' : 'Réponse serveur inattendue. Veuillez réessayer.');
      }

      // 9. Reliability Verification: Explicit success AND persisted order ID
      if (!res.ok || !data || data.success !== true || !data.orderId) {
        const errorDetail = (data && data.error)
          ? data.error
          : (isAr ? 'تعذر حفظ وتأكيد الطلب. يرجى المحاولة مرة أخرى.' : 'Échec de l\'enregistrement de votre commande. Veuillez réessayer.');
        throw new Error(errorDetail);
      }

      // 9b. Fire Meta Pixel Purchase event with matching eventID for server-side deduplication
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        try {
          window.fbq('track', 'Purchase', {
            content_name: 'PACK HIGH-TECH 5 EN 1',
            value: data.totalPrice || grandTotal,
            currency: 'DZD',
            num_items: 1
          }, { eventID: data.orderId });
        } catch (pixelErr) {
          console.warn('[Pixel] Purchase tracking warning:', pixelErr);
        }
      }

      // 10. For fast responses, maintain visual processing state for ~600-800ms
      const elapsed = Date.now() - submitStartTime;
      const MIN_DISPLAY_MS = 700;
      if (elapsed < MIN_DISPLAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS - elapsed));
      }

      // 11. Transition to confirmed thank-you modal
      if (onOrderSuccess) {
        onOrderSuccess(data.order || {
          orderId: data.orderId,
          fullName: payload.fullName,
          phone: payload.phone,
          wilaya: payload.wilaya,
          commune: payload.commune,
          deliveryType: payload.deliveryType,
          totalPrice: data.totalPrice || grandTotal
        });
      }
    } catch (err) {
      // 12. Preserve customer form values and show understandable error with retry
      setErrorMsg(err.message || (isAr ? 'حدث خطأ أثناء تأكيد الطلب. يرجى إعادة المحاولة.' : 'Une erreur est survenue lors de la validation. Veuillez réessayer.'));
    } finally {
      setIsSubmitting(false);
      if (onSubmittingChange) onSubmittingChange(false);
    }
  };

  return (
    <section
      aria-label="Commande"
      id="commander"
      className="px-margin-sm md:px-margin mt-2 flex flex-col gap-5"
      style={{ marginBottom: '40px' }}
    >
      
      {/* Title (requested headline) */}
      <h3 className="text-2xl sm:text-[28px] font-bold tracking-tight text-primary text-center -mt-6 mb-1 relative z-20">
        باك جامي يجي في بالك استغل الفرصة !
      </h3>

      {/* Swapped Bundle Price Div: directly bottom of the headline */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <span className="font-caption text-caption text-secondary font-medium">عرض النخبة 5 في 1 الفاخر</span>
        <span className="font-title-sm text-title-sm text-primary tracking-tight font-mono font-bold">21,900 DZD</span>
      </div>

      {/* Mode de réception / Segmented Control */}
      <div
        id="deliveryTypeContainer"
        className={`flex flex-col gap-2 p-2 rounded-2xl transition-all duration-300 ${
          errorField === 'deliveryType'
            ? 'border-2 border-red-500 bg-red-50/60 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]'
            : 'border border-transparent'
        } ${shakeActive && errorField === 'deliveryType' ? 'animate-shake' : ''}`}
      >
        <div className="flex items-center justify-between px-1">
          <label className="font-label-md text-label-md text-secondary font-medium">
            طريقة الاستلام (اختر نوع التوصيل) *
          </label>
          {!deliveryType && (
            <span className="text-[11px] text-amber-600 font-medium">
              * إجباري
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 p-1.5 bg-surface-container-low rounded-xl gap-2">
          {/* Tab Stopdesk */}
          <button
            type="button"
            id="tabStopdesk"
            disabled={!isStopdeskSupported}
            onClick={() => {
              if (!isStopdeskSupported) return;
              setDeliveryType('stopdesk');
              if (errorField === 'deliveryType') {
                setErrorField('');
                setErrorMsg('');
              }
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg font-label-md text-label-md transition-all duration-200 ${
              !isStopdeskSupported
                ? 'opacity-40 cursor-not-allowed bg-surface-container-lowest/40 text-secondary'
                : deliveryType === 'stopdesk'
                ? 'bg-black text-white shadow-sm ring-1 ring-black cursor-pointer'
                : 'bg-surface-container-lowest/80 text-secondary hover:text-primary hover:bg-surface-container cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[18px] ${deliveryType === 'stopdesk' ? 'text-white' : 'text-secondary'}`}>
                storefront
              </span>
              <span className="tracking-tight font-medium">مكتب التوصيل(Stopdesk)</span>
            </div>
            <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
              deliveryType === 'stopdesk' ? 'bg-white/20 text-white' : 'bg-surface-container text-primary'
            }`}>
              {isStopdeskSupported ? `+${currentRate.desk} د.ج` : 'غير متوفر'}
            </span>
          </button>

          {/* Tab Domicile */}
          <button
            type="button"
            id="tabDomicile"
            onClick={() => {
              setDeliveryType('domicile');
              if (errorField === 'deliveryType') {
                setErrorField('');
                setErrorMsg('');
              }
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg font-label-md text-label-md transition-all duration-200 cursor-pointer ${
              deliveryType === 'domicile'
                ? 'bg-black text-white shadow-sm ring-1 ring-black'
                : 'bg-surface-container-lowest/80 text-secondary hover:text-primary hover:bg-surface-container'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[18px] ${deliveryType === 'domicile' ? 'text-white' : 'text-secondary'}`}>
                home_pin
              </span>
              <span className="tracking-tight font-medium">توصيل للمنزل</span>
            </div>
            <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
              deliveryType === 'domicile' ? 'bg-white/20 text-white' : 'bg-surface-container text-primary'
            }`}>
              +{currentRate.home} د.ج
            </span>
          </button>
        </div>

        {/* Dynamic Delivery Hint */}
        <p className="font-caption text-caption px-1 transition-colors" id="deliveryHint">
          {deliveryType === 'stopdesk'
            ? `✅ تم اختيار استلام من مكتب التوزيع (+${currentRate.desk} د.ج) — مدة التوصيل: ${currentRate.time}`
            : deliveryType === 'domicile'
            ? `✅ تم اختيار التوصيل السريع للمنزل (+${currentRate.home} د.ج) — مدة التوصيل: ${currentRate.time}`
            : `⚠️ اختر نوع التوصيل أعلاه: استلام من المكتب (+${currentRate.desk} د.ج) أو توصيل للمنزل (+${currentRate.home} د.ج)`}
        </p>
      </div>

      {/* Behavioral Error Message Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
          <span className="text-base">⚠️</span>
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Minimalist Form */}
      <form
        ref={formRef}
        id="orderForm"
        onSubmit={handleSubmit}
        onFocus={handleFieldFocus}
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
            الاسم واللقب *
          </label>
          <div className="relative flex items-center">
            <input
              id={nameId}
              name="fullName"
              type="text"
              required
              placeholder="محمد بن علي"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errorField === 'fullName') {
                  setErrorField('');
                  setErrorMsg('');
                }
              }}
              className={`w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md placeholder-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all ${
                errorField === 'fullName'
                  ? 'border-2 border-red-500 bg-red-50/30 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
                  : ''
              } ${shakeActive && errorField === 'fullName' ? 'animate-shake' : ''}`}
            />
          </div>
        </div>

        {/* 2. Numéro de téléphone */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="font-label-md text-label-md text-secondary" htmlFor={phoneId}>
              رقم الهاتف *
            </label>
            {phone && (
              <span className={`font-caption text-caption ${isPhoneValid ? 'text-emerald-600 font-semibold' : 'text-amber-600'}`}>
                {isPhoneValid ? '✓ رقم صحيح' : '05 / 06 / 07... (10 أرقام)'}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id={phoneId}
              name="phoneNumber"
              type="tel"
              required
              placeholder="0550 12 34 56"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errorField === 'phone') {
                  setErrorField('');
                  setErrorMsg('');
                }
              }}
              className={`w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md placeholder-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all font-mono ${
                errorField === 'phone'
                  ? 'border-2 border-red-500 bg-red-50/30 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
                  : ''
              } ${shakeActive && errorField === 'phone' ? 'animate-shake' : ''}`}
            />
          </div>
        </div>

        {/* 3. Wilaya Selection (58 Wilayas from dzship - centered) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-secondary text-center" htmlFor={wilayaId}>
            الولاية (58 ولاية) *
          </label>
          <div className="relative flex items-center">
            <select
              id={wilayaId}
              name="wilaya"
              value={wilayaCode}
              onChange={handleWilayaChange}
              style={{ textAlign: 'center', textAlignLast: 'center' }}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md text-center focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all cursor-pointer appearance-none font-medium"
            >
              {wilayas.map((w) => (
                <option key={w.code} value={w.code} className="bg-white text-primary text-center" style={{ textAlign: 'center' }}>
                  {w.code} - {w.name} ({w.nameAr})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[20px] text-secondary absolute right-3 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* 4. Commune Dynamic Selector (centered) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-secondary text-center" htmlFor={cityId}>
            البلدية *
          </label>
          <div className="relative flex items-center">
            <select
              id={cityId}
              name="city"
              required
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (errorField === 'city') {
                  setErrorField('');
                  setErrorMsg('');
                }
              }}
              style={{ textAlign: 'center', textAlignLast: 'center' }}
              className={`w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md text-center focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all cursor-pointer appearance-none font-medium ${
                errorField === 'city'
                  ? 'border-2 border-red-500 bg-red-50/30 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
                  : ''
              } ${shakeActive && errorField === 'city' ? 'animate-shake' : ''}`}
            >
              <option value="" className="text-center" style={{ textAlign: 'center' }}>-- اختر البلدية --</option>
              {filteredCommunes.map((c, idx) => (
                <option key={idx} value={c.name} className="bg-white text-primary text-center" style={{ textAlign: 'center' }}>
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
            العنوان بالتفصيل (أو ملاحظة للتوصيل)
          </label>
          <div className="relative flex items-center">
            <input
              id={addressId}
              name="address"
              type="text"
              placeholder="الحي / رقم العمارة / الوقت المفضل"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-surface-container-low text-primary font-body-md text-body-md placeholder-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_#000000] transition-all"
            />
          </div>
        </div>

        {/* Subtotal & Delivery tariff display: Pack (21900 DA + Delivery Tarifs = Total) */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5 font-label-md text-label-md text-secondary">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary">
              {deliveryType
                ? `باك النخبة (21,900 د.ج + التوصيل ${shippingFee} د.ج = ${grandTotal.toLocaleString()} د.ج)`
                : `باك النخبة (21,900 د.ج + مصاريف التوصيل = الإجمالي)`}
            </span>
            <span className="font-bold text-primary font-mono text-base">
              {deliveryType ? `${grandTotal.toLocaleString()} DZD` : '21,900 DZD'}
            </span>
          </div>
          <div className="text-[11px] text-secondary flex items-center justify-between pt-1 border-t border-outline-variant/20">
            <span>
              {deliveryType
                ? `ولاية ${selectedWilayaObj.name} (${selectedWilayaObj.nameAr}) • ${deliveryType === 'stopdesk' ? 'استلام من المكتب' : 'توصيل للمنزل'}`
                : `ولاية ${selectedWilayaObj.name} (${selectedWilayaObj.nameAr}) • يرجى تحديد طريقة الاستلام أعلاه`}
            </span>
            <span className="font-mono text-primary font-medium">
              {deliveryType ? `+${shippingFee} DZD` : (isStopdeskSupported ? `من +${currentRate.desk} DZD` : `+${currentRate.home} DZD`)}
            </span>
          </div>
        </div>

        {/* Accessible Live Region for Screen Readers & Status Announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="checkoutStatusRegion"
        >
          {isSubmitting
            ? (isAr ? 'جارٍ تأكيد طلبك...' : 'Confirmation de votre commande...')
            : (errorMsg || '')}
        </div>

        {/* Understandable Error Banner with Safe Retry */}
        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-800 flex flex-col gap-2 transition-all shadow-sm"
          >
            <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
              <span className="text-red-600 font-bold text-base">⚠️</span>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="self-start text-xs font-bold text-red-700 hover:text-red-900 underline cursor-pointer py-1"
            >
              {isAr ? '↻ إعادة المحاولة الآن (مع الحفاظ على بياناتك)' : '↻ Réessayer maintenant (vos données sont conservées)'}
            </button>
          </div>
        )}

        {/* Primary Checkout Submit Button */}
        <button
          type="submit"
          id="orderFormSubmitBtn"
          ref={submitBtnRef}
          disabled={isSubmitting}
          className={`w-full h-12 rounded-full font-label-lg text-label-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer ${
            isSubmitting
              ? 'bg-neutral-800 text-white/90 cursor-wait'
              : 'bg-primary text-on-primary hover:opacity-95 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{isAr ? 'جارٍ تأكيد طلبك...' : 'Confirmation de votre commande...'}</span>
            </>
          ) : (
            <>
              <span>{isAr ? 'تأكيد الطلب الآن (الدفع عند الاستلام)' : 'Confirmer la commande (Paiement COD)'}</span>
              <span className="material-symbols-outlined text-[18px] rotate-180">
                arrow_forward
              </span>
            </>
          )}
        </button>

      </form>

    </section>
  );
}

