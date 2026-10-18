/**
 * SPEAR-DZ — Storefront Client Engine (store-client.js)
 * Supports: Arabic (RTL) / French (LTR), 58 Wilayas + Dynamic Communes, COD Pricing, Anti-Bot Traps, and Meta Pixel Deduplication.
 */

(function () {
    'use strict';

    const BUNDLE_BASE_PRICE = 20400;
    const pageLoadTime = Date.now();

    const I18N = {
        ar: {
            topNotice: "توصيل سريع ومضمون لجميع الولايات الـ 58 • الدفع عند الاستلام بعد معاينة طلبك",
            brandTitle: "سبير ديزاد",
            btnOrderNav: "اطلب الآن",
            heroBadge: "العرض الأكثر طلباً • كمية محدودة",
            heroTitle: "باك التكنولوجيا الفاخر 5 في 1",
            heroSubtitle: "كل ما تحتاجه في حزمة تكنولوجية واحدة متكاملة: هاتف ذكي، سماعات لاسلكية، شاحن سريع، بنك طاقة أصلي، وكابل شحن فائق السرعة مع الضمان التام.",
            priceTag: "السعر الحصري للباك كاملاً",
            currency: "د.ج",
            heroBtn: "اطلب الآن والدفع عند الاستلام ⚡",
            pill1: "دفع آمن عند الاستلام",
            pill2: "معاينة المنتج قبل الدفع",
            pill3: "ضمان الجودة وخدمة ما بعد البيع",
            secComponentsTitle: "محتويات باقة 5 في 1 بالتفصيل",
            secOrderTitle: "إستمارة تأكيد الطلب السريع",
            secOrderSub: "يرجى ملء معلوماتك بدقة، وسيتصل بك فريقنا لتأكيد إرسال الطرد",
            lblFullName: "الاسم واللقب الكامل *",
            phFullName: "مثال: محمد بن علي",
            lblPhone: "رقم الهاتف المحمول (موبيليس، جيزي، أوريدو) *",
            phPhone: "05 / 06 / 07 XX XX XX XX",
            lblWilaya: "الولاية (58 ولاية) *",
            optSelectWilaya: "-- اختر ولايتك من القائمة --",
            lblCommune: "البلدية *",
            optSelectCommune: "-- اختر البلدية --",
            lblDeliveryType: "طريقة التوصيل المفضلة :",
            optHome: "🏠 توصيل لباب المنزل (Domicile)",
            optDesk: "🏢 استلام من مكتب التوصيل (Stop Desk)",
            lblNotes: "ملاحظات إضافية أو عنوان تفصيلي (اختياري) :",
            phNotes: "مثال: الحي، قرب المسجد أو عمارة رقم...",
            lblSubtotal: "سعر الباك (5 منتجات) :",
            lblShipping: "تكلفة التوصيل :",
            lblTotal: "المبلغ الإجمالي المستحق عند الاستلام :",
            btnSubmit: "تأكيد الطلب الآن ⚡",
            submitting: "جاري تأكيد وتسجيل الطلب...",
            modalSuccessTitle: "تهانينا! تم تسجيل طلبك بنجاح 🎉",
            modalSuccessDesc: "شكراً لثقتك بمتجر سبير ديزاد. سيتصل بك فريق خدمة العملاء هاتفياً خلال ساعات لتأكيد شحن طردك إلى باب منزلك.",
            modalOrderNum: "رقم الطلب الخاص بك :",
            modalBtnClose: "حسناً، فهمت",
            faqTitle: "الأسئلة الشائعة",
            errName: "يرجى إدخال اسمك الكامل بشكل صحيح",
            errPhone: "يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام",
            errWilaya: "يرجى اختيار ولاية التوصيل"
        },
        fr: {
            topNotice: "Livraison rapide dans les 58 Wilayas • Paiement à la livraison après vérification",
            brandTitle: "Spear-dz",
            btnOrderNav: "Commander",
            heroBadge: "Pack Exclusif • Stock Limité",
            heroTitle: "PACK HIGH-TECH 5 EN 1",
            heroSubtitle: "Tout votre équipement numérique en une seule offre : Smartphone 128Go/10Go, Casque P9 Hi-Fi, Chargeur 25W Type-C, Power Bank HOCO 10 000 mAh et Câble 3-en-1 avec garantie complète.",
            priceTag: "Prix du pack complet",
            currency: "DZD",
            heroBtn: "Commander maintenant (Paiement à la livraison) ⚡",
            pill1: "Paiement à la livraison",
            pill2: "Vérification du colis avant paiement",
            pill3: "Garantie & Support après-vente",
            secComponentsTitle: "Détails des 5 Composants Inclus",
            secOrderTitle: "Formulaire de Commande Express",
            secOrderSub: "Remplissez vos coordonnées, notre équipe vous contactera pour valider l'expédition",
            lblFullName: "Nom et Prénom *",
            phFullName: "Ex: Mohamed Benali",
            lblPhone: "Numéro de Téléphone (Mobilis, Djezzy, Ooredoo) *",
            phPhone: "05 / 06 / 07 XX XX XX XX",
            lblWilaya: "Wilaya (58 Wilayas) *",
            optSelectWilaya: "-- Sélectionnez votre wilaya --",
            lblCommune: "Commune *",
            optSelectCommune: "-- Sélectionnez votre commune --",
            lblDeliveryType: "Mode de livraison :",
            optHome: "🏠 Livraison à domicile (Domicile)",
            optDesk: "🏢 Récupération au bureau (Stop Desk)",
            lblNotes: "Adresse détaillée ou remarques (Optionnel) :",
            phNotes: "Ex: Quartier, Rue, Bâtiment...",
            lblSubtotal: "Prix du pack (5 produits) :",
            lblShipping: "Frais de livraison :",
            lblTotal: "Montant Total à Payer à la Livraison :",
            btnSubmit: "Confirmer la commande ⚡",
            submitting: "Enregistrement de votre commande...",
            modalSuccessTitle: "Félicitations ! Commande Confirmée 🎉",
            modalSuccessDesc: "Merci pour votre confiance. Notre service client vous appellera sous peu pour confirmer l'expédition de votre colis.",
            modalOrderNum: "Numéro de votre commande :",
            modalBtnClose: "Fermer",
            faqTitle: "Questions Fréquemment Posées",
            errName: "Veuillez entrer votre nom complet",
            errPhone: "Veuillez entrer un numéro de téléphone algérien valide (05, 06, 07)",
            errWilaya: "Veuillez sélectionner votre wilaya"
        }
    };

    let currentLang = 'ar';
    let wilayasList = [];
    let shippingRates = {};
    let selectedWilayaCode = null;
    let selectedDeliveryType = 'home';
    let currentShippingFee = 700;

    // ── Generate Unique Client Device ID for Risk Evaluation ──────────────────
    function getOrCreateDeviceId() {
        let did = localStorage.getItem('spdz_did');
        if (!did) {
            did = 'did_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            localStorage.setItem('spdz_did', did);
        }
        return did;
    }

    // ── Cookie Helpers for Meta CAPI Deduplication (_fbp, _fbc) ───────────────
    function getCookie(name) {
        const val = `; ${document.cookie}`;
        const parts = val.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // ── Initialize Wilayas & Rates ────────────────────────────────────────────
    async function loadWilayasAndRates() {
        try {
            const res = await fetch('/api/delivery?action=tariffs');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                wilayasList = json.data;
                wilayasList.forEach(w => {
                    shippingRates[w.code] = {
                        home: w.homePrice,
                        desk: w.deskPrice,
                        time: w.estimatedTime
                    };
                });
                populateWilayaSelect();
            }
        } catch (e) {
            console.warn('[StoreClient] Failed to load tariffs, using defaults:', e);
        }
    }

    function populateWilayaSelect() {
        const select = document.getElementById('wilayaSelect');
        if (!select) return;

        const t = I18N[currentLang];
        select.innerHTML = `<option value="" disabled selected>${t.optSelectWilaya}</option>`;

        wilayasList.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.code;
            opt.textContent = currentLang === 'ar' ? `${w.code} - ${w.nameAr}` : `${w.code} - ${w.name}`;
            select.appendChild(opt);
        });
    }

    async function loadCommunes(wilayaCode) {
        const communeSelect = document.getElementById('communeSelect');
        if (!communeSelect) return;

        const t = I18N[currentLang];
        communeSelect.innerHTML = `<option value="" disabled selected>${t.optSelectCommune}</option>`;

        try {
            const res = await fetch(`/api/delivery?action=communes&wilayaCode=${wilayaCode}`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                json.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = currentLang === 'ar' ? c.nameAr : c.name;
                    opt.textContent = currentLang === 'ar' ? c.nameAr : c.name;
                    communeSelect.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn('[StoreClient] Communes lookup error:', e);
        }
    }

    // ── Update Pricing Breakdown ──────────────────────────────────────────────
    function updatePricing() {
        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const totalEl = document.getElementById('summaryTotal');
        const homeFeeBadge = document.getElementById('homeFeeBadge');
        const deskFeeBadge = document.getElementById('deskFeeBadge');

        const rate = selectedWilayaCode && shippingRates[selectedWilayaCode]
            ? shippingRates[selectedWilayaCode]
            : { home: 700, desk: 450 };

        currentShippingFee = selectedDeliveryType === 'desk' ? rate.desk : rate.home;
        const grandTotal = BUNDLE_BASE_PRICE + currentShippingFee;

        const curr = I18N[currentLang].currency;

        if (subtotalEl) subtotalEl.textContent = `${BUNDLE_BASE_PRICE.toLocaleString('fr-FR')} ${curr}`;
        if (shippingEl) shippingEl.textContent = `${currentShippingFee.toLocaleString('fr-FR')} ${curr}`;
        if (totalEl) totalEl.textContent = `${grandTotal.toLocaleString('fr-FR')} ${curr}`;

        if (homeFeeBadge) homeFeeBadge.textContent = `${rate.home} ${curr}`;
        if (deskFeeBadge) deskFeeBadge.textContent = `${rate.desk} ${curr}`;
    }

    // ── Language Toggle Handler ───────────────────────────────────────────────
    window.toggleLanguage = function () {
        currentLang = currentLang === 'ar' ? 'fr' : 'ar';
        document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        applyTranslations();
        populateWilayaSelect();
        updatePricing();
    };

    function applyTranslations() {
        const t = I18N[currentLang];
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = t[key];
                } else {
                    el.textContent = t[key];
                }
            }
        });

        const langBtn = document.getElementById('langToggleBtn');
        if (langBtn) {
            langBtn.textContent = currentLang === 'ar' ? 'FR (Français)' : 'AR (العربية)';
        }
    }

    // ── Form Submission Handler ───────────────────────────────────────────────
    async function handleOrderSubmit(e) {
        e.preventDefault();

        const t = I18N[currentLang];
        const form = document.getElementById('orderForm');
        const submitBtn = document.getElementById('submitOrderBtn');
        const errorBox = document.getElementById('formErrorBox');

        errorBox.style.display = 'none';
        errorBox.textContent = '';

        const fullName = (document.getElementById('formFullName')?.value || '').trim();
        const phone = (document.getElementById('formPhone')?.value || '').trim();
        const wilayaSelect = document.getElementById('wilayaSelect');
        const communeSelect = document.getElementById('communeSelect');
        const address = (document.getElementById('formAddress')?.value || '').trim();
        const honeypot = (document.getElementById('website_url_hp')?.value || '').trim();

        if (!fullName || fullName.length < 2) {
            showError(t.errName);
            return;
        }

        const cleanPhone = phone.replace(/[\s\-\.]/g, '');
        const phoneRegex = /^0[567]\d{8}$/;
        if (!phoneRegex.test(cleanPhone)) {
            showError(t.errPhone);
            return;
        }

        if (!selectedWilayaCode) {
            showError(t.errWilaya);
            return;
        }

        const wilayaText = wilayaSelect.options[wilayaSelect.selectedIndex]?.textContent || '';
        const communeText = communeSelect?.value || '';

        // Form submission stopwatch
        const formDurationMs = Date.now() - pageLoadTime;
        const deviceId = getOrCreateDeviceId();
        const fbp = getCookie('_fbp');
        const fbc = getCookie('_fbc');

        // Fire Meta Pixel InitiateCheckout
        if (typeof fbq === 'function') {
            fbq('track', 'InitiateCheckout', {
                content_name: 'PACK HIGH-TECH 5 EN 1',
                value: BUNDLE_BASE_PRICE + currentShippingFee,
                currency: 'DZD'
            });
        }

        // Disable button while processing
        submitBtn.disabled = true;
        submitBtn.textContent = t.submitting;

        try {
            const res = await fetch('/api/send-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName,
                    phone: cleanPhone,
                    wilaya: wilayaText,
                    wilayaCode: selectedWilayaCode,
                    commune: communeText,
                    address,
                    deliveryType: selectedDeliveryType,
                    quantity: 1,
                    honeypot,
                    formDurationMs,
                    deviceId,
                    fbp,
                    fbc
                })
            });

            const json = await res.json();

            if (res.ok && json.success) {
                // Fire Browser Meta Pixel Purchase event with exact matching orderId for deduplication
                if (typeof fbq === 'function') {
                    fbq('track', 'Purchase', {
                        content_name: 'PACK HIGH-TECH 5 EN 1',
                        value: json.totalPrice || (BUNDLE_BASE_PRICE + currentShippingFee),
                        currency: 'DZD'
                    }, { eventID: json.orderId });
                }

                showSuccessModal(json.orderId);
                form.reset();
            } else {
                showError(json.error || 'تعذر تسجيل الطلب، يرجى إعادة المحاولة.');
            }
        } catch (err) {
            showError('حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة ثانية.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t.btnSubmit;
        }
    }

    function showError(msg) {
        const errorBox = document.getElementById('formErrorBox');
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
            errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function showSuccessModal(orderId) {
        const modal = document.getElementById('successModal');
        const orderIdEl = document.getElementById('modalOrderId');
        if (orderIdEl) orderIdEl.textContent = orderId;
        if (modal) modal.classList.add('active');
    }

    window.closeSuccessModal = function () {
        const modal = document.getElementById('successModal');
        if (modal) modal.classList.remove('active');
    };

    // ── Setup DOM Events on Load ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        loadWilayasAndRates();
        applyTranslations();
        updatePricing();

        const form = document.getElementById('orderForm');
        if (form) form.addEventListener('submit', handleOrderSubmit);

        const wilayaSelect = document.getElementById('wilayaSelect');
        if (wilayaSelect) {
            wilayaSelect.addEventListener('change', () => {
                selectedWilayaCode = parseInt(wilayaSelect.value, 10);
                loadCommunes(selectedWilayaCode);
                updatePricing();
            });
        }

        const choiceHome = document.getElementById('choiceHome');
        const choiceDesk = document.getElementById('choiceDesk');

        if (choiceHome && choiceDesk) {
            choiceHome.addEventListener('click', () => {
                selectedDeliveryType = 'home';
                choiceHome.classList.add('selected');
                choiceDesk.classList.remove('selected');
                updatePricing();
            });
            choiceDesk.addEventListener('click', () => {
                selectedDeliveryType = 'desk';
                choiceDesk.classList.add('selected');
                choiceHome.classList.remove('selected');
                updatePricing();
            });
        }

        // Thumb gallery clicking
        const thumbs = document.querySelectorAll('.thumb-item');
        const mainImg = document.getElementById('heroMainImg');
        thumbs.forEach(t => {
            t.addEventListener('click', () => {
                thumbs.forEach(th => th.classList.remove('active'));
                t.classList.add('active');
                const src = t.getAttribute('data-img');
                if (mainImg && src) mainImg.src = src;
            });
        });

        // FAQ accordion toggle
        document.querySelectorAll('.faq-question').forEach(q => {
            q.addEventListener('click', () => {
                const item = q.parentElement;
                item.classList.toggle('open');
            });
        });
    });

})();
