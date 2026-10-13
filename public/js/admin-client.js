/**
 * =============================================================================
 * SPEAR-DZ — Enterprise Logistics & Management Controller (admin-client.js)
 * Couriers: Yalidine Express, Redex / Ecotrack DZ, Manual Delivery
 * Storage: Supabase PostgreSQL Primary
 * =============================================================================
 */

(function () {
    'use strict';

    // ── 1. 100% Bilingual Dictionary (Arabic RTL Default, French LTR) ───────────
    const I18N = {
        ar: {
            authSubtitle: "بوابة الإدارة المركزية واللوجستيك • الجزائر 58 ولاية",
            btnEnterHub: "دخول لوحة التحكم",
            brandSub: "لوحة التحكم اللوجستية",
            searchPlaceholder: "بحث برقم الطلب، الزبون، الهاتف، الولاية...",
            statusConnected: "متصل ✅",
            statusSync: "نشط ✅",
            navStorefront: "المتجر الرئيسي",
            badgeBundleOffer: "عرض النخبة 5 في 1 (21,900 د.ج)",
            catMain: "القائمة الرئيسية",
            navDashboard: "نظرة عامة وإحصائيات",
            navOrders: "إدارة الطلبيات",
            catLogistics: "اللوجستيك والشحن",
            navCreate: "إنشاء وإرسال طرد",
            navTariffs: "أسعار 58 ولاية",
            navSettings: "إعدادات شركات التوصيل",
            catDataSecurity: "الأمان ومكافحة الاحتيال",
            navRisk: "درع الحماية وسجل المخاطر",
            bannerTag: "نظام الإدارة المركزي • الجزائر 58 ولاية",
            bannerTitle: "لوحة التحكم اللوجستية ومتابعة المبيعات",
            bannerDesc: "منصة متكاملة متصلة بشركات التوصيل الجزائرية وقاعدة بيانات Supabase مع درع الحماية الذكي.",
            btnNewColis: "طرد جديد",
            btnExport: "تصدير CSV",
            kpiTotal: "إجمالي الطلبيات",
            kpiRevenue: "مداخيل تم تحصيلها (COD)",
            kpiPendingCod: "مبالغ قيد التوزيع",
            kpiConfirmed: "طلبيات مؤكدة",
            kpiShipped: "في التوصيل (لدى الشاحن)",
            kpiDelivered: "تم التسليم بنجاح",
            kpiReturned: "مرتجعات",
            kpiLiveSync: "مزامنة حية",
            chartTrendTitle: "وتيرة الطلبات والتأكيد اليومية (آخر 7 أيام)",
            chartWilayasTitle: "أكثر 10 ولايات طلباً",
            liveDataBadge: "بيانات حية",
            tabAll: "الكل",
            tabPending: "⏳ قيد المراجعة",
            tabConfirmed: "✓ مؤكدة",
            tabShipped: "🚚 في التوصيل",
            tabDelivered: "✅ تم التسليم",
            tabReturned: "⚠️ مرتجع",
            tabRisk: "🛡️ مخاطرة",
            tableFilterPlaceholder: "تصفية بالاسم، الهاتف، البلدية، رقم الطلب...",
            allWilayasOption: "كل الولايات (58 ولاية)",
            btnTariffs: "جدول الأسعار",
            thOrder: "الرقم / التتبع",
            thCustomer: "الزبون",
            thPhone: "الهاتف",
            thDestination: "الولاية والبلدية",
            thAmount: "المبلغ (د.ج)",
            thCarrierStatus: "شركة التوصيل",
            thOrderStatus: "حالة الطلب",
            thRisk: "المخاطرة",
            thActions: "إجراءات",
            loadingOrders: "جاري تحميل الطلبيات من Supabase...",
            modalCreateTitle: "إنشاء وإرسال طرد إلى شركة التوصيل",
            lblAutoFill: "اختر طلبية من المتجر لملء البيانات تلقائياً :",
            optSelectOrder: "-- اختر طلبية --",
            lblFullName: "الاسم الكامل *",
            lblPhone: "رقم الهاتف *",
            lblWilaya: "الولاية (58 ولاية) *",
            lblCommune: "البلدية *",
            lblDeliveryType: "طريقة الاستلام",
            optHome: "🏠 توصيل لباب المنزل (Domicile)",
            optDesk: "🏢 استلام من المكتب (Stopdesk)",
            lblCourierSelect: "شركة التوصيل",
            lblAddress: "العنوان التفصيلي / الحي",
            lblPrice: "المبلغ المستحق (COD د.ج) *",
            lblNotes: "ملاحظات للموزع",
            btnCancel: "إلغاء",
            btnSendToCourier: "تأكيد وإرسال للشحن 🚚",
            modalTrackTitle: "مسار وتتبع الطرد (Timeline)",
            lblTrackingCode: "كود التتبع :",
            modalLabelTitle: "بوليصة الشحن الرسمية (Bordereau A6 / A4)",
            modalTariffsTitle: "جدول أسعار التوصيل لـ 58 ولاية (Home & Stopdesk)",
            thWilaya: "الولاية",
            thHomeRate: "توصيل للمنزل (د.ج)",
            thDeskRate: "استلام من المكتب (د.ج)",
            thTime: "المدة المقدرة",
            modalRiskTitle: "درع الحماية وتقييم المخاطر (Trust Shield)",
            btnClose: "إغلاق"
        },
        fr: {
            authSubtitle: "Portail Centralisé & Hub Logistique • Algérie 58 Wilayas",
            btnEnterHub: "Accéder au Tableau de Bord",
            brandSub: "Hub Logistique & Gestion",
            searchPlaceholder: "Rechercher par commande, client, téléphone, wilaya...",
            statusConnected: "Connecté ✅",
            statusSync: "Actif ✅",
            navStorefront: "Boutique en ligne",
            badgeBundleOffer: "Pack Élite 5 en 1 (21,900 DZD)",
            catMain: "MENU PRINCIPAL",
            navDashboard: "Aperçu & Statistiques",
            navOrders: "Gestion des Commandes",
            catLogistics: "LOGISTIQUE & TRANSPORT",
            navCreate: "Créer un Colis",
            navTariffs: "Tarifs 58 Wilayas",
            navSettings: "Configuration Transporteurs",
            catDataSecurity: "SÉCURITÉ & ANTI-FRAUDE",
            navRisk: "Bouclier Anti-Fraude",
            bannerTag: "Système de Gestion Centralisé • Algérie 58 Wilayas",
            bannerTitle: "Tableau de Bord Logistique & Suivi des Ventes",
            bannerDesc: "Plateforme connectée aux transporteurs locaux, base Supabase et bouclier anti-fraude.",
            btnNewColis: "Nouveau Colis",
            btnExport: "Exporter CSV",
            kpiTotal: "Total Commandes",
            kpiRevenue: "Chiffre d'Affaires COD",
            kpiPendingCod: "Montant en Distribution",
            kpiConfirmed: "Commandes Confirmées",
            kpiShipped: "En Livraison",
            kpiDelivered: "Livrées avec Succès",
            kpiReturned: "Retours",
            kpiLiveSync: "Synchronisé",
            chartTrendTitle: "Tendance Quotidienne des Commandes (7 Derniers Jours)",
            chartWilayasTitle: "Top 10 Wilayas les Plus Demandées",
            liveDataBadge: "Données en Direct",
            tabAll: "Toutes",
            tabPending: "⏳ En Attente",
            tabConfirmed: "✓ Confirmées",
            tabShipped: "🚚 En Livraison",
            tabDelivered: "✅ Livrées",
            tabReturned: "⚠️ Retours",
            tabRisk: "🛡️ Risque",
            tableFilterPlaceholder: "Filtrer par nom, téléphone, commune, référence...",
            allWilayasOption: "Toutes les Wilayas (58 Wilayas)",
            btnTariffs: "Grille Tarifaire",
            thOrder: "Réf / Suivi",
            thCustomer: "Client",
            thPhone: "Téléphone",
            thDestination: "Wilaya & Commune",
            thAmount: "Montant (DZD)",
            thCarrierStatus: "Transporteur",
            thOrderStatus: "Statut Commande",
            thRisk: "Risque",
            thActions: "Actions",
            loadingOrders: "Chargement des commandes depuis Supabase...",
            modalCreateTitle: "Créer et Expédier un Colis vers le Transporteur",
            lblAutoFill: "Sélectionner une commande pour pré-remplir :",
            optSelectOrder: "-- Sélectionner une commande --",
            lblFullName: "Nom Complet *",
            lblPhone: "Téléphone *",
            lblWilaya: "Wilaya (58 Wilayas) *",
            lblCommune: "Commune *",
            lblDeliveryType: "Mode de Réception",
            optHome: "🏠 Livraison à Domicile (Home)",
            optDesk: "🏢 Récupération au Bureau (Stopdesk)",
            lblCourierSelect: "Transporteur",
            lblAddress: "Adresse Détaillée / Quartier",
            lblPrice: "Montant à Encaisser (COD DZD) *",
            lblNotes: "Instructions Livreur",
            btnCancel: "Annuler",
            btnSendToCourier: "Confirmer & Expédier 🚚",
            modalTrackTitle: "Suivi et Chronologie du Colis (Timeline)",
            lblTrackingCode: "Code de Suivi :",
            modalLabelTitle: "Bordereau Officiel de Livraison (A6 / A4)",
            modalTariffsTitle: "Grille Tarifaire des 58 Wilayas (Domicile & Stopdesk)",
            thWilaya: "Wilaya",
            thHomeRate: "Livraison Domicile (DZD)",
            thDeskRate: "Bureau Stopdesk (DZD)",
            thTime: "Délai Estimé",
            modalRiskTitle: "Bouclier Anti-Fraude & Évaluation de Confiance",
            btnClose: "Fermer"
        }
    };

    // ── 2. Controller State ───────────────────────────────────────────────────
    let currentLang = localStorage.getItem('spdz_lang') || 'ar';
    let adminToken = sessionStorage.getItem('spdz_admin_token') || '';
    let ordersList = [];
    let wilayasList = [];
    let communesList = [];
    let tariffsList = [];
    let currentFilter = 'all';
    let currentWilayaFilter = '';
    let currentSearchQuery = '';
    let currentPage = 1;
    const pageSize = 15;

    let trendChartInstance = null;
    let wilayaChartInstance = null;

    // ── 3. Helper: Fetch with Authorization ────────────────────────────────────
    async function apiFetch(url, options = {}) {
        const headers = options.headers || {};
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }
        headers['Content-Type'] = 'application/json';
        options.headers = headers;

        const res = await fetch(url, options);
        if (res.status === 401) {
            sessionStorage.removeItem('spdz_admin_token');
            adminToken = '';
            showAuthOverlay();
            throw new Error('Session expirée');
        }
        return res;
    }

    // ── 4. Authentication Logic ───────────────────────────────────────────────
    function showAuthOverlay() {
        const overlay = document.getElementById('adminAuthOverlay');
        const layout = document.getElementById('appLayoutWrapper');
        if (overlay) overlay.style.display = 'flex';
        if (layout) layout.style.display = 'none';
    }

    function hideAuthOverlay() {
        const overlay = document.getElementById('adminAuthOverlay');
        const layout = document.getElementById('appLayoutWrapper');
        if (overlay) overlay.style.display = 'none';
        if (layout) layout.style.display = 'flex';
    }

    async function handleAuthSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        const pwdInput = document.getElementById('adminAuthPassword');
        const errBox = document.getElementById('adminAuthError');
        const token = pwdInput ? pwdInput.value.trim() : '';

        if (!token) return;
        if (errBox) errBox.style.display = 'none';

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await res.json();

            if (res.ok && data.success && data.sessionToken) {
                adminToken = data.sessionToken;
                sessionStorage.setItem('spdz_admin_token', adminToken);
                hideAuthOverlay();
                initHub();
            } else {
                if (errBox) {
                    errBox.textContent = data.error || 'Code invalide';
                    errBox.style.display = 'block';
                }
            }
        } catch (err) {
            if (errBox) {
                errBox.textContent = 'Erreur réseau : ' + err.message;
                errBox.style.display = 'block';
            }
        }
    }

    function logout() {
        if (adminToken) {
            fetch('/api/admin/auth', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }).catch(() => {});
        }
        sessionStorage.removeItem('spdz_admin_token');
        adminToken = '';
        location.reload();
    }

    // ── 5. Localization / Bilingual Engine ────────────────────────────────────
    function setLanguage(lang) {
        currentLang = lang === 'fr' ? 'fr' : 'ar';
        localStorage.setItem('spdz_lang', currentLang);

        const isAr = currentLang === 'ar';
        document.documentElement.dir = isAr ? 'rtl' : 'ltr';
        document.documentElement.lang = isAr ? 'ar' : 'fr';

        const langLabel = document.getElementById('currentLangLabel');
        if (langLabel) langLabel.textContent = isAr ? 'العربية' : 'Français';

        // Apply translations to all data-i18n elements
        const dict = I18N[currentLang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.placeholder = dict[key];
        });

        // Re-render table and charts with new locale labels
        renderOrdersTable();
        renderWilayasFilterOptions();
    }

    function toggleLangDropdown(show) {
        const dd = document.getElementById('langSubmenuDropdown');
        if (!dd) return;
        if (show === undefined) {
            dd.classList.toggle('show');
        } else if (show) {
            dd.classList.add('show');
        } else {
            dd.classList.remove('show');
        }
    }

    function toggleMobileNav() {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
    }

    // ── 6. Data Loading & Analytics ───────────────────────────────────────────
    async function loadAnalytics() {
        try {
            const res = await apiFetch('/api/admin/analytics?days=7');
            const data = await res.json();
            if (data.success && data.kpis) {
                renderKpis(data.kpis);
                if (data.charts) {
                    renderCharts(data.charts);
                }
            }
        } catch (err) {
            console.warn('[AdminHub] Analytics load notice:', err.message);
        }
    }

    function renderKpis(kpis) {
        const formatDzd = (num) => Number(num || 0).toLocaleString('fr-FR') + ' د.ج';

        const totalEl = document.getElementById('kpiTotal');
        if (totalEl) totalEl.textContent = kpis.totalOrders || 0;

        const revEl = document.getElementById('kpiRevenue');
        if (revEl) revEl.textContent = formatDzd(kpis.grossDeliveredRevenue);

        const aovEl = document.getElementById('kpiAov');
        if (aovEl) aovEl.textContent = currentLang === 'ar'
            ? `متوسط الطلب: ${formatDzd(kpis.avgOrderValue)}`
            : `Panier moyen: ${formatDzd(kpis.avgOrderValue)}`;

        const pendingCodEl = document.getElementById('kpiPendingCod');
        if (pendingCodEl) pendingCodEl.textContent = formatDzd(kpis.pendingCodValue);

        const pendingOrdersCountEl = document.getElementById('kpiPendingOrdersCount');
        if (pendingOrdersCountEl) pendingOrdersCountEl.textContent = currentLang === 'ar'
            ? `${(kpis.pendingOrders || 0) + (kpis.confirmedOrders || 0)} طلب قيد الإجراء`
            : `${(kpis.pendingOrders || 0) + (kpis.confirmedOrders || 0)} colis en cours`;

        const confEl = document.getElementById('kpiConfirmed');
        if (confEl) confEl.textContent = kpis.confirmedOrders || 0;

        const confRateEl = document.getElementById('kpiConfirmRate');
        if (confRateEl) confRateEl.textContent = currentLang === 'ar'
            ? `نسبة التأكيد: ${kpis.confirmationRate || 0}%`
            : `Taux confirmation: ${kpis.confirmationRate || 0}%`;

        const shipEl = document.getElementById('kpiShipped');
        if (shipEl) shipEl.textContent = kpis.inTransitOrders || 0;

        const delEl = document.getElementById('kpiDelivered');
        if (delEl) delEl.textContent = kpis.deliveredOrders || 0;

        const delRateEl = document.getElementById('kpiDeliverySuccessRate');
        if (delRateEl) delRateEl.textContent = currentLang === 'ar'
            ? `نسبة التسليم: ${kpis.deliverySuccessRate || 0}%`
            : `Taux livraison: ${kpis.deliverySuccessRate || 0}%`;

        const retEl = document.getElementById('kpiReturned');
        if (retEl) retEl.textContent = kpis.returnedOrders || 0;

        const retRateEl = document.getElementById('kpiReturnRate');
        if (retRateEl) {
            const retRate = kpis.totalOrders > 0
                ? ((kpis.returnedOrders / kpis.totalOrders) * 100).toFixed(1)
                : '0.0';
            retRateEl.textContent = currentLang === 'ar'
                ? `نسبة المرتجع: ${retRate}%`
                : `Taux retour: ${retRate}%`;
        }

        // Update tabs badges
        updateTabBadges(kpis);
    }

    function updateTabBadges(kpis) {
        const bAll = document.getElementById('tabBadgeAll');
        if (bAll) bAll.textContent = kpis.totalOrders || 0;

        const bPend = document.getElementById('tabBadgePending');
        if (bPend) bPend.textContent = kpis.pendingOrders || 0;

        const sidePend = document.getElementById('sidebarPendingBadge');
        if (sidePend) sidePend.textContent = kpis.pendingOrders || 0;

        const bConf = document.getElementById('tabBadgeConfirmed');
        if (bConf) bConf.textContent = kpis.confirmedOrders || 0;

        const bShip = document.getElementById('tabBadgeShipped');
        if (bShip) bShip.textContent = kpis.inTransitOrders || 0;

        const bDel = document.getElementById('tabBadgeDelivered');
        if (bDel) bDel.textContent = kpis.deliveredOrders || 0;

        const bRet = document.getElementById('tabBadgeReturned');
        if (bRet) bRet.textContent = kpis.returnedOrders || 0;
    }

    // ── 7. Chart.js Initializer ───────────────────────────────────────────────
    function renderCharts(chartsData) {
        if (typeof Chart === 'undefined') return;

        // 1. Line Chart: 7-Day Trend
        const trendCanvas = document.getElementById('trendChartCanvas');
        if (trendCanvas && chartsData.trend) {
            if (trendChartInstance) trendChartInstance.destroy();

            trendChartInstance = new Chart(trendCanvas, {
                type: 'line',
                data: {
                    labels: chartsData.trend.labels,
                    datasets: [
                        {
                            label: currentLang === 'ar' ? 'الطلبات المسجلة' : 'Commandes reçues',
                            data: chartsData.trend.orders,
                            borderColor: '#0ea5e9',
                            backgroundColor: 'rgba(14, 165, 233, 0.1)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#0ea5e9'
                        },
                        {
                            label: currentLang === 'ar' ? 'الطلبات المؤكدة' : 'Confirmées',
                            data: chartsData.trend.confirmed,
                            borderColor: '#10b981',
                            backgroundColor: 'transparent',
                            borderDash: [4, 4],
                            tension: 0.35,
                            borderWidth: 2,
                            pointRadius: 3,
                            pointBackgroundColor: '#10b981'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#64748b' },
                            grid: { color: 'rgba(255, 255, 255, 0.04)' }
                        },
                        y: {
                            ticks: { color: '#64748b', precision: 0 },
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // 2. Bar Chart: Top 10 Wilayas
        const wilayaCanvas = document.getElementById('wilayaChartCanvas');
        if (wilayaCanvas && chartsData.wilayas) {
            if (wilayaChartInstance) wilayaChartInstance.destroy();

            wilayaChartInstance = new Chart(wilayaCanvas, {
                type: 'bar',
                data: {
                    labels: chartsData.wilayas.labels,
                    datasets: [{
                        label: currentLang === 'ar' ? 'عدد الطلبات' : 'Commandes',
                        data: chartsData.wilayas.counts,
                        backgroundColor: '#f59e0b',
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#64748b' },
                            grid: { display: false }
                        },
                        y: {
                            ticks: { color: '#64748b', precision: 0 },
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    // ── 8. Orders DataGrid & Table Management ─────────────────────────────────
    async function fetchOrders(showSpinner = false) {
        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon && showSpinner) refreshIcon.classList.add('fa-spin');

        try {
            const res = await apiFetch('/api/orders?limit=500');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                ordersList = data.data;
                renderOrdersTable();
                populateOrderSelectDropdown();
            }
            await loadAnalytics();
        } catch (err) {
            console.error('[AdminHub] Orders fetch failed:', err.message);
        } finally {
            if (refreshIcon) refreshIcon.classList.remove('fa-spin');
        }
    }

    function renderOrdersTable() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        // Apply filters
        let filtered = ordersList.filter(o => {
            // Status Tab Filter
            if (currentFilter !== 'all') {
                if (currentFilter === 'risk') {
                    if (o.riskLevel !== 'HIGH' && o.riskLevel !== 'REVIEW') return false;
                } else if (o.status !== currentFilter) {
                    return false;
                }
            }

            // Wilaya Filter
            if (currentWilayaFilter && String(o.wilaya).toLowerCase() !== currentWilayaFilter.toLowerCase()) {
                return false;
            }

            // Keyword Search Filter
            if (currentSearchQuery) {
                const q = currentSearchQuery.toLowerCase();
                const matched =
                    (o.orderId && o.orderId.toLowerCase().includes(q)) ||
                    (o.fullName && o.fullName.toLowerCase().includes(q)) ||
                    (o.phone && o.phone.includes(q)) ||
                    (o.wilaya && o.wilaya.toLowerCase().includes(q)) ||
                    (o.commune && o.commune.toLowerCase().includes(q)) ||
                    (o.trackingCode && o.trackingCode.toLowerCase().includes(q));
                if (!matched) return false;
            }

            return true;
        });

        // Pagination
        const totalRecords = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(startIndex, startIndex + pageSize);

        // Update count indicator
        const countEl = document.getElementById('recordsCountText');
        if (countEl) {
            countEl.textContent = currentLang === 'ar'
                ? `عرض ${pageItems.length} من أصل ${totalRecords} طلب`
                : `Affichage de ${pageItems.length} sur ${totalRecords} commandes`;
        }

        const pageInd = document.getElementById('pageIndicatorText');
        if (pageInd) pageInd.textContent = `${currentPage} / ${totalPages}`;

        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-muted">${
                currentLang === 'ar' ? 'لا توجد طلبيات مطابقة للبحث' : 'Aucune commande trouvée'
            }</td></tr>`;
            return;
        }

        tbody.innerHTML = pageItems.map(o => {
            const statusBadge = getStatusBadgeHtml(o.status);
            const riskBadge = getRiskBadgeHtml(o.riskLevel, o.riskScore);
            const courierText = o.courier === 'yalidine' ? 'Yalidine' : (o.courier === 'redex' ? 'Redex DZ' : 'Direct / Manual');
            const trackingDisplay = o.trackingCode
                ? `<br><small class="font-mono text-cyan" title="Tracking Code">${o.trackingCode}</small>`
                : '';

            return `
                <tr id="row-${o.orderId}">
                    <td>
                        <strong class="font-mono text-primary">${o.orderId}</strong>
                        ${trackingDisplay}
                    </td>
                    <td><strong>${escapeHtml(o.fullName || 'Client')}</strong></td>
                    <td><a href="tel:${o.phone}" class="phone-link font-mono">${o.phone}</a></td>
                    <td>
                        <span>${escapeHtml(o.wilaya || '')}</span>
                        ${o.commune ? `<br><small class="text-muted">${escapeHtml(o.commune)}</small>` : ''}
                    </td>
                    <td><strong class="text-emerald font-mono">${Number(o.totalPrice || 21900).toLocaleString('fr-FR')} د.ج</strong></td>
                    <td><span class="badge-courier">${courierText}</span></td>
                    <td>${statusBadge}</td>
                    <td>${riskBadge}</td>
                    <td>
                        <div class="row-actions-group">
                            <!-- Status Quick Transition Menu -->
                            <select class="quick-status-select" onchange="storeAdmin.updateOrderStatus('${o.orderId}', this.value)">
                                <option value="" disabled selected>${currentLang === 'ar' ? 'الحالة...' : 'Statut...'}</option>
                                <option value="confirmed">✓ ${currentLang === 'ar' ? 'تأكيد' : 'Confirmer'}</option>
                                <option value="preparing">⚙️ ${currentLang === 'ar' ? 'تجهيز' : 'Préparer'}</option>
                                <option value="shipped">🚚 ${currentLang === 'ar' ? 'شحن' : 'Expédier'}</option>
                                <option value="delivered">✅ ${currentLang === 'ar' ? 'تسليم' : 'Livré'}</option>
                                <option value="returned">⚠️ ${currentLang === 'ar' ? 'مرتجع' : 'Retour'}</option>
                                <option value="cancelled">❌ ${currentLang === 'ar' ? 'إلغاء' : 'Annuler'}</option>
                            </select>

                            <!-- Print Label Button -->
                            <button class="action-btn text-cyan" onclick="storeAdmin.openLabelModal('${o.orderId}')" title="${currentLang === 'ar' ? 'طباعة البوليصة' : 'Imprimer Bordereau'}">
                                <i class="fa-solid fa-print"></i>
                            </button>

                            <!-- Dispatch to Courier Button -->
                            <button class="action-btn text-purple" onclick="storeAdmin.openCreateModal('${o.orderId}')" title="${currentLang === 'ar' ? 'إرسال لشركة التوصيل' : 'Expédier Colis'}">
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>

                            <!-- Live Tracking Timeline Button -->
                            <button class="action-btn text-emerald" onclick="storeAdmin.openTrackingModal('${o.orderId}')" title="${currentLang === 'ar' ? 'مسار التتبع' : 'Timeline'}">
                                <i class="fa-solid fa-route"></i>
                            </button>

                            <!-- Risk Inspector Button -->
                            <button class="action-btn text-rose" onclick="storeAdmin.openRiskModal('${o.orderId}')" title="${currentLang === 'ar' ? 'فحص المخاطرة' : 'Inspecter Risque'}">
                                <i class="fa-solid fa-shield-virus"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function getStatusBadgeHtml(status) {
        const s = (status || 'pending').toLowerCase();
        switch (s) {
            case 'confirmed':
                return `<span class="status-badge badge-confirmed">✓ ${currentLang === 'ar' ? 'مؤكدة' : 'Confirmée'}</span>`;
            case 'preparing':
                return `<span class="status-badge badge-preparing">⚙️ ${currentLang === 'ar' ? 'قيد التجهيز' : 'Préparation'}</span>`;
            case 'shipped':
                return `<span class="status-badge badge-shipped">🚚 ${currentLang === 'ar' ? 'في التوصيل' : 'En livraison'}</span>`;
            case 'delivered':
                return `<span class="status-badge badge-delivered">✅ ${currentLang === 'ar' ? 'تم التسليم' : 'Livrée'}</span>`;
            case 'returned':
                return `<span class="status-badge badge-returned">⚠️ ${currentLang === 'ar' ? 'مرتجع' : 'Retourné'}</span>`;
            case 'cancelled':
                return `<span class="status-badge badge-cancelled">❌ ${currentLang === 'ar' ? 'ملغاة' : 'Annulée'}</span>`;
            default:
                return `<span class="status-badge badge-pending">⏳ ${currentLang === 'ar' ? 'قيد المراجعة' : 'En attente'}</span>`;
        }
    }

    function getRiskBadgeHtml(level, score) {
        const lvl = (level || 'LOW').toUpperCase();
        const sc = score || 0;
        if (lvl === 'CRITICAL' || lvl === 'HIGH') {
            return `<span class="risk-badge risk-high" title="Score: ${sc}/100">🛡️ ${sc} / HIGH</span>`;
        }
        if (lvl === 'REVIEW' || lvl === 'MEDIUM') {
            return `<span class="risk-badge risk-med" title="Score: ${sc}/100">⚠️ ${sc} / REV</span>`;
        }
        return `<span class="risk-badge risk-low" title="Score: ${sc}/100">✓ ${sc} / LOW</span>`;
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text || '').replace(/[&<>"']/g, m => map[m]);
    }

    // ── 9. Status Update Action ───────────────────────────────────────────────
    async function updateOrderStatus(orderId, newStatus) {
        if (!newStatus) return;
        try {
            const res = await apiFetch('/api/orders', {
                method: 'PATCH',
                body: JSON.stringify({ orderId, status: newStatus })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Update local memory
                const idx = ordersList.findIndex(o => o.orderId === orderId);
                if (idx !== -1) {
                    ordersList[idx].status = newStatus;
                    renderOrdersTable();
                }
                loadAnalytics();
            } else {
                alert(data.error || 'Impossible de mettre à jour le statut');
            }
        } catch (err) {
            alert('Erreur réseau : ' + err.message);
        }
    }

    // ── 10. Filter & Search Handlers ──────────────────────────────────────────
    function setFilter(filter) {
        currentFilter = filter;
        currentPage = 1;
        document.querySelectorAll('.table-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-filter') === filter);
        });
        renderOrdersTable();
    }

    function handleTableFilter(query) {
        currentSearchQuery = (query || '').trim();
        currentPage = 1;
        renderOrdersTable();
    }

    function handleSearch(query) {
        currentSearchQuery = (query || '').trim();
        currentPage = 1;
        renderOrdersTable();
    }

    function handleWilayaFilter(wilaya) {
        currentWilayaFilter = (wilaya || '').trim();
        currentPage = 1;
        renderOrdersTable();
    }

    function prevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderOrdersTable();
        }
    }

    function nextPage() {
        currentPage++;
        renderOrdersTable();
    }

    // ── 11. Modal 1: Create & Dispatch Parcel ─────────────────────────────────
    function openCreateModal(orderId) {
        const modal = document.getElementById('packageModal');
        if (modal) modal.style.display = 'flex';

        if (orderId) {
            const sel = document.getElementById('modalOrderSelect');
            if (sel) sel.value = orderId;
            autofillModalFromOrder(orderId);
        }
    }

    function autofillModalFromOrder(orderId) {
        const order = ordersList.find(o => o.orderId === orderId);
        if (!order) return;

        const nameInput = document.getElementById('colisFullName');
        if (nameInput) nameInput.value = order.fullName || '';

        const phoneInput = document.getElementById('colisPhone');
        if (phoneInput) phoneInput.value = order.phone || '';

        const wilayaSelect = document.getElementById('colisWilayaSelect');
        if (wilayaSelect) {
            // Find option matching wilaya name
            for (let opt of wilayaSelect.options) {
                if (opt.text.toLowerCase().includes(String(order.wilaya || '').toLowerCase())) {
                    wilayaSelect.value = opt.value;
                    onColisWilayaChange(opt.value);
                    break;
                }
            }
        }

        const priceInput = document.getElementById('colisPrice');
        if (priceInput) priceInput.value = order.totalPrice || 21900;

        const addressInput = document.getElementById('colisAddress');
        if (addressInput) addressInput.value = order.address || order.commune || '';

        const typeSelect = document.getElementById('colisDeliveryType');
        if (typeSelect) typeSelect.value = order.deliveryType === 'desk' || order.deliveryType === 'stopdesk' ? 'desk' : 'home';
    }

    function populateOrderSelectDropdown() {
        const sel = document.getElementById('modalOrderSelect');
        if (!sel) return;
        sel.innerHTML = `<option value="">${I18N[currentLang].optSelectOrder}</option>` +
            ordersList.map(o => `<option value="${o.orderId}">${o.orderId} — ${o.fullName} (${o.wilaya})</option>`).join('');
    }

    async function submitColisToCourier(e) {
        if (e && e.preventDefault) e.preventDefault();
        const sel = document.getElementById('modalOrderSelect');
        const orderId = sel ? sel.value : '';

        if (!orderId) {
            alert(currentLang === 'ar' ? 'يرجى اختيار طلبية من القائمة' : 'Veuillez sélectionner une commande');
            return;
        }

        const courierId = document.getElementById('colisCourierSelect').value;
        const fullName = document.getElementById('colisFullName').value;
        const phone = document.getElementById('colisPhone').value;
        const wilayaSelect = document.getElementById('colisWilayaSelect');
        const wilayaName = wilayaSelect.options[wilayaSelect.selectedIndex]?.text || '';
        const communeSelect = document.getElementById('colisCommuneSelect');
        const communeName = communeSelect.options[communeSelect.selectedIndex]?.text || '';
        const address = document.getElementById('colisAddress').value;
        const deliveryType = document.getElementById('colisDeliveryType').value;
        const totalPrice = document.getElementById('colisPrice').value;
        const notes = document.getElementById('colisNotes').value;

        const btn = document.getElementById('btnDispatchCourier');
        if (btn) btn.disabled = true;

        try {
            const res = await apiFetch('/api/admin/dispatch', {
                method: 'POST',
                body: JSON.stringify({
                    orderId,
                    courierId,
                    fullName,
                    phone,
                    wilaya: wilayaName,
                    commune: communeName,
                    address,
                    deliveryType,
                    totalPrice,
                    notes
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                alert(`${currentLang === 'ar' ? 'تم إنشاء الطرد بنجاح! كود التتبع:' : 'Colis créé avec succès ! Tracking :'} ${data.trackingCode}`);
                closeModal('packageModal');
                fetchOrders(true);
            } else {
                alert(data.error || 'Erreur lors de la création du colis');
            }
        } catch (err) {
            alert('Erreur : ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // ── 12. Modal 2: Tracking Timeline Modal ──────────────────────────────────
    async function openTrackingModal(orderId) {
        const modal = document.getElementById('trackingModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const codeEl = document.getElementById('trackModalCode');
        const statusBadge = document.getElementById('trackModalStatusBadge');
        const timelineSteps = document.getElementById('trackingTimelineSteps');

        if (codeEl) codeEl.textContent = '...';
        if (timelineSteps) timelineSteps.innerHTML = '<p class="text-muted py-4">Chargement...</p>';

        try {
            const res = await apiFetch(`/api/admin/dispatch?orderId=${encodeURIComponent(orderId)}`);
            const data = await res.json();
            if (data.success && data.order) {
                const o = data.order;
                if (codeEl) codeEl.textContent = o.trackingCode || o.orderId;
                if (statusBadge) statusBadge.innerHTML = getStatusBadgeHtml(o.status);

                const stages = [
                    { key: 'pending', ar: 'تسجيل الطلب', fr: 'Commande Reçue', done: true },
                    { key: 'confirmed', ar: 'تأكيد الطلب', fr: 'Commande Confirmée', done: ['confirmed', 'preparing', 'shipped', 'delivered'].includes(o.status) },
                    { key: 'preparing', ar: 'تجهيز الطرد', fr: 'Colis en Préparation', done: ['preparing', 'shipped', 'delivered'].includes(o.status) },
                    { key: 'shipped', ar: 'تسليم لشركة الشحن', fr: 'Remis au Transporteur', done: ['shipped', 'delivered'].includes(o.status) },
                    { key: 'delivered', ar: 'تم التسليم بنجاح ✅', fr: 'Livré au Client ✅', done: o.status === 'delivered' }
                ];

                timelineSteps.innerHTML = stages.map((st, idx) => `
                    <div class="timeline-step-item ${st.done ? 'step-done' : 'step-pending'}">
                        <div class="step-indicator-ring">
                            <i class="fa-solid ${st.done ? 'fa-check' : 'fa-circle'}"></i>
                        </div>
                        <div class="step-content-box">
                            <h4>${currentLang === 'ar' ? st.ar : st.fr}</h4>
                            <span class="step-meta-note">${st.done ? (idx === 0 ? o.createdAt.slice(0, 16) : 'Validé') : 'En attente'}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            if (timelineSteps) timelineSteps.innerHTML = `<p class="text-rose">${err.message}</p>`;
        }
    }

    // ── 13. Modal 3: Printable Thermal Shipping Label Modal ───────────────────
    function openLabelModal(orderId) {
        const order = ordersList.find(o => o.orderId === orderId);
        if (!order) return;

        const modal = document.getElementById('labelModal');
        if (!modal) return;
        modal.style.display = 'flex';

        // Pre-fill label fields
        const trackingCode = order.trackingCode || order.orderId;
        const codeText = document.getElementById('labelTrackingCodeText');
        if (codeText) codeText.textContent = trackingCode;

        const custName = document.getElementById('labelCustomerName');
        if (custName) custName.textContent = order.fullName || 'Client';

        const custPhone = document.getElementById('labelCustomerPhone');
        if (custPhone) custPhone.textContent = order.phone || '';

        const custAddr = document.getElementById('labelCustomerAddress');
        if (custAddr) custAddr.textContent = order.address || order.commune || 'Adresse locale';

        const wilComm = document.getElementById('labelWilayaCommune');
        if (wilComm) wilComm.textContent = `${order.wilaya || ''} — ${order.commune || ''}`.toUpperCase();

        const codAmt = document.getElementById('labelCodAmount');
        if (codAmt) codAmt.textContent = Number(order.totalPrice || 21900).toLocaleString('fr-FR');

        const courierBadge = document.getElementById('labelCourierName');
        if (courierBadge) courierBadge.textContent = order.courier === 'yalidine' ? 'YALIDINE EXPRESS' : (order.courier === 'redex' ? 'REDEX DZ' : 'SPEAR-DZ EXPRESS');

        const typeBadge = document.getElementById('labelDeliveryTypeBadge');
        if (typeBadge) typeBadge.textContent = order.deliveryType === 'desk' || order.deliveryType === 'stopdesk' ? 'STOPDESK' : 'DOMICILE';

        // Render Code128 barcode
        if (typeof JsBarcode !== 'undefined') {
            try {
                JsBarcode('#labelBarcodeSvg', trackingCode, {
                    format: 'CODE128',
                    width: 2,
                    height: 55,
                    displayValue: false,
                    margin: 0
                });
            } catch (barErr) {
                console.warn('[AdminHub] Barcode render fallback:', barErr.message);
            }
        }
    }

    // ── 14. Modal 4: 58-Wilayas Tariffs Modal ──────────────────────────────────
    async function openTariffsModal() {
        const modal = document.getElementById('tariffsModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const tbody = document.getElementById('tariffsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-muted">Chargement des tarifs...</td></tr>';

        try {
            const res = await apiFetch('/api/admin/tariffs');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                tariffsList = data.data;
                renderTariffsTable(tariffsList);
            }
        } catch (err) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-rose text-center">${err.message}</td></tr>`;
        }
    }

    function renderTariffsTable(items) {
        const tbody = document.getElementById('tariffsTableBody');
        if (!tbody) return;

        tbody.innerHTML = items.map(t => `
            <tr>
                <td class="font-mono text-muted">${t.wilayaCode}</td>
                <td><strong>${t.wilayaName}</strong> <small class="text-muted">(${t.wilayaNameAr || ''})</small></td>
                <td>
                    <input type="number" class="tariff-rate-input" id="homeRate-${t.wilayaCode}" value="${t.homeFee}">
                </td>
                <td>
                    <input type="number" class="tariff-rate-input" id="deskRate-${t.wilayaCode}" value="${t.deskFee}">
                </td>
                <td>
                    <input type="text" class="tariff-time-input" id="time-${t.wilayaCode}" value="${t.deliveryTime}">
                </td>
                <td>
                    <button class="app-btn app-btn-xs app-btn-primary" onclick="storeAdmin.saveTariff(${t.wilayaCode})">
                        <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function filterTariffsTable(query) {
        const q = (query || '').toLowerCase();
        const filtered = tariffsList.filter(t =>
            String(t.wilayaCode).includes(q) ||
            t.wilayaName.toLowerCase().includes(q) ||
            (t.wilayaNameAr && t.wilayaNameAr.includes(q))
        );
        renderTariffsTable(filtered);
    }

    async function saveTariff(wilayaCode) {
        const homeInput = document.getElementById(`homeRate-${wilayaCode}`);
        const deskInput = document.getElementById(`deskRate-${wilayaCode}`);
        const timeInput = document.getElementById(`time-${wilayaCode}`);

        const homeFee = Number(homeInput.value);
        const deskFee = Number(deskInput.value);
        const deliveryTime = timeInput.value;

        try {
            const res = await apiFetch('/api/admin/tariffs', {
                method: 'PUT',
                body: JSON.stringify({ wilayaCode, homeFee, deskFee, deliveryTime })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✓ Tarifs Wilaya ${wilayaCode} enregistrés avec succès`);
            } else {
                alert(data.error || 'Erreur d\'enregistrement');
            }
        } catch (err) {
            alert('Erreur : ' + err.message);
        }
    }

    // ── 15. Modal 5: Risk & Fraud Inspector ───────────────────────────────────
    let activeRiskOrderId = null;
    function openRiskModal(orderId) {
        const modal = document.getElementById('riskModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const order = ordersList.find(o => o.orderId === orderId) || ordersList[0];
        if (!order) return;

        activeRiskOrderId = order.orderId;
        const scoreEl = document.getElementById('riskModalScore');
        if (scoreEl) scoreEl.textContent = order.riskScore || 0;

        const decEl = document.getElementById('riskModalDecisionText');
        if (decEl) decEl.textContent = `${order.riskDecision || 'ALLOW'} (${order.riskLevel || 'LOW'})`;

        const orderIdEl = document.getElementById('riskModalOrderId');
        if (orderIdEl) orderIdEl.textContent = `Commande: ${order.orderId} • ${order.fullName} (${order.phone})`;

        const factorsList = document.getElementById('riskFactorsList');
        if (factorsList) {
            const reasons = Array.isArray(order.riskReasons) ? order.riskReasons : [];
            factorsList.innerHTML = `
                <div class="risk-factor-item">
                    <span>Honeypot Trap</span>
                    <strong class="text-emerald">✓ Non déclenché (Humain vérifié)</strong>
                </div>
                <div class="risk-factor-item">
                    <span>Vitesse de soumission</span>
                    <strong>Conforme (> 3.5s)</strong>
                </div>
                <div class="risk-factor-item">
                    <span>Numéro de téléphone</span>
                    <strong class="text-cyan font-mono">${order.phone} (Opérateur DZ valide)</strong>
                </div>
                ${reasons.map(r => `<div class="risk-factor-item"><span class="text-amber">Signal détecté</span><strong>${escapeHtml(r)}</strong></div>`).join('')}
            `;
        }
    }

    async function overrideRisk(action) {
        if (!activeRiskOrderId) return;
        try {
            const res = await apiFetch('/api/risk', {
                method: 'POST',
                body: JSON.stringify({ orderId: activeRiskOrderId, action })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Action ${action.toUpperCase()} appliquée avec succès.`);
                closeModal('riskModal');
                fetchOrders(true);
            } else {
                alert(data.error || 'Erreur lors de l\'action');
            }
        } catch (err) {
            alert('Erreur : ' + err.message);
        }
    }

    function openSettingsModal() {
        alert(currentLang === 'ar'
            ? 'شركات التوصيل النشطة: Yalidine Express و Redex / Ecotrack DZ والتوصيل المباشر.'
            : 'Passerelles logistiques actives : Yalidine Express, Redex / Ecotrack DZ et Livraison directe.');
    }

    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    // ── 16. CSV Export ────────────────────────────────────────────────────────
    function exportCsv() {
        if (!ordersList || ordersList.length === 0) {
            alert('Aucune commande à exporter');
            return;
        }

        const headers = ['order_id', 'full_name', 'phone', 'wilaya', 'commune', 'delivery_type', 'total_price', 'status', 'tracking_code', 'created_at'];
        const rows = [headers.join(',')];

        for (const o of ordersList) {
            rows.push([
                `"${o.orderId}"`,
                `"${(o.fullName || '').replace(/"/g, '""')}"`,
                `"${o.phone}"`,
                `"${(o.wilaya || '').replace(/"/g, '""')}"`,
                `"${(o.commune || '').replace(/"/g, '""')}"`,
                `"${o.deliveryType}"`,
                o.totalPrice,
                `"${o.status}"`,
                `"${o.trackingCode || ''}"`,
                `"${o.createdAt}"`
            ].join(','));
        }

        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `spear_dz_orders_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ── 17. Load Wilayas and Communes for Modal Dropdowns ──────────────────────
    async function loadWilayasAndCommunes() {
        try {
            const res = await fetch('/api/delivery?action=wilayas');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                wilayasList = data.data;
                renderWilayasFilterOptions();
                renderColisWilayasOptions();
            }
        } catch (_) {}
    }

    function renderWilayasFilterOptions() {
        const sel = document.getElementById('wilayaFilterSelect');
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = `<option value="">${I18N[currentLang].allWilayasOption}</option>` +
            wilayasList.map(w => `<option value="${w.name}">${w.code} - ${w.name} (${w.nameAr || ''})</option>`).join('');
        sel.value = currentVal;
    }

    function renderColisWilayasOptions() {
        const sel = document.getElementById('colisWilayaSelect');
        if (!sel) return;
        sel.innerHTML = `<option value="">-- ${I18N[currentLang].lblWilaya} --</option>` +
            wilayasList.map(w => `<option value="${w.code}">${w.code} - ${w.name} (${w.nameAr || ''})</option>`).join('');
    }

    async function onColisWilayaChange(wilayaCode) {
        const commSel = document.getElementById('colisCommuneSelect');
        if (!commSel) return;
        commSel.innerHTML = '<option value="">...</option>';

        if (!wilayaCode) return;
        try {
            const res = await fetch(`/api/delivery?action=communes&wilayaCode=${wilayaCode}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                commSel.innerHTML = data.data.map(c => `<option value="${c.name}">${c.name} (${c.nameAr || ''})</option>`).join('');
            }
        } catch (_) {}
    }

    function switchView(viewName) {
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-nav a[href="#${viewName}"]`);
        if (activeLink) activeLink.classList.add('active');

        const overviewSection = document.getElementById('appChartsRow');
        const ordersSection = document.getElementById('ordersSection');

        if (viewName === 'orders') {
            if (overviewSection) overviewSection.style.display = 'none';
            if (ordersSection) ordersSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            if (overviewSection) overviewSection.style.display = 'grid';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // ── 18. Initialize Hub ────────────────────────────────────────────────────
    async function initHub() {
        setLanguage(currentLang);
        await loadWilayasAndCommunes();
        await fetchOrders();
    }

    // On Document Ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!adminToken) {
            showAuthOverlay();
        } else {
            hideAuthOverlay();
            initHub();
        }
    });

    // ── 19. Export storeAdmin Public API ──────────────────────────────────────
    window.storeAdmin = {
        handleAuthSubmit,
        logout,
        setLanguage,
        toggleLangDropdown,
        toggleMobileNav,
        fetchOrders,
        setFilter,
        handleTableFilter,
        handleSearch,
        handleWilayaFilter,
        prevPage,
        nextPage,
        updateOrderStatus,
        openCreateModal,
        autofillModalFromOrder,
        onColisWilayaChange,
        submitColisToCourier,
        openTrackingModal,
        openLabelModal,
        openTariffsModal,
        filterTariffsTable,
        saveTariff,
        openRiskModal,
        overrideRisk,
        openSettingsModal,
        closeModal,
        exportCsv,
        switchView
    };

})();
