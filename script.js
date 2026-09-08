// ==========================================
// إعدادات الربط السحابي (Firebase Realtime Database)
// ==========================================
const firebaseConfig = {
    databaseURL: "https://velora-7e499-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref('velora_system_data');

const systemUsers = {
    admin: { name: "الآدمن الرئيسي", role: "Admin", pass: "admin123", access: ["dashboard", "pos-order", "inventory", "orders", "customers", "reports", "invoice-query", "manufacturing"] },
    dohaa: { name: "دعاء", role: "مساعد إدارة", pass: "dohaa123", access: ["pos-order", "inventory", "orders", "invoice-query", "electronic-invoice"] },
    mona: { name: "منى", role: "مساعد إدارة", pass: "mona123", access: ["pos-order", "inventory", "orders", "invoice-query", "electronic-invoice"] },
    poultry: { name: "فرع الدواجن", role: "مسؤول فرع الدواجن", pass: "poultry123", access: ["pos-order", "branch-purchase-order", "inventory", "orders", "invoice-query"] },
    gardens: { name: "فرع الحدايق", role: "مسؤول فرع الحدايق", pass: "gardens123", access: ["pos-order", "branch-purchase-order", "inventory", "orders", "invoice-query"] },
    nesma: { name: "نسمة", role: "صاحبة فرعي الدواجن والحدايق", pass: "nesma123", access: ["dashboard", "pos-order", "branch-purchase-order", "inventory", "orders", "invoice-query"] }
};

let currentUser = JSON.parse(sessionStorage.getItem('velora_current_user')) || null;

const defaultProducts = [
    { id: 1, name: "مجموعة العناية بالبشرة كافيار بلس", price: 390, stock: { admin: 15, poultry: 5, gardens: 5 } },
    { id: 2, name: "سيروم الهيالورونيك النقي", price: 240, stock: { admin: 10, poultry: 3, gardens: 3 } },
    { id: 3, name: "أحمر شفاه مطفي ثابت", price: 120, stock: { admin: 25, poultry: 10, gardens: 8 } }
];

let products = [];
let orders = [];
let purchaseOrders = []; 
let returnOrders = [];   
let customers = [];
let notifications = [];
let manufacturingRequests = [];
let stockAdjustments = [];

dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        products = data.products || defaultProducts;
        orders = data.orders || [];
        purchaseOrders = data.purchaseOrders || [];
        returnOrders = data.returnOrders || [];
        customers = data.customers || [];
        notifications = data.notifications || [];
        manufacturingRequests = data.manufacturingRequests || [];
        stockAdjustments = data.stockAdjustments || [];
    } else {
        products = defaultProducts;
        saveDataToCloud();
    }
    if(currentUser) {
        renderDashboard();
        renderOrders();
        renderProductsInventory();
        renderCustomers();
        renderReports();
        renderManufacturingRequests();
        renderNotifications();
    }
});

function saveDataToCloud() {
    // نستخدم update بدلاً من set حتى لا نحذف أي بيانات أخرى موجودة في Firebase.
    return dbRef.update({
        products: products,
        orders: orders,
        purchaseOrders: purchaseOrders,
        returnOrders: returnOrders,
        customers: customers,
        notifications: notifications,
        manufacturingRequests: manufacturingRequests,
        stockAdjustments: stockAdjustments
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    if(currentUser && systemUsers[currentUser.key]) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else {
        sessionStorage.removeItem('velora_current_user');
        currentUser = null;
    }
});

function initLogin() {
    document.getElementById('login-btn-action').addEventListener('click', (e) => {
        e.preventDefault();
        const userKey = document.getElementById('login-user-select').value;
        const passInput = document.getElementById('login-password').value;

        if(systemUsers[userKey] && systemUsers[userKey].pass === passInput) {
            currentUser = { key: userKey, ...systemUsers[userKey] };
            sessionStorage.setItem('velora_current_user', JSON.stringify(currentUser));
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            initApp();
        } else {
            alert('كلمة المرور غير صحيحة!');
        }
    });
}

function logout() {
    sessionStorage.removeItem('velora_current_user');
    currentUser = null;
    location.reload();
}

function initApp() {
    document.getElementById('current-user-name').innerText = currentUser.name;
    document.getElementById('current-user-role').innerText = currentUser.role;

    buildSidebarMenu();
    initTheme();
    initNotificationsUI();
    renderDashboard();
    renderOrders();
    renderProductsInventory();
    renderCustomers();
    renderReports();
    renderManufacturingRequests();
    initInvoiceQuery();
    initElectronicInvoice();
    
    if(currentUser.access.includes('pos-order')) {
        initPOSForm();
        initCustomerSearchAutoFill();
    }
    if(currentUser.access.includes('branch-purchase-order')) {
        initBranchPurchaseForm();
    }
}

function buildSidebarMenu() {
    const menuList = document.getElementById('sidebar-menu-list');
    const allowed = currentUser.access;

    let menuHTML = '';
    if(allowed.includes('dashboard')) menuHTML += `<li class="active" data-target="dashboard"><i class="fa-solid fa-chart-pie"></i> الرئيسية</li>`;
    if(allowed.includes('pos-order')) menuHTML += `<li data-target="pos-order"><i class="fa-solid fa-file-invoice-dollar"></i> إنشاء فاتورة (بيع)</li>`;
    if(allowed.includes('branch-purchase-order')) menuHTML += `<li data-target="branch-purchase-order"><i class="fa-solid fa-file-invoice"></i> إنشاء فاتورة (شراء)</li>`;
    if(allowed.includes('inventory')) menuHTML += `<li data-target="inventory"><i class="fa-solid fa-warehouse"></i> رصيد المخزن</li>`;
    if(allowed.includes('orders')) menuHTML += `<li data-target="orders"><i class="fa-solid fa-box-archive"></i> متابعة المبيعات والأوردرات</li>`;
    if(allowed.includes('invoice-query')) menuHTML += `<li data-target="invoice-query"><i class="fa-solid fa-magnifying-glass"></i> استعلام برقم الهاتف</li>`;
    if(allowed.includes('electronic-invoice')) menuHTML += `<li data-target="electronic-invoice"><i class="fa-solid fa-file-invoice"></i> طباعة الفاتورة الإلكترونية</li>`;
    if(allowed.includes('manufacturing')) menuHTML += `<li data-target="manufacturing"><i class="fa-solid fa-industry"></i> طلبات تحتاج للتصنيع</li>`;
    if(allowed.includes('customers')) menuHTML += `<li data-target="customers"><i class="fa-solid fa-users"></i> بيانات العملاء</li>`;
    if(allowed.includes('reports')) menuHTML += `<li data-target="reports"><i class="fa-solid fa-chart-line"></i> تقارير المبيعات</li>`;

    menuList.innerHTML = menuHTML;

    if (currentUser.key === 'nesma' || currentUser.key === 'poultry' || currentUser.key === 'gardens') {
        const firstTarget = currentUser.key === 'nesma' ? 'dashboard' : 'pos-order';
        switchView(firstTarget);
        document.querySelectorAll('.sidebar-menu li').forEach(i => {
            if(i.getAttribute('data-target') === firstTarget) i.classList.add('active');
            else i.classList.remove('active');
        });
    }

    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-menu li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            switchView(item.getAttribute('data-target'));
            if(window.innerWidth <= 992) document.getElementById('sidebar').classList.remove('show');
        });
    });

    document.getElementById('toggle-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('show'));
    document.getElementById('close-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.remove('show'));
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if(target) target.classList.add('active');
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if(localStorage.getItem('velora_dark') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const dark = document.body.classList.contains('dark-mode');
        localStorage.setItem('velora_dark', dark);
        themeToggle.innerHTML = dark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
}

function initNotificationsUI() {
    const bellBtn = document.getElementById('notif-bell-btn');
    const panel = document.getElementById('notifications-panel');

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        panel.classList.remove('show');
    });

    panel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    renderNotifications();
}

function renderNotifications() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notifications-list');
    if(!badge || !list) return;

    if(notifications.length > 0) {
        badge.style.display = 'flex';
        badge.innerText = notifications.length;
        list.innerHTML = notifications.map(n => `
            <div class="notification-item">
                <p>قامت <strong>${n.assistantName}</strong> بإنشاء أوردر:</p>
                <p style="margin-top:4px;">العميل: <strong>${n.customerName}</strong> (هاتف: ${n.phone})</p>
                <p>المنتج: <strong>${n.productName}</strong> (العدد: ${n.qty})</p>
                <p>الإجمالي: <strong style="color:var(--success);">${n.total} ج.م</strong></p>
            </div>
        `).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.85rem;">لا توجد إشعارات جديدة</div>';
    }
}

function clearNotifications() {
    notifications = [];
    saveDataToCloud();
    renderNotifications();
}

function getOrderNetAmount(o) {
    const total = Number(o.total || 0);
    const returned = Math.min(total, Math.max(0, Number(o.returnedAmount || 0)));
    return Math.max(0, total - returned);
}

function isDeliveredOrder(o) {
    // المرتجع الجزئي يفترض أن الفاتورة وصلت للعميل، ويُحسب بصافي قيمتها بعد خصم المرتجع.
    return ['تم التسليم', 'مرتجع جزئي'].includes(String(o.status || ''));
}

function isReturnedOrder(o) {
    return ['مرتجع', 'مرتجع جزئي'].includes(String(o.status || ''));
}

function isActiveOrder(o) {
    return !isDeliveredOrder(o) && !isReturnedOrder(o);
}

function getOrderSalesOwner(o) {
    // الفروع تعتمد على الفرع المخصص فعلياً للفـاتورة، مع fallback للفواتير القديمة.
    if (o.targetBranchKey === 'poultry' || o.deliveryType === 'poultry') return 'poultry';
    if (o.targetBranchKey === 'gardens' || o.deliveryType === 'gardens') return 'gardens';
    if (o.createdByKey === 'dohaa' || o.createdBy === 'دعاء') return 'dohaa';
    if (o.createdByKey === 'mona' || o.createdBy === 'منى') return 'mona';
    return null;
}

function calculateDeliveredSales(ownerKey = null) {
    return orders.reduce((sum, o) => {
        if (!isDeliveredOrder(o)) return sum;
        if (ownerKey && getOrderSalesOwner(o) !== ownerKey) return sum;
        return sum + getOrderNetAmount(o);
    }, 0);
}

function renderDashboard() {
    if(!currentUser.access.includes('dashboard')) return;

    const activeOrders = orders.filter(isActiveOrder);
    const preparedOrders = orders.filter(o => ['تم التجهيز', 'تم الشحن', 'تم التسليم', 'مرتجع جزئي'].includes(String(o.status || '')) && !['مرتجع'].includes(String(o.status || '')));
    const deliveredOrders = orders.filter(isDeliveredOrder);
    const generalSales = calculateDeliveredSales();
    const supplyOrders = purchaseOrders.filter(po => po.status !== 'تم التسليم' && po.status !== 'ملغى');
    const supplyPoultry = purchaseOrders.filter(po => po.branchKey === 'poultry' && po.status !== 'تم التسليم' && po.status !== 'ملغى');
    const supplyGardens = purchaseOrders.filter(po => po.branchKey === 'gardens' && po.status !== 'تم التسليم' && po.status !== 'ملغى');
    const poultryTotal = calculateDeliveredSales('poultry');
    const gardensTotal = calculateDeliveredSales('gardens');
    const dohaaTotal = calculateDeliveredSales('dohaa');
    const monaTotal = calculateDeliveredSales('mona');

    const statsEl = document.getElementById('dashboard-stats');
    if(statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-shopping-bag"></i></div><div class="info"><span>إجمالي الطلبات النشطة</span><h3>${activeOrders.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-box-open"></i></div><div class="info"><span>الطلبات التي تم تجهيزها</span><h3>${preparedOrders.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-truck-fast"></i></div><div class="info"><span>الطلبات التي تم تسليمها</span><h3>${deliveredOrders.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-money-bill-wave"></i></div><div class="info"><span>إجمالي المبيعات العامة</span><h3>${generalSales.toFixed(2)} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-store"></i></div><div class="info"><span>مبيعات فرع الدواجن</span><h3>${poultryTotal.toFixed(2)} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-boxes-stacked"></i></div><div class="info"><span>طلب توريد مخزون - الدواجن</span><h3>${supplyPoultry.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-store"></i></div><div class="info"><span>مبيعات فرع الحدايق</span><h3>${gardensTotal.toFixed(2)} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-boxes-stacked"></i></div><div class="info"><span>طلب توريد مخزون - الحدايق</span><h3>${supplyGardens.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-boxes-stacked"></i></div><div class="info"><span>إجمالي طلبات توريد المخزون النشطة</span><h3>${supplyOrders.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-user-tie"></i></div><div class="info"><span>مبيعات دعاء</span><h3>${dohaaTotal.toFixed(2)} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-user-tie"></i></div><div class="info"><span>مبيعات منى</span><h3>${monaTotal.toFixed(2)} ج.م</h3></div></div>
        `;
    }
}

let isPosInitialized = false;
let saleItems = [];

function normalizeProductStock(p) {
    if (typeof p.stock !== 'object' || p.stock === null) {
        p.stock = { admin: Number(p.stock || 0), poultry: 0, gardens: 0 };
    }
    p.stock.admin = Number(p.stock.admin || 0);
    p.stock.poultry = Number(p.stock.poultry || 0);
    p.stock.gardens = Number(p.stock.gardens || 0);
    p.stock.nesma = Number(p.stock.nesma || 0);
    return p;
}

function getDeliveryMeta() {
    const type = document.getElementById('order-delivery-type')?.value || '';
    if (type === 'poultry') return { type, stockKey: 'poultry', branchKey: 'poultry', label: 'فرع الدواجن', status: 'في انتظار تأكيد فرع الدواجن' };
    if (type === 'gardens') return { type, stockKey: 'gardens', branchKey: 'gardens', label: 'فرع الحدايق', status: 'في انتظار تأكيد فرع الحدايق' };
    if (type === 'cairo') return { type, stockKey: 'admin', branchKey: null, label: 'شحن داخل القاهرة', status: 'في انتظار تأكيد الآدمن الرئيسي' };
    if (type === 'provinces') return { type, stockKey: 'admin', branchKey: null, label: 'محافظات', status: 'في انتظار تأكيد الآدمن الرئيسي' };
    return { type: '', stockKey: null, branchKey: null, label: '', status: '' };
}

function getStockForKey(product, key) {
    normalizeProductStock(product);
    return Number(product.stock[key] || 0);
}

function getItemList(order) {
    if (Array.isArray(order.items) && order.items.length) return order.items;
    if (order.productId != null) return [{ productId: order.productId, productName: order.productName, price: Number(order.price || 0), qty: Number(order.qty || 0) }];
    return [];
}

function renderSaleItems() {
    const wrap = document.getElementById('sale-items-preview');
    if (!wrap) return;
    if (!saleItems.length) {
        wrap.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);">لم تتم إضافة منتجات للفاتورة بعد.</div>';
        const totalEl = document.getElementById('calc-grand-total'); if (totalEl) totalEl.innerText = '0';
        return;
    }
    const shipping = parseFloat(document.getElementById('order-shipping')?.value) || 0;
    const itemsTotal = saleItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
    const total = itemsTotal + shipping;
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th><th></th></tr></thead><tbody>${saleItems.map((item, i) => `
        <tr><td>${item.productName}</td><td>${item.price} ج.م</td><td>${item.qty}</td><td>${item.price * item.qty} ج.م</td><td><button type="button" class="btn-danger" onclick="removeSaleItem(${i})">حذف</button></td></tr>`).join('')}</tbody></table>`;
    const totalEl = document.getElementById('calc-grand-total'); if (totalEl) totalEl.innerText = total;
}

function removeSaleItem(index) { saleItems.splice(index, 1); renderSaleItems(); }

function initPOSForm() {
    const productSelect = document.getElementById('order-product-select');
    const searchProdInput = document.getElementById('product-filter-search');
    const shippingInput = document.getElementById('order-shipping');
    const deliverySelect = document.getElementById('order-delivery-type');
    const qtyInput = document.getElementById('order-qty');
    const addItemBtn = document.getElementById('add-order-item-btn');
    if (!productSelect) return;

    const updateProductDropdown = (filter = '') => {
        const meta = getDeliveryMeta();
        if (!meta.stockKey) {
            productSelect.innerHTML = '<option value="">-- اختر نوع التسليم أولاً --</option>';
            renderSaleItems();
            return;
        }
        const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        productSelect.innerHTML = filtered.map(p => {
            const stock = getStockForKey(p, meta.stockKey);
            return `<option value="${p.id}" data-price="${p.price}" data-stock="${stock}">${p.name} - السعر: ${p.price} ج.م - رصيد ${meta.label}: ${stock}</option>`;
        }).join('') || '<option value="">لا توجد منتجات</option>';
        renderSaleItems();
    };

    if (!isPosInitialized) {
        if (searchProdInput) searchProdInput.addEventListener('input', e => updateProductDropdown(e.target.value));
        if (deliverySelect) deliverySelect.addEventListener('change', () => updateProductDropdown(searchProdInput?.value || ''));
        if (shippingInput) shippingInput.addEventListener('input', renderSaleItems);
        if (addItemBtn) addItemBtn.addEventListener('click', e => {
            e.preventDefault();
            const meta = getDeliveryMeta();
            if (!meta.stockKey) { alert('اختر نوع التسليم أولاً حتى يظهر مخزن الخصم الصحيح.'); return; }
            const prod = products.find(p => p.id == productSelect.value);
            const qty = parseInt(qtyInput.value) || 0;
            if (!prod || qty <= 0) { alert('اختر منتجاً وأدخل كمية صحيحة.'); return; }
            normalizeProductStock(prod);
            const available = getStockForKey(prod, meta.stockKey);
            const existing = saleItems.find(x => x.productId == prod.id);
            const wanted = (existing ? existing.qty : 0) + qty;
            if (available < wanted) {
                alert(`الرصيد الفعلي في ${meta.label} هو ${available} قطعة. يمكنك تسجيل الفاتورة حتى لو الرصيد غير كافٍ، وسيتم تسجيل الناقص كـ مطلوب تصنيع.`);
            }
            if (existing) existing.qty += qty;
            else saleItems.push({ productId: prod.id, productName: prod.name, price: Number(prod.price), qty });
            qtyInput.value = '1';
            renderSaleItems();
        });

        const submitBtn = document.getElementById('submit-order-btn');
        if (submitBtn) submitBtn.addEventListener('click', async e => {
            e.preventDefault(); e.stopPropagation();
            const customerName = document.getElementById('cust-name').value.trim();
            const phone = document.getElementById('cust-phone').value.trim();
            const address = document.getElementById('cust-address').value.trim();
            const meta = getDeliveryMeta();
            if (!customerName || !phone || !address) { alert('يرجى ملء بيانات العميل الأساسية.'); return; }
            if (!meta.stockKey) { alert('اختر نوع التسليم أولاً.'); return; }
            if (!saleItems.length) { alert('أضف منتجاً واحداً على الأقل إلى الفاتورة.'); return; }

            const shipping = parseFloat(shippingInput?.value) || 0;
            const itemsTotal = saleItems.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
            const total = itemsTotal + shipping;
            const state = document.getElementById('cust-state').value;
            const items = saleItems.map(x => ({...x, qty: Number(x.qty), price: Number(x.price)}));

            // منع الضغط المتكرر أو تسجيل نفس الفاتورة مرتين من جهازين مختلفين.
            // البصمة تعتمد على بيانات الفاتورة نفسها، مع الاحتفاظ بكل الفواتير والعملاء القديمة.
            const orderFingerprint = [
                String(phone).replace(/\D/g, ''),
                String(meta.type || ''),
                String(total),
                items.map(i => `${i.productId}:${Number(i.qty)}:${Number(i.price)}`).sort().join('|')
            ].join('||');
            const duplicateOrder = orders.find(o => {
                if (!o || ['مرتجع', 'مرتجع جزئي', 'ملغي'].includes(String(o.status || ''))) return false;
                if (o.orderFingerprint) return o.orderFingerprint === orderFingerprint;
                const oldItems = getItemList(o).map(i => `${i.productId}:${Number(i.qty)}:${Number(i.price)}`).sort().join('|');
                return String(o.phone || '').replace(/\D/g, '') === String(phone).replace(/\D/g, '')
                    && String(o.deliveryType || '') === String(meta.type || '')
                    && Number(o.total || 0) === Number(total)
                    && oldItems === items.map(i => `${i.productId}:${Number(i.qty)}:${Number(i.price)}`).sort().join('|');
            });
            if (duplicateOrder) {
                alert(`الفاتورة موجودة بالفعل برقم #${duplicateOrder.id} وتم تسجيلها بواسطة ${duplicateOrder.createdBy || 'أحد المستخدمين'}.\nلن يتم إنشاء فاتورة مكررة.`);
                return;
            }

            // رقم فريد لا يعتمد على orders.length حتى لا يتكرر عند عمل فاتورتين في نفس الوقت.
            const newId = `V-${Date.now()}-${currentUser.key}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

            // تسجيل العميل كما كان النظام الأصلي، من غير حذف البيانات القديمة.
            const existingCust = customers.find(c => c.phone === phone);
            if (existingCust) { existingCust.ordersCount = Number(existingCust.ordersCount || 0) + 1; existingCust.totalSpent = Number(existingCust.totalSpent || 0) + total; }
            else customers.push({ name: customerName, phone, state, address, ordersCount: 1, totalSpent: total });

            const order = {
                id: newId, customerName, phone, state, address,
                items, productId: items[0].productId, productName: items[0].productName, price: items[0].price, qty: items[0].qty,
                shipping, total, deliveryType: meta.type, deliveryLabel: meta.label, stockKeyUsed: meta.stockKey, targetBranchKey: meta.branchKey,
                status: meta.status, createdBy: currentUser.name, createdByKey: currentUser.key, createdAt: Date.now(),
                orderFingerprint,
                stockDeducted: false, priceHiddenForNonAdmin: true
            };
            orders.unshift(order);

            // لا يوجد خصم هنا إطلاقاً. نسجل فقط أي عجز حقيقي كمطلوب تصنيع.
            const createdMfg = createManufacturingRequestsForOrder(order, false);
            if (createdMfg) order.status = 'في انتظار التصنيع';
            if (currentUser.key !== 'admin') {
                notifications.unshift({ type:'sale', assistantName: currentUser.name, customerName, phone, productName: items.map(i=>i.productName).join(' + '), qty: items.reduce((s,i)=>s+i.qty,0), total, deliveryLabel: meta.label, time: new Date().toLocaleString('ar-EG') });
            }
            await saveDataToCloud();
            saleItems = [];
            document.getElementById('cust-name').value = '';
            document.getElementById('cust-phone').value = '';
            document.getElementById('cust-address').value = '';
            document.getElementById('order-qty').value = '1';
            if (shippingInput) shippingInput.value = '0';
            renderSaleItems();
            alert(`تم إنشاء الفاتورة #${newId} بنجاح. لم يتم خصم أي رصيد بعد؛ ستذهب للجهة المختصة للتأكيد.`);
        });
        isPosInitialized = true;
    }
    updateProductDropdown(searchProdInput?.value || '');
}

let isPurchaseInitialized = false;
function initBranchPurchaseForm() {
    const productSelect = document.getElementById('purchase-product-select');
    const searchProdInput = document.getElementById('purchase-product-filter-search');
    const qtyInput = document.getElementById('purchase-qty');
    const submitBtn = document.getElementById('submit-purchase-order-btn');

    if(!productSelect) return;

    const updateProductDropdown = (filter = "") => {
        const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        productSelect.innerHTML = filtered.map(p => {
            const adminStock = (p.stock && typeof p.stock === 'object') ? (p.stock.admin || 0) : (p.stock || 0);
            return `<option value="${p.id}" data-price="${p.price}" data-stock="${adminStock}">${p.name} - السعر: ${p.price} ج.م (رصيد الآدمن المتاح: ${adminStock})</option>`;
        }).join('');
    };

    if(!isPurchaseInitialized) {
        if(searchProdInput) {
            searchProdInput.addEventListener('input', (e) => updateProductDropdown(e.target.value));
        }

        if(submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const prodId = productSelect.value;
                const qty = parseInt(qtyInput.value) || 0;

                if(qty <= 0) {
                    alert('يرجى إدخال كمية صحيحة مطلوبة!');
                    return;
                }

                const prod = products.find(p => p.id == prodId);
                if(!prod) return;

                if(typeof prod.stock !== 'object') {
                    prod.stock = { admin: prod.stock || 0, poultry: 0, gardens: 0 };
                }

                if(prod.stock.admin < qty) {
                    alert(`عذراً، رصيد الآدمن الحالي (${prod.stock.admin}) لا يكفي للكمية المطلوبة (${qty})!`);
                    return;
                }

                const purchaseId = "PUR-" + Date.now().toString().slice(-5);
                const totalPrice = prod.price * qty;
                
                purchaseOrders.unshift({
                    id: purchaseId,
                    branchKey: currentUser.key,
                    branchName: currentUser.name,
                    productId: prod.id,
                    productName: prod.name,
                    price: prod.price,
                    qty: qty,
                    total: totalPrice,
                    status: "جديد",
                    type: "purchase"
                });

                saveDataToCloud();
                qtyInput.value = '1';
                alert(`تم إنشاء فاتورة الشراء بنجاح برقم #${purchaseId} بقيمة إجمالية ${totalPrice} ج.م (${qty} قطعه)، في انتظار تأكيد وتوصيل الآدمن!`);
            });
        }
        isPurchaseInitialized = true;
    }

    updateProductDropdown();
}

function initCustomerSearchAutoFill() {
    const searchInput = document.getElementById('search-old-customer');
    if(!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if(!val) return;
        const found = customers.find(c => c.phone.includes(val) || c.name.toLowerCase().includes(val));
        if(found) {
            document.getElementById('cust-name').value = found.name;
            document.getElementById('cust-phone').value = found.phone;
            if(document.getElementById('cust-address') && found.address) document.getElementById('cust-address').value = found.address;
        }
    });
}

function renderProductsInventory() {
    const tbody = document.getElementById('inventory-table-body');
    const inventoryView = document.getElementById('inventory');
    if(!tbody || !inventoryView) return;

    let adminAddContainer = document.getElementById('admin-add-product-container');
    if (!adminAddContainer) {
        adminAddContainer = document.createElement('div');
        adminAddContainer.id = 'admin-add-product-container';
        adminAddContainer.style.cssText = "background:var(--card-bg); padding:20px; border-radius:10px; margin-bottom:20px; border:1px solid var(--border);";
        adminAddContainer.innerHTML = `
            <h4><i class="fa-solid fa-plus-circle"></i> إضافة منتج جديد للمخزن العام</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
                <input type="text" id="new-prod-name" placeholder="اسم المنتج الجديد" style="flex:2; padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                <input type="number" id="new-prod-price" placeholder="سعر البيع" style="flex:1; padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                <button class="btn-primary" onclick="adminAddNewProduct()" style="padding:8px 15px; cursor:pointer;">إضافة المنتج</button>
            </div>
        `;
        inventoryView.insertBefore(adminAddContainer, inventoryView.firstChild);
    }

    adminAddContainer.style.display = (currentUser.key === 'admin') ? 'block' : 'none';
    let auditPanel = document.getElementById('stock-audit-panel');
    if (!auditPanel) {
        auditPanel = document.createElement('div');
        auditPanel.id = 'stock-audit-panel';
        inventoryView.insertBefore(auditPanel, tbody.parentElement?.parentElement || tbody);
    }
    auditPanel.style.display = currentUser.key === 'admin' ? 'block' : 'none';
    if (currentUser.key === 'admin') {
        auditPanel.style.cssText = 'background:var(--bg-card);padding:16px;border-radius:10px;margin-bottom:18px;border:1px solid var(--border-color);';
        auditPanel.innerHTML = `<h4>📝 سجل حركة مخزون الآدمن</h4><div class="table-responsive" style="margin-top:10px;"><table class="data-table"><thead><tr><th>الوقت</th><th>المنتج</th><th>قبل</th><th>بعد</th><th>التغيير</th><th>السبب</th><th>بواسطة</th></tr></thead><tbody>${stockAdjustments.slice(0,50).map(a=>`<tr><td>${a.time||''}</td><td>${a.productName||''}</td><td>${a.before}</td><td>${a.after}</td><td>${a.delta>0?'+':''}${a.delta}</td><td>${a.reason||''}</td><td>${a.by||''}</td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;">لا توجد حركات مسجلة.</td></tr>'}</tbody></table></div>`;
    }

    const isAdminOrAssistant = (currentUser.key === 'admin' || currentUser.key === 'dohaa' || currentUser.key === 'mona');
    const isBranch = (currentUser.key === 'poultry' || currentUser.key === 'gardens');
    const isNesmaOwner = currentUser.key === 'nesma';
    const isAdmin = (currentUser.key === 'admin');

    tbody.innerHTML = products.map(p => {
        if(typeof p.stock !== 'object') {
            p.stock = { admin: p.stock || 0, poultry: 0, gardens: 0, nesma: 0 };
        }

        return `
            <tr>
                <td>
                    <strong>${p.name}</strong><br>
                    <span style="color:var(--text-muted);">${p.price} ج.م</span>
                    ${isAdmin ? `
                        <div style="margin-top:5px;">
                            <button class="btn-secondary" style="font-size:0.75rem; padding:2px 6px;" onclick="adminChangePrice(${p.id})"><i class="fa-solid fa-pen"></i> تعديل السعر</button>
                        </div>
                    ` : ''}
                </td>
                <td><span style="color:var(--primary); font-weight:bold; font-size:1.05rem;">${p.stock.admin}</span></td>
                <td><span style="font-weight:bold; font-size:1.05rem;">${p.stock.poultry}</span></td>
                <td><span style="font-weight:bold; font-size:1.05rem;">${p.stock.gardens}</span></td>
                <td>
                    ${isAdminOrAssistant ? `
                        <div style="display:flex; gap:5px; flex-wrap:wrap;">
                            <button class="btn-secondary" onclick="adminAddStock(${p.id}, 'admin')">+ الآدمن</button>
                            <button class="btn-secondary" onclick="adminAddStock(${p.id}, 'poultry')">+ الدواجن</button>
                            <button class="btn-secondary" onclick="adminAddStock(${p.id}, 'gardens')">+ الحدايق</button>
                            ${isAdmin ? `<button class="btn-secondary" onclick="adminEditStock(${p.id}, 'admin')">✏️ تعديل رصيد الآدمن</button>
                            <button class="btn-danger" onclick="adminRemoveStock(${p.id}, 'admin')">− إنقاص رصيد الآدمن</button>` : ''}
                        </div>
                    ` : (isBranch ? `
                        <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
                            <button class="btn-secondary" onclick="branchAddStock(${p.id})">+ إضافة رصيد لفرعي</button>
                            <button class="btn-danger" style="background:var(--danger); font-size:0.8rem; padding:5px 8px;" onclick="branchReturnStockModal(${p.id})"><i class="fa-solid fa-rotate-left"></i> استرجاع للآدمن</button>
                        </div>
                    ` : (isNesmaOwner ? `
                        <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
                            <button class="btn-secondary" onclick="nesmaAddBranchStock(${p.id}, 'poultry')">+ إضافة للدواجن</button>
                            <button class="btn-secondary" onclick="nesmaAddBranchStock(${p.id}, 'gardens')">+ إضافة للحدايق</button>
                            <button class="btn-danger" style="background:var(--danger); font-size:0.8rem; padding:5px 8px;" onclick="nesmaReturnBranchStockModal(${p.id})"><i class="fa-solid fa-rotate-left"></i> استرجاع رصيد للآدمن</button>
                        </div>
                    ` : '<span style="color:var(--text-muted); font-size:0.85rem;">للاطلاع فقط</span>'))}
                </td>
            </tr>
        `;
    }).join('');
}

function branchReturnStockModal(id) {
    const p = products.find(item => item.id === id);
    if(!p) return;

    let branchStockKey = currentUser.key;
    let branchName = currentUser.name;
    if (currentUser.key === 'nesma') {
        const choice = prompt('اكتب رقم الفرع المراد استرجاع رصيده للآدمن:\n1 = فرع الدواجن\n2 = فرع الحدايق');
        if (choice === null) return;
        branchStockKey = choice === '1' ? 'poultry' : choice === '2' ? 'gardens' : '';
        if (!branchStockKey) { alert('اختيار غير صحيح.'); return; }
        branchName = branchStockKey === 'poultry' ? 'فرع الدواجن' : 'فرع الحدايق';
    } else if (!['poultry','gardens'].includes(currentUser.key)) {
        alert('هذه العملية متاحة لفروع الدواجن والحدايق ولنسمة بصفتها صاحبة الفرعين.');
        return;
    }

    normalizeProductStock(p);
    const currentStock = Number(p.stock[branchStockKey] || 0);
    const qtyStr = prompt(`المنتج: (${p.name})\nالفرع: ${branchName}\nالرصيد الحالي: ${currentStock}\nأدخل الكمية المراد استرجاعها للآدمن:`, '1');
    if(qtyStr === null || isNaN(qtyStr)) return;
    const qty = parseInt(qtyStr);
    if(qty <= 0 || qty > currentStock) {
        alert(`الكمية غير صحيحة. الرصيد المتاح في ${branchName} هو ${currentStock}.`);
        return;
    }

    const returnId = 'RET-' + Date.now().toString().slice(-5);
    returnOrders.unshift({
        id: returnId,
        branchKey: branchStockKey,
        branchName,
        requestedByKey: currentUser.key,
        requestedByName: currentUser.name,
        productId: p.id,
        productName: p.name,
        qty,
        status: 'جديد',
        type: 'return'
    });

    saveDataToCloud();
    alert(`تم إرسال طلب استرجاع ${qty} من ${branchName} للآدمن الرئيسي برقم #${returnId}. لن يتم خصم الرصيد إلا بعد اعتماد الآدمن.`);
}

function nesmaReturnBranchStockModal(id) {
    if (currentUser.key !== 'nesma') return;
    branchReturnStockModal(id);
}

function adminAddNewProduct() {
    const nameInput = document.getElementById('new-prod-name');
    const priceInput = document.getElementById('new-prod-price');
    
    if(!nameInput || !priceInput) return;
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(price) || price <= 0) {
        alert("يرجى إدخال اسم المنتج وسعر صحيح بشكل سليم!");
        return;
    }

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        stock: { admin: 0, poultry: 0, gardens: 0 }
    };

    products.push(newProduct);
    saveDataToCloud(); 
    
    nameInput.value = '';
    priceInput.value = '';
    alert("تم إضافة المنتج بنجاح وظهر في جميع الحسابات والمخازن سحابياً!");
}

function adminChangePrice(id) {
    const p = products.find(item => item.id === id);
    if(!p) return;

    const newPrice = prompt(`أدخل سعر البيع الجديد للمنتج (${p.name}):`, p.price);
    if(newPrice !== null && !isNaN(newPrice) && parseFloat(newPrice) > 0) {
        p.price = parseFloat(newPrice);
        saveDataToCloud();
        alert("تم تعديل السعر بنجاح وتحديثه في جميع الحسابات (أجهزة المبيعات والفروع) تلقائياً!");
    }
}

function adminAddStock(id, targetKey) {
    let targetName = "الآدمن الرئيسي";
    if(targetKey === 'poultry') targetName = "فرع الدواجن";
    if(targetKey === 'gardens') targetName = "فرع الحدايق";
    const qty = prompt(`أدخل عدد الوحدات المراد إضافتها إلى (${targetName}):`);
    if(qty && !isNaN(qty) && Number(qty) > 0) {
        const p = products.find(item => item.id === id);
        if(p) {
            normalizeProductStock(p);
            const before = Number(p.stock[targetKey] || 0);
            p.stock[targetKey] = before + parseInt(qty);
            if (currentUser.key === 'admin') recordStockAdjustment(p, targetKey, before, p.stock[targetKey], 'إضافة يدوية');
            const allocation = fulfillManufacturingRequestsForProduct(p.id, targetKey);
            saveDataToCloud();
            const extra = allocation.allocated > 0 ? `\nتم خصم ${allocation.allocated} تلقائياً من الرصيد المضاف لحجز عميل/عملاء.` : '';
            alert(`تمت إضافة الرصيد بنجاح وتحديثه سحابياً لـ ${targetName}!\nالرصيد المتبقي: ${p.stock[targetKey]} قطعة.${extra}`);
        }
    }
}

function recordStockAdjustment(product, stockKey, before, after, reason) {
    if (currentUser.key !== 'admin') return;
    stockAdjustments.unshift({ id: 'ADJ-' + Date.now(), productId: product.id, productName: product.name, stockKey, before:Number(before), after:Number(after), delta:Number(after)-Number(before), reason, by: currentUser.name, time:new Date().toLocaleString('ar-EG') });
    stockAdjustments = stockAdjustments.slice(0, 100);
}

function adminEditStock(id, targetKey='admin') {
    if (currentUser.key !== 'admin') { alert('تعديل رصيد المخزن يخص الآدمن الرئيسي فقط.'); return; }
    const p = products.find(item => item.id === id); if (!p) return;
    normalizeProductStock(p);
    const before = Number(p.stock[targetKey] || 0);
    const label = targetKey === 'admin' ? 'الآدمن الرئيسي' : targetKey === 'poultry' ? 'فرع الدواجن' : 'فرع الحدايق';
    const raw = prompt(`تعديل الرصيد اليدوي للمنتج: ${p.name}\n${label}\nالرصيد الحالي: ${before}\nاكتب الرصيد الصحيح الجديد:`, String(before));
    if (raw === null) return;
    const after = parseInt(raw);
    if (isNaN(after) || after < 0) { alert('أدخل رقم صحيح أكبر من أو يساوي صفر.'); return; }
    p.stock[targetKey] = after;
    recordStockAdjustment(p, targetKey, before, after, 'تعديل يدوي');
    if (targetKey === 'admin' && after > before) fulfillManufacturingRequestsForProduct(p.id);
    saveDataToCloud();
    alert(`تم تعديل رصيد ${label} من ${before} إلى ${after} وتسجيل الحركة.`);
}

function adminRemoveStock(id, targetKey='admin') {
    if (currentUser.key !== 'admin') { alert('حذف/إنقاص الرصيد يخص الآدمن الرئيسي فقط.'); return; }
    const p = products.find(item => item.id === id); if (!p) return;
    normalizeProductStock(p);
    const before = Number(p.stock[targetKey] || 0);
    const raw = prompt(`إنقاص رصيد ${p.name}\nالرصيد الحالي: ${before}\nأدخل الكمية المراد إنقاصها:`, '1');
    if (raw === null) return;
    const qty = parseInt(raw);
    if (isNaN(qty) || qty <= 0 || qty > before) { alert('الكمية غير صحيحة.'); return; }
    p.stock[targetKey] = before - qty;
    recordStockAdjustment(p, targetKey, before, p.stock[targetKey], 'إنقاص/حذف رصيد بالخطأ');
    saveDataToCloud();
}

function fulfillManufacturingRequestsForProduct(productId, stockKey='admin') {
    const p = products.find(x => x.id == productId);
    if (!p) return { changed:false, allocated:0, allocations:[] };
    normalizeProductStock(p);
    let available = Number(p.stock[stockKey] || 0);
    let changed = false, allocatedTotal = 0;
    const allocations = [];
    const pending = manufacturingRequests
        .filter(r => String(r.productId) === String(productId) && (r.stockKey || r.branchKey) === stockKey && Number(r.remainingQty || 0) > 0 && r.status !== 'ملغى')
        .sort((a,b) => Number(a.createdAt||0) - Number(b.createdAt||0));
    for (const r of pending) {
        const take = Math.min(available, Number(r.remainingQty || 0));
        if (take <= 0) break;
        available -= take;
        allocatedTotal += take;
        r.suppliedQty = Number(r.suppliedQty || 0) + take;
        r.remainingQty = Number(r.remainingQty || 0) - take;
        r.status = r.remainingQty === 0 ? 'تم توفيره' : 'تم توفير جزء منه';
        r.updatedAt = Date.now();
        changed = true;
        const order = orders.find(o => String(o.id) === String(r.orderId));
        if (order) {
            order.suppliedQtyByProduct = order.suppliedQtyByProduct || {};
            const key = String(r.productId);
            order.suppliedQtyByProduct[key] = Number(order.suppliedQtyByProduct[key] || 0) + take;
            allocations.push({ orderId:order.id, customerName:order.customerName || 'عميل', qty:take, productName:r.productName || p.name });
            refreshOrderManufacturingStatus(order.id);
        }
    }
    if (changed) {
        const beforeAllocation = Number(p.stock[stockKey] || 0);
        p.stock[stockKey] = available;
        if (currentUser && currentUser.key === 'admin' && stockKey === 'admin' && beforeAllocation !== available) {
            recordStockAdjustment(p, stockKey, beforeAllocation, available, 'تخصيص رصيد للفواتير وطلبات التصنيع المعلقة');
        }
        allocations.forEach(a => notifications.unshift({
            type:'manufacturing-auto-allocation', invoiceId:a.orderId, customerName:a.customerName,
            productName:a.productName, qty:a.qty,
            branchName:stockKey === 'poultry' ? 'فرع الدواجن' : stockKey === 'gardens' ? 'فرع الحدايق' : 'مخزن الآدمن',
            message:`تم خصم ${a.qty} من ${a.productName} من الرصيد المضاف حديثاً، لأنها كانت محجوزة للعميل ${a.customerName} بالفاتورة #${a.orderId}.`,
            time:new Date().toLocaleString('ar-EG')
        }));
    }
    return { changed, allocated:allocatedTotal, allocations };
}

function branchAddStock(id) {
    if (!(currentUser.key === 'poultry' || currentUser.key === 'gardens')) {
        alert('نسمة تستخدم أزرار إضافة الرصيد الخاصة بفرعي الدواجن والحدايق.');
        return;
    }
    const targetKey = currentUser.key;
    const targetName = currentUser.key === 'poultry' ? 'فرع الدواجن' : 'فرع الحدايق';
    const qty = prompt(`أدخل عدد الوحدات المراد إضافتها لرصيد ${targetName}:`);
    if(qty && !isNaN(qty) && Number(qty) > 0) {
        const p = products.find(item => item.id === id);
        if(p) {
            normalizeProductStock(p);
            p.stock[targetKey] = Number(p.stock[targetKey] || 0) + parseInt(qty);
            const allocation = fulfillManufacturingRequestsForProduct(p.id, targetKey);
            saveDataToCloud();
            const extra = allocation.allocated > 0 ? `\nتم خصم ${allocation.allocated} تلقائياً من الرصيد المضاف لحجز عميل/عملاء.` : '';
            alert(`تمت إضافة الرصيد بنجاح إلى ${targetName}.\nالرصيد المتبقي للمنتج: ${p.stock[targetKey]} قطعة.${extra}`);
        }
    }
}

function nesmaAddBranchStock(id, targetKey) {
    if (currentUser.key !== 'nesma' || !['poultry','gardens'].includes(targetKey)) {
        alert('هذه العملية متاحة لنسمة فقط على رصيد فرعي الدواجن والحدايق.');
        return;
    }
    const targetName = targetKey === 'poultry' ? 'فرع الدواجن' : 'فرع الحدايق';
    const qty = prompt(`أدخل عدد الوحدات المراد إضافتها إلى ${targetName}:`);
    if(qty === null || isNaN(qty) || Number(qty) <= 0) return;
    const p = products.find(item => item.id === id);
    if(!p) return;
    normalizeProductStock(p);
    p.stock[targetKey] = Number(p.stock[targetKey] || 0) + parseInt(qty);
    const allocation = fulfillManufacturingRequestsForProduct(p.id, targetKey);
    saveDataToCloud();
    const extra = allocation.allocated > 0 ? `\nتم خصم ${allocation.allocated} تلقائياً من الرصيد المضاف لحجز عميل/عملاء.` : '';
    alert(`تمت إضافة ${qty} وحدة إلى ${targetName} بنجاح.\nالرصيد المتبقي للمنتج: ${p.stock[targetKey]} قطعة.${extra}`);
}

function requiredManufacturingForOrder(order) {
    const meta = { stockKey: order.stockKeyUsed || 'admin' };
    const items = getItemList(order);
    return items.map(item => {
        const p = products.find(x => x.id == item.productId);
        const stock = p ? getStockForKey(p, meta.stockKey) : 0;
        const alreadyReserved = manufacturingRequests.filter(r => r.orderId === order.id && String(r.productId) === String(item.productId)).reduce((s,r)=>s+Number(r.totalQty||0),0);
        return { item, stock, shortage: Math.max(0, Number(item.qty) - stock - alreadyReserved) };
    });
}

function getOutstandingDemand(stockKey, productId) {
    let demand = 0;
    orders.forEach(o => {
        if (o.stockKeyUsed !== stockKey || o.stockDeducted || ['مرتجع','مرتجع جزئي'].includes(o.status)) return;
        getItemList(o).forEach(it => { if (String(it.productId) === String(productId)) demand += Number(it.qty || 0); });
    });
    const supplied = manufacturingRequests.filter(r => String(r.productId) === String(productId) && r.status !== 'ملغى').reduce((s,r)=>s+Number(r.suppliedQty||0),0);
    return { demand, supplied };
}

function createManufacturingRequestsForOrder(order, force=false) {
    if (!order || !order.stockKeyUsed) return false;
    const items = getItemList(order);
    let created = false;

    order.deductedQtyByProduct = order.deductedQtyByProduct || {};
    order.suppliedQtyByProduct = order.suppliedQtyByProduct || {};

    items.forEach(item => {
        const p = products.find(x => String(x.id) === String(item.productId));
        if (!p) return;
        normalizeProductStock(p);

        const key = String(item.productId);
        const alreadyDeducted = Number(order.deductedQtyByProduct[key] || 0);
        const suppliedForOrder = Number(order.suppliedQtyByProduct[key] || 0);
        const existingRemaining = manufacturingRequests
            .filter(r => r.orderId === order.id && String(r.productId) === key && r.status !== 'ملغى')
            .reduce((sum, r) => sum + Number(r.remainingQty || 0), 0);

        const stock = Number(p.stock[order.stockKeyUsed] || 0);
        const uncovered = Math.max(0, Number(item.qty || 0) - alreadyDeducted - suppliedForOrder - stock);
        const qty = Math.max(0, uncovered - existingRemaining);

        if (qty > 0) {
            manufacturingRequests.push({
                id:'MFG-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
                orderId:order.id,
                invoiceId:order.id,
                customerName:order.customerName,
                phone:order.phone,
                branchName:order.deliveryLabel || order.createdBy,
                branchKey:order.targetBranchKey || order.stockKeyUsed,
                stockKey:order.stockKeyUsed,
                productId:item.productId,
                productName:item.productName,
                totalQty:qty,
                suppliedQty:0,
                remainingQty:qty,
                amount:Number(item.price||0)*qty,
                orderTotal:Number(order.total||0),
                status:'مطلوب تصنيع',
                createdAt:Date.now()
            });
            created = true;
        }
    });

    if (created) order.manufacturingRequired = true;
    return created;
}

function refreshOrderManufacturingStatus(orderId) {
    const order = orders.find(o => o.id === orderId); if (!order) return;
    const reqs = manufacturingRequests.filter(r => r.orderId === orderId && r.status !== 'ملغى');
    const remaining = reqs.filter(r => Number(r.remainingQty||0) > 0);
    if (remaining.length) {
        order.status = 'مطلوب تصنيع';
        order.manufacturingRequired = true;
        return;
    }

    // الرصيد وصل بالفعل، لكن الآدمن الرئيسي لم يضغط "تم التصنيع" بعد.
    const allManufacturingDone = reqs.length > 0 && reqs.every(r => r.status === 'تم التصنيع');
    if (allManufacturingDone) {
        order.status = 'تم التصنيع';
        order.manufacturingRequired = false;
        order.manufacturingCompletedAt = order.manufacturingCompletedAt || Date.now();
    } else {
        order.status = 'في انتظار التصنيع';
        order.manufacturingRequired = true;
    }
}

function markManufacturingComplete(id) {
    if (currentUser.key !== 'admin') {
        alert('تأكيد "تم التصنيع" مخصص للآدمن الرئيسي فقط.');
        return;
    }
    const req = manufacturingRequests.find(r => r.id === id);
    if (!req) return;
    if (Number(req.remainingQty || 0) > 0) {
        alert('لا يمكن تأكيد التصنيع قبل توفير الكمية المطلوبة بالكامل.');
        return;
    }
    req.status = 'تم التصنيع';
    req.manufacturingCompletedAt = Date.now();
    req.updatedAt = Date.now();

    const orderReqs = manufacturingRequests.filter(r => r.orderId === req.orderId && r.status !== 'ملغى');
    const allDone = orderReqs.length > 0 && orderReqs.every(r => r.status === 'تم التصنيع');
    const order = orders.find(o => o.id === req.orderId);
    if (order && allDone) {
        // كل الكميات الناقصة تم توفيرها وتخصيصها من مخزنها بالفعل.
        // لذلك لا نعيد تشغيل خطوة تأكيد المخزون عند الانتقال من "تم التصنيع" للتجهيز.
        order.stockDeducted = true;
        order.status = 'تم التصنيع';
        order.manufacturingRequired = false;
        order.manufacturingCompletedAt = Date.now();
    } else if (order) {
        order.status = 'في انتظار التصنيع';
        order.manufacturingRequired = true;
    }
    saveDataToCloud();
    renderManufacturingRequests();
    renderOrders();
    alert(allDone ? 'تم تسجيل التصنيع، والأوردر أصبح جاهزًا للانتقال لمرحلة التجهيز.' : 'تم تسجيل تصنيع هذا البند. باقي البنود ستظل في طلبات التصنيع حتى تكتمل.');
}

function getOrderDisplayStatus(o) {
    return o.status || 'جديد';
}

function confirmBranchInvoice(id) {
    const o = orders.find(x => x.id === id); if (!o) return;
    if (!['poultry','gardens'].includes(o.targetBranchKey) || !['poultry','gardens','nesma'].includes(currentUser.key)) { alert('هذه الفاتورة ليست مخصصة لفرع من فروع الدواجن أو الحدايق.'); return; }
    if (currentUser.key !== 'nesma' && o.targetBranchKey !== currentUser.key) { alert('هذه الفاتورة ليست مخصصة لهذا الفرع.'); return; }
    if (o.stockDeducted) { alert('تم تأكيد الفاتورة مسبقاً.'); return; }

    const pendingManufacturing = manufacturingRequests.some(r => String(r.orderId) === String(o.id) && r.status !== 'ملغى' && (Number(r.remainingQty || 0) > 0 || r.status !== 'تم التصنيع'));
    if (pendingManufacturing) {
        alert('هذه الفاتورة مرتبطة بطلب تصنيع. يجب الضغط على «تم التصنيع» أولاً بعد توفير الكمية، ثم متابعة الفاتورة.');
        return;
    }
    const items = getItemList(o);
    o.deductedQtyByProduct = o.deductedQtyByProduct || {};
    let hasShortage = false;
    let changedStock = false;

    // تأكيد الفرع لا يوقف الفاتورة بسبب بند ناقص:
    // أي بند له رصيد فعلي يتم خصمه فوراً، والبند الناقص يدخل طلب تصنيع.
    items.forEach(item => {
        const p = products.find(x => x.id == item.productId); if (!p) return;
        normalizeProductStock(p);

        const key = String(item.productId);
        const alreadyDeducted = Number(o.deductedQtyByProduct[key] || 0);
        const suppliedForOrder = manufacturingRequests
            .filter(r => r.orderId === o.id && String(r.productId) === key && r.status !== 'ملغى')
            .reduce((s,r) => s + Number(r.suppliedQty || 0), 0);

        const totalCovered = alreadyDeducted + suppliedForOrder;
        const remainingNeed = Math.max(0, Number(item.qty) - totalCovered);
        const branchStockKey = o.targetBranchKey;
        const freeStock = Number(p.stock[branchStockKey] || 0);
        const takeFromStock = Math.min(freeStock, remainingNeed);

        if (takeFromStock > 0) {
            p.stock[branchStockKey] -= takeFromStock;
            o.deductedQtyByProduct[key] = alreadyDeducted + takeFromStock;
            changedStock = true;
        }

        const stillMissing = Math.max(0, Number(item.qty) - Number(o.deductedQtyByProduct[key] || 0) - suppliedForOrder);
        if (stillMissing > 0) hasShortage = true;
    });

    if (hasShortage) {
        createManufacturingRequestsForOrder(o, true);
        o.status = 'مطلوب تصنيع';
        o.confirmedBy = currentUser.name;
        o.confirmedAt = Date.now();
        if (changedStock) {
            notifications.unshift({ type:'branch-partial-confirmed', invoiceId:o.id, branchName:currentUser.name, customerName:o.customerName, time:new Date().toLocaleString('ar-EG') });
        }
        saveDataToCloud();
        alert('تم تأكيد الفاتورة. تم خصم البنود المتاحة، والبنود الناقصة أصبحت مطلوبة للتصنيع. عند إضافة الرصيد للفرع سيتم تخصيصه تلقائياً لهذه الفاتورة.');
        return;
    }

    // كل البنود أصبحت مغطاة: إما بخصم سابق من رصيد الفرع أو برصيد تم توفيره عبر طلبات التصنيع.
    o.stockDeducted = true;
    o.confirmedBy = currentUser.name;
    o.confirmedAt = Date.now();
    o.status = 'تم اعتماد الفاتورة - جاهزة للتجهيز';
    notifications.unshift({ type:'branch-confirmed', invoiceId:o.id, branchName:currentUser.name, customerName:o.customerName, time:new Date().toLocaleString('ar-EG') });
    saveDataToCloud();
}

function confirmAdminInvoice(id) {
    if (currentUser.key !== 'admin') { alert('تأكيد فواتير الشحن مخصص للآدمن الرئيسي.'); return; }
    const o = orders.find(x => x.id === id); if (!o) return;
    if (o.stockDeducted) { alert('تم تأكيد الفاتورة مسبقاً.'); return; }

    const pendingManufacturing = manufacturingRequests.some(r => String(r.orderId) === String(o.id) && r.status !== 'ملغى' && (Number(r.remainingQty || 0) > 0 || r.status !== 'تم التصنيع'));
    if (pendingManufacturing) {
        alert('هذه الفاتورة مرتبطة بطلب تصنيع. يجب الضغط على «تم التصنيع» أولاً بعد توفير الكمية، ثم متابعة الفاتورة.');
        return;
    }
    const items = getItemList(o);
    o.deductedQtyByProduct = o.deductedQtyByProduct || {};
    o.suppliedQtyByProduct = o.suppliedQtyByProduct || {};
    let hasShortage = false;
    let changedStock = false;

    items.forEach(item => {
        const p = products.find(x => String(x.id) === String(item.productId));
        if (!p) return;
        normalizeProductStock(p);
        const key = String(item.productId);
        const alreadyDeducted = Number(o.deductedQtyByProduct[key] || 0);
        const suppliedForOrder = Number(o.suppliedQtyByProduct[key] || 0);
        const need = Math.max(0, Number(item.qty || 0) - alreadyDeducted - suppliedForOrder);
        const available = Number(p.stock.admin || 0);
        const take = Math.min(available, need);

        if (take > 0) {
            p.stock.admin = available - take;
            o.deductedQtyByProduct[key] = alreadyDeducted + take;
            changedStock = true;
        }

        const stillMissing = Math.max(0, Number(item.qty || 0) - Number(o.deductedQtyByProduct[key] || 0) - suppliedForOrder);
        if (stillMissing > 0) hasShortage = true;
    });

    if (hasShortage) {
        createManufacturingRequestsForOrder(o, true);
        o.status = 'مطلوب تصنيع';
        o.manufacturingRequired = true;
        o.confirmedBy = currentUser.name;
        o.confirmedAt = Date.now();
        if (changedStock) {
            notifications.unshift({ type:'admin-partial-confirmed', invoiceId:o.id, customerName:o.customerName, time:new Date().toLocaleString('ar-EG') });
        }
        saveDataToCloud();
        alert('تم تأكيد الفاتورة. تم خصم الكميات المتاحة من رصيد الآدمن الرئيسي، وتسجيل الكمية الناقصة ضمن طلبات تحتاج للتصنيع.');
        return;
    }

    o.stockDeducted = true;
    o.manufacturingRequired = false;
    o.confirmedBy = currentUser.name;
    o.confirmedAt = Date.now();
    o.status = 'تم اعتماد الفاتورة - جاهزة للتجهيز';
    notifications.unshift({ type:'admin-confirmed', invoiceId:o.id, customerName:o.customerName, time:new Date().toLocaleString('ar-EG') });
    saveDataToCloud();
}

function advanceOrderStatus(id) {
    const o = orders.find(ord => ord.id === id); if (!o) return;
    if (o.deliveryType === 'poultry' || o.deliveryType === 'gardens') {
        if (!o.stockDeducted) {
            if (['poultry','gardens'].includes(o.targetBranchKey) && ['poultry','gardens','nesma'].includes(currentUser.key)) { if (currentUser.key === 'nesma' || o.targetBranchKey === currentUser.key) { confirmBranchInvoice(id); return; } }
            alert('الفاتورة في انتظار تأكيد مسؤول الفرع المحدد.'); return;
        }
        if (o.status === 'تم اعتماد الفاتورة - جاهزة للتجهيز') { o.status='جارٍ التجهيز'; saveDataToCloud(); return; }
    } else if (o.deliveryType === 'provinces' || o.deliveryType === 'cairo') {
        if (!o.stockDeducted) {
            if (currentUser.key === 'admin') { confirmAdminInvoice(id); return; }
            alert('الفاتورة في انتظار تأكيد الآدمن الرئيسي.'); return;
        }
        if (o.status === 'تم اعتماد الفاتورة - جاهزة للتجهيز') { o.status='جارٍ التجهيز'; saveDataToCloud(); return; }
    }
    if (o.status === 'تم التصنيع') o.status = 'تم التجهيز';
    else if (o.status === 'جديد') o.status = 'جارٍ التجهيز';
    else if (o.status === 'جارٍ التجهيز') o.status = 'تم التجهيز';
    else if (o.status === 'تم التجهيز') o.status = 'تم الشحن';
    else if (o.status === 'تم الشحن') o.status = 'تم التسليم';
    else { alert('الأوردر مكتمل بالفعل أو ما زال يحتاج لتصنيع.'); return; }
    saveDataToCloud();
}

function advancePurchaseStatus(id) {
    if (currentUser.key !== 'admin') {
        alert('تأكيد وتسليم فواتير الشراء مخصص للآدمن الرئيسي فقط.');
        return;
    }

    const po = purchaseOrders.find(item => item.id === id);
    if (!po) return;

    if (po.status === 'جديد') {
        po.status = 'جارٍ التجهيز';
    } else if (po.status === 'جارٍ التجهيز') {
        po.status = 'تم الشحن';
    } else if (po.status === 'تم الشحن') {
        po.status = 'تم التسليم';
        
        const p = products.find(item => item.id == po.productId);
        if (p) {
            if (typeof p.stock !== 'object') p.stock = { admin: 0, poultry: 0, gardens: 0, nesma: 0 };
            if (p.stock.admin >= po.qty) {
                p.stock.admin -= po.qty;
                p.stock[po.branchKey] = (p.stock[po.branchKey] || 0) + po.qty;

                // لو الفرع كان عنده فواتير معلقة بسبب عدم وجود رصيد وقت إنشاء الفاتورة،
                // يتم تخصيص الرصيد الوارد لها فوراً. الكمية المخصصة لا تظل كرَصيد حر.
                // وبذلك يمكن للفرع تأكيد الفاتورة المعلقة بعد وصول البضاعة.
                fulfillManufacturingRequestsForProduct(p.id, po.branchKey);
            } else {
                alert('تحذير: رصيد الآدمن الحالي لا يكفي لخصم الكمية المطلوبة!');
                return;
            }
        }
    } else {
        alert('فاتورة الشراء مكتملة بالفعل.');
        return;
    }

    saveDataToCloud();
}

function approveReturnOrder(id) {
    if (currentUser.key !== 'admin') {
        alert('موافقة واعتماد فواتير المرتجعات مخصص للآدمن الرئيسي فقط.');
        return;
    }

    const ro = returnOrders.find(item => item.id === id);
    if (!ro) return;

    if (ro.status === 'تم الاستلام والتأكيد') {
        alert('تم اعتماد هذا المرتجع مسبقاً.');
        return;
    }

    const p = products.find(item => item.id == ro.productId);
    if (p) {
        if (typeof p.stock !== 'object') p.stock = { admin: 0, poultry: 0, gardens: 0, nesma: 0 };
        
        const branchKey = ro.branchKey; 
        if ((p.stock[branchKey] || 0) >= ro.qty) {
            p.stock[branchKey] -= ro.qty;      
            p.stock.admin += ro.qty;           
            ro.status = 'تم الاستلام والتأكيد';
            saveDataToCloud();
            alert(`تم اعتماد المرتجع بنجاح، وتم خصم (${ro.qty}) من رصيد (${ro.branchName}) وإضافتها لمخزن الآدمن سحابياً!`);
        } else {
            alert(`عذراً، رصيد الفرع الحالي (${p.stock[branchKey] || 0}) لم يعد يكفي لإتمام الخصم المطلوبة (${ro.qty})!`);
        }
    }
}

function deletePurchaseOrder(id) {
    if (currentUser.key !== 'admin') {
        alert('حذف فواتير الشراء مخصص للآدمن الرئيسي فقط.');
        return;
    }

    if (confirm(`هل أنت متأكد من حذف فاتورة الشراء #${id} نهائياً؟`)) {
        purchaseOrders = purchaseOrders.filter(po => po.id !== id);
        saveDataToCloud();
        alert('تم حذف الفاتورة بنجاح.');
    }
}

function deleteReturnOrder(id) {
    if (currentUser.key !== 'admin') {
        alert('حذف طلبات المرتجعات مخصص للآدمن الرئيسي فقط.');
        return;
    }

    if (confirm(`هل أنت متأكد من حذف طلب المرتجع #${id} نهائياً؟`)) {
        returnOrders = returnOrders.filter(ro => ro.id !== id);
        saveDataToCloud();
        alert('تم حذف طلب المرتجع بنجاح.');
    }
}

function makeReturnOrder(id) {
    if (currentUser.key !== 'admin') { alert('عذراً، خاصية عمل المرتجع متاح للحساب الرئيسي (الآدمن) فقط.'); return; }
    const o = orders.find(ord => ord.id === id); if (!o) return;
    const items = getItemList(o);
    const lines = items.map((it,i)=>`${i+1}) ${it.productName} — ${it.qty} قطعة`).join('\n');
    const selection = prompt(`فاتورة #${o.id}\n${lines}\n\nاكتب أرقام البنود المراد إرجاعها مفصولة بفواصل، أو اكتب الكل:`, 'الكل');
    if (selection === null) return;
    let indexes = [];
    if (selection.trim() === 'الكل' || selection.trim().toLowerCase() === 'all') indexes = items.map((_,i)=>i);
    else indexes = selection.split(',').map(x=>parseInt(x.trim())-1).filter(i=>i>=0 && i<items.length);
    if (!indexes.length) { alert('لم يتم اختيار بنود صحيحة.'); return; }
    const returnItems=[];
    for (const i of indexes) {
        const it=items[i];
        let qty=Number(it.qty);
        if (indexes.length !== items.length || items.length > 1) {
            const q=prompt(`المنتج: ${it.productName}\nالكمية الأصلية: ${it.qty}\nكمية المرتجع:`, String(it.qty));
            if(q===null) return; qty=parseInt(q);
        }
        if(isNaN(qty)||qty<=0||qty>Number(it.qty)){alert('كمية مرتجع غير صحيحة.');return;}
        returnItems.push({...it, qty});
    }
    if(!confirm(`تأكيد إرجاع ${returnItems.length} بند/بنود من الفاتورة #${o.id}؟`)) return;
    returnItems.forEach(ri=>{const p=products.find(x=>x.id==ri.productId); if(p){normalizeProductStock(p);const key=o.stockKeyUsed||'admin';p.stock[key]=(p.stock[key]||0)+Number(ri.qty);}});
    const returnedTotal=returnItems.reduce((s,it)=>s+Number(it.price||0)*Number(it.qty),0);
    o.returnedItems = Array.isArray(o.returnedItems)?o.returnedItems:[];
    returnItems.forEach(ri=>{const old=o.returnedItems.find(x=>x.productId==ri.productId); if(old) old.qty+=ri.qty; else o.returnedItems.push({...ri});});
    const fullyReturned = items.every(it=>Number((o.returnedItems.find(x=>x.productId==it.productId)||{}).qty||0) >= Number(it.qty));
    o.status = fullyReturned ? 'مرتجع' : 'مرتجع جزئي';
    o.returnedAmount = Number(o.returnedAmount||0)+returnedTotal;
    saveDataToCloud();
    alert(fullyReturned ? 'تم إرجاع الفاتورة بالكامل.' : 'تم تسجيل المرتجع الجزئي بنجاح.');
}

function canDeleteOrder(o) {
    if (currentUser.key === 'poultry' || currentUser.key === 'gardens') {
        return o.targetBranchKey === currentUser.key || o.createdByKey === currentUser.key;
    }
    if (currentUser.key === 'nesma') {
        return ['poultry','gardens'].includes(o.targetBranchKey);
    }
    // الإدارة الرئيسية لا تحذف فواتير الفروع؛ تظل ظاهرة للمتابعة فقط.
    if (currentUser.key === 'admin') {
        return o.deliveryType !== 'poultry' && o.deliveryType !== 'gardens' && o.targetBranchKey !== 'poultry' && o.targetBranchKey !== 'gardens';
    }
    return false;
}

function deleteOrder(id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    if (!canDeleteOrder(o)) {
        alert('لا تملك صلاحية حذف هذه الفاتورة. فواتير الفروع يتم التحكم فيها من الفرع نفسه.');
        return;
    }
    if (confirm(`هل أنت متأكد تماماً من حذف الأوردر #${id} نهائياً؟`)) {
        orders = orders.filter(order => order.id !== id);
        saveDataToCloud();
        alert('تم حذف الأوردر بنجاح وتحديث النظام سحابياً.');
    }
}

function canSeeOrder(o) {
    // جميع الحسابات الخمسة المسموح لها بصفحة المتابعة ترى كل الأوردرات.
    // التحكم في إجراءات الأوردر يظل منفصلاً عبر canActOnOrder، فلا نغيّر صلاحيات التنفيذ الأصلية.
    return ['admin', 'nesma', 'dohaa', 'mona', 'poultry', 'gardens'].includes(currentUser.key);
}

function canActOnOrder(o) {
    // فواتير الدواجن والحدايق: الفرع المسؤول فقط هو الذي يتحكم في التأكيد والتجهيز والتسليم.
    if (o.deliveryType === 'poultry' || o.deliveryType === 'gardens' || o.targetBranchKey === 'poultry' || o.targetBranchKey === 'gardens') {
        return ((currentUser.key === 'poultry' || currentUser.key === 'gardens') && o.targetBranchKey === currentUser.key) || (currentUser.key === 'nesma' && ['poultry','gardens'].includes(o.targetBranchKey));
    }
    if (currentUser.key === 'admin') return true;
    if (currentUser.key === 'nesma') return o.targetBranchKey === 'nesma' || o.createdByKey === 'nesma' || o.createdBy === 'نسمة';
    if (o.deliveryType === 'provinces' || o.deliveryType === 'cairo') return false;
    return currentUser.key === o.createdByKey || currentUser.key === o.createdBy;
}

function orderNextAction(o) {
    if (o.status === 'مطلوب تصنيع' || o.status === 'بانتظار التصنيع' || o.status === 'في انتظار التصنيع') return 'في انتظار التصنيع';
    if ((o.deliveryType === 'poultry' || o.deliveryType === 'gardens') && !o.stockDeducted) return (currentUser.key === o.targetBranchKey || (currentUser.key === 'nesma' && ['poultry','gardens'].includes(o.targetBranchKey))) ? 'تأكيد الفاتورة' : 'في انتظار تأكيد الفرع';
    if ((o.deliveryType === 'provinces' || o.deliveryType === 'cairo') && !o.stockDeducted) return currentUser.key === 'admin' ? 'تأكيد وخصم المخزون' : 'في انتظار الآدمن الرئيسي';
    if (o.status === 'تم التصنيع') return 'تم التجهيز';
    if (o.status === 'جديد') return 'بدء التجهيز';
    if (o.status === 'جارٍ التجهيز') return 'تم التجهيز';
    if (o.status === 'تم التجهيز') return 'شحن الأوردر';
    if (o.status === 'تم الشحن') return 'تأكيد التسليم';
    return 'منتهي';
}

function renderOrders() {
    if(!currentUser.access.includes('orders')) return;
    const tbody=document.getElementById('orders-table-body');
    const thead=document.getElementById('orders-table-head');
    if(!tbody) return;

    const visible=orders.filter(canSeeOrder);
    const canManage=['admin','nesma','dohaa','mona','poultry','gardens'].includes(currentUser.key);
    const isAdmin=currentUser.key==='admin';
    // المبالغ تظهر فقط لصاحبة المشروع (نسمة) والآدمن الرئيسي.
    const showMoney=(currentUser.key==='admin'||currentUser.key==='nesma');

    // عرض تفاصيل الطلب في أعمدة مستقلة حتى يستطيع الآدمن معرفة العميل والمنتج والكمية والعنوان والإجمالي والحالة والإجراء في نفس الصف.
    if(thead){
        thead.innerHTML=`<tr>
            <th>رقم الطلب</th>
            <th>الفرع / المُدخل</th>
            <th>اسم العميل</th>
            <th>المنتج</th>
            <th>العدد المطلوب</th>
            <th>العنوان</th>
            ${showMoney ? '<th>الإجمالي</th>' : ''}
            <th>الحالة</th>
            <th>إجراءات الإدارة</th>
        </tr>`;
    }

    let html=visible.map(o=>{
        const items=getItemList(o);
        const productText=items.length
            ? items.map(i=>`${i.productName}`).join('<br>')
            : '—';
        const qtyText=items.length
            ? items.map(i=>`${i.qty}`).join('<br>')
            : '—';
        const moneyCell=showMoney ? `<td class="order-money-cell"><strong style="color:var(--success);font-size:1rem;">${Number(o.total||0).toFixed(2)} ج.م</strong></td>` : '';
        let button='';
        if(canManage && canActOnOrder(o) && !['مرتجع','مرتجع جزئي'].includes(o.status)) {
            button=`<button class="btn-secondary" onclick="advanceOrderStatus('${o.id}')">${orderNextAction(o)}</button>`;
        }
        const confirmBadge=o.stockDeducted?'تم تأكيد الخصم':o.status;
        const canDelete = canDeleteOrder(o);
        const creatorName = o.createdBy || (o.createdByKey && systemUsers[o.createdByKey]?.name) || 'غير محدد';
        const sourceLabel = o.deliveryLabel ? `${o.deliveryLabel} — بواسطة: ${creatorName}` : `بواسطة: ${creatorName}`;
        const canReturn = isAdmin && !['مرتجع'].includes(o.status);
        const actions=`<div class="order-actions-cell">${button}${canReturn?`<button class="btn-danger" onclick="makeReturnOrder('${o.id}')">↩ مرتجع</button>`:''}${canDelete?`<button class="btn-danger" style="background:#444;" onclick="deleteOrder('${o.id}')">حذف</button>`:''}</div>`;
        return `<tr>
            <td><strong>#${o.id}</strong></td>
            <td><span style="color:var(--primary);font-weight:600;"><i class="fa-solid fa-user-tie"></i> ${sourceLabel}</span></td>
            <td><strong>${o.customerName||'—'}</strong><br><span style="color:var(--text-muted);font-size:.8rem;">${o.phone||''}</span></td>
            <td class="order-product-cell">${productText}</td>
            <td class="order-qty-cell">${qtyText}</td>
            <td class="order-address-cell">${o.address||'—'}</td>
            ${moneyCell}
            <td><span class="badge-status">${confirmBadge}</span></td>
            <td>${actions}</td>
        </tr>`;
    }).join('');

    const showPurchasesAndReturns=(currentUser.key==='admin'||currentUser.key==='nesma');
    let purchaseHtml='';
    if(showPurchasesAndReturns){
        purchaseHtml=purchaseOrders.map(po=>{
            let next=po.status==='جديد'?'بدء التجهيز':po.status==='جارٍ التجهيز'?'شحن الطلب':po.status==='تم الشحن'?'تأكيد التسليم (إضافة الرصيد)':'تمت الإضافة';
            const total=po.total||(Number(po.price||0)*Number(po.qty||0));
            return `<tr class="purchase-order-row">
                <td><strong>#${po.id}</strong> <span class="order-type-badge">طلب شراء</span></td>
                <td>${po.branchName||po.branchKey||'—'}</td>
                <td>—</td>
                <td>${po.productName||'طلب توريد مخزون'}</td>
                <td>${po.qty||0}</td>
                <td>طلب توريد مخزون</td>
                ${showMoney ? `<td><strong style="color:var(--success);">${Number(total||0).toFixed(2)} ج.م</strong></td>` : ''}
                <td><span class="badge-status">${po.status}</span></td>
                <td class="order-actions-cell">${isAdmin&&po.status!=='تم التسليم'?`<button class="btn-primary" onclick="advancePurchaseStatus('${po.id}')">${next}</button>`:''}${po.status==='تم التسليم'?'<span style="color:var(--success);">تم إضافة الرصيد</span>':''}${isAdmin?` <button class="btn-danger" onclick="deletePurchaseOrder('${po.id}')">حذف</button>`:''}</td>
            </tr>`;
        }).join('');
    }

    let returnHtml='';
    if(showPurchasesAndReturns){
        returnHtml=returnOrders.map(ro=>{
            return `<tr class="return-order-row">
                <td><strong>#${ro.id}</strong> <span class="return-type-badge">استرجاع للمصنع</span></td>
                <td>${ro.branchName||'—'}</td>
                <td>—</td>
                <td>${ro.productName||'—'}</td>
                <td>${ro.qty||0}</td>
                <td>استرجاع للمصنع</td>
                ${showMoney ? '<td>استرجاع مخزني</td>' : ''}
                <td>${ro.status}</td>
                <td class="order-actions-cell">${isAdmin&&ro.status!=='تم الاستلام والتأكيد'?`<button class="btn-primary" onclick="approveReturnOrder('${ro.id}')">تأكيد الاسترجاع</button>`:''}${isAdmin?` <button class="btn-danger" onclick="deleteReturnOrder('${ro.id}')">حذف</button>`:''}</td>
            </tr>`;
        }).join('');
    }

    const colCount=showMoney?9:8;
    tbody.innerHTML=(returnHtml+purchaseHtml+html)||`<tr><td colspan="${colCount}" style="text-align:center;">لا توجد طلبات أو فواتير مسجلة حالياً</td></tr>`;
}

function renderManufacturingRequests() {
    if (!currentUser.access.includes('manufacturing')) return;
    const tbody=document.getElementById('manufacturing-table-body'); if(!tbody) return;
    const pending = manufacturingRequests.filter(r => {
        if (r.status === 'ملغى' || r.status === 'تم التصنيع') return false;
        return Number(r.remainingQty||0) > 0 || r.status === 'تم توفيره';
    });
    const rows=pending.map(r=>{
        const ready = Number(r.remainingQty||0) === 0 && r.status === 'تم توفيره';
        const action = ready
            ? `<button class="btn-primary" onclick="markManufacturingComplete('${r.id}')">تم التصنيع</button>`
            : '<span style="color:var(--warning);">في انتظار توفير الرصيد</span>';
        return `<tr><td>#${r.invoiceId}</td><td>${r.customerName}<br>${r.phone}</td><td>${r.branchName||''}</td><td>${r.productName}</td><td>${r.totalQty}</td><td>${r.suppliedQty||0}</td><td><strong style="color:var(--danger);">${r.remainingQty}</strong></td><td>${r.orderTotal||r.amount||0} ج.م</td><td>${r.status}</td><td>${action}</td></tr>`;
    }).join('');
    tbody.innerHTML=rows||'<tr><td colspan="10" style="text-align:center;">لا توجد طلبات تصنيع معلقة.</td></tr>';
}

function initInvoiceQuery(){
    const btn=document.getElementById('invoice-query-btn'), input=document.getElementById('invoice-query-phone');
    if(!btn||btn.dataset.ready) return;
    btn.dataset.ready='1';
    btn.addEventListener('click',()=>{
        const phone=input.value.trim();
        const box=document.getElementById('invoice-query-results');
        if(!phone){box.innerHTML='<div style="padding:10px;color:var(--danger);">اكتب رقم الهاتف أولاً.</div>';return;}
        const found=orders.filter(o=>String(o.phone||'').includes(phone));
        if(!found.length){box.innerHTML='<div style="padding:10px;text-align:center;color:var(--text-muted);">لا توجد فواتير بهذا الرقم.</div>';return;}

        // السعر والإجمالي يظهران فقط لنسمة والآدمن الرئيسي.
        const canShowMoney=(currentUser.key==='admin'||currentUser.key==='nesma');
        const moneyHeader=canShowMoney ? '<th>السعر والإجمالي</th>' : '';

        box.innerHTML=`<table class="data-table"><thead><tr>
            <th>الفاتورة</th>
            <th>العميل</th>
            <th>المنتجات</th>
            <th>نوع التسليم</th>
            <th>الحالة</th>
            ${moneyHeader}
        </tr></thead><tbody>
        ${found.map(o=>{
            const items=getItemList(o);
            const productsText=items.map(i=>`${i.productName} × ${i.qty}`).join(' + ');
            const moneyCell=canShowMoney ? `<td>${o.total||0} ج.م</td>` : '';
            return `<tr>
                <td>#${o.id}</td>
                <td>${o.customerName}<br>${o.phone}<br>${o.address||''}</td>
                <td>${productsText}</td>
                <td>${o.deliveryLabel||''}</td>
                <td>${o.status}</td>
                ${moneyCell}
            </tr>`;
        }).join('')}
        </tbody></table>`;
    });
}


function renderCustomers() {
    if(!currentUser.access.includes('customers')) return;
    const tbody = document.getElementById('customers-table-body');
    if(!tbody) return;

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.state} - ${c.address || ''}</td>
            <td>${c.ordersCount} طلبات</td>
            <td>${c.totalSpent} ج.م</td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;">لا توجد بيانات عملاء مسجلة بعد</td></tr>';
}

function renderReports() {
    if(!currentUser.access.includes('reports')) return;
    const grid = document.getElementById('reports-stats-grid');
    if(!grid) return;

    const deliveredSales = calculateDeliveredSales();
    const activeCount = orders.filter(isActiveOrder).length;
    const preparedCount = orders.filter(o => ['تم التجهيز','تم الشحن','تم التسليم','مرتجع جزئي'].includes(String(o.status||'')) && o.status !== 'مرتجع').length;
    const deliveredCount = orders.filter(isDeliveredOrder).length;
    const activeSupplyCount = purchaseOrders.filter(po => po.status !== 'تم التسليم' && po.status !== 'ملغى').length;
    grid.innerHTML = `
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-chart-line"></i></div><div class="info"><span>إجمالي المبيعات العامة</span><h3>${deliveredSales.toFixed(2)} ج.م</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-box-open"></i></div><div class="info"><span>إجمالي الطلبات النشطة</span><h3>${activeCount}</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-box-open"></i></div><div class="info"><span>الطلبات التي تم تجهيزها</span><h3>${preparedCount}</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-truck-fast"></i></div><div class="info"><span>الطلبات التي تم تسليمها</span><h3>${deliveredCount}</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-boxes-stacked"></i></div><div class="info"><span>طلبات توريد المخزون النشطة</span><h3>${activeSupplyCount}</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-store"></i></div><div class="info"><span>مبيعات فرع الدواجن</span><h3>${calculateDeliveredSales('poultry').toFixed(2)} ج.م</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-store"></i></div><div class="info"><span>مبيعات فرع الحدايق</span><h3>${calculateDeliveredSales('gardens').toFixed(2)} ج.م</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-user-tie"></i></div><div class="info"><span>مبيعات دعاء</span><h3>${calculateDeliveredSales('dohaa').toFixed(2)} ج.م</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-user-tie"></i></div><div class="info"><span>مبيعات منى</span><h3>${calculateDeliveredSales('mona').toFixed(2)} ج.م</h3></div></div>
    `;
}


/* =========================================================
   الفاتورة الإلكترونية - إضافة مستقلة
   تقرأ بيانات orders الحالية فقط ولا تنشئ أو تحذف أي فاتورة.
   ========================================================= */
let selectedElectronicInvoiceId = '';
function escapeInvoiceHTML(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function normalizeEgyptWhatsAppNumber(phone){let v=String(phone||'').replace(/\D/g,'');if(v.startsWith('00'))v=v.slice(2);if(v.startsWith('0'))v='20'+v.slice(1);if(!v.startsWith('20'))v='20'+v;return v;}
function initElectronicInvoice(){
 const select=document.getElementById('electronic-invoice-select');
 const search=document.getElementById('electronic-invoice-search');
 const printBtn=document.getElementById('print-electronic-invoice-btn');
 const pngBtn=document.getElementById('download-electronic-invoice-png-btn');
 const pdfBtn=document.getElementById('download-electronic-invoice-pdf-btn');
 const waBtn=document.getElementById('whatsapp-electronic-invoice-btn');
 if(!select||!search)return;
 const current=()=>getElectronicInvoiceById(select.value);
 search.addEventListener('input',refreshElectronicInvoiceSelect);
 select.addEventListener('change',()=>renderElectronicInvoicePreview(current()));
 printBtn?.addEventListener('click',()=>{const o=current();if(o)printElectronicInvoice(o);else alert('اختر فاتورة أولاً.');});
 pngBtn?.addEventListener('click',()=>{const o=current();if(o)downloadElectronicInvoicePNG(o);else alert('اختر فاتورة أولاً.');});
 pdfBtn?.addEventListener('click',()=>{const o=current();if(o)downloadElectronicInvoicePDF(o);else alert('اختر فاتورة أولاً.');});
 waBtn?.addEventListener('click',()=>{const o=current();if(o)sendElectronicInvoiceWhatsApp(o);else alert('اختر فاتورة أولاً.');});
 refreshElectronicInvoiceSelect();
}
function getElectronicInvoiceById(id){return orders.find(o=>String(o.id)===String(id))||null;}
function getElectronicInvoiceItems(order){const raw=getItemList(order); const shipping=Number(order.shipping||0); return raw.map(item=>{const product=products.find(p=>String(p.id)===String(item.productId)); let price=Number(item.price||0); if(price<=0 && raw.length===1 && Number(item.qty||0)>0 && Number(order.total||0)>0){price=Math.max(0,(Number(order.total)-shipping)/Number(item.qty));} if(price<=0) price=Number(product?.price||0); return {productName:item.productName||product?.name||'منتج',qty:Number(item.qty||0),price,lineTotal:price*Number(item.qty||0)};});}
function buildElectronicInvoiceHTML(order){
 const items=getElectronicInvoiceItems(order), shipping=Number(order.shipping||0), itemsTotal=items.reduce((s,i)=>s+i.lineTotal,0), total=Number(order.total||(itemsTotal+shipping));
 return `<div class="invoice-print-area"><div class="invoice-brand"><div class="invoice-brand-main"><div><h1>فيلورا كوسمتكس</h1><p>فاتورة إلكترونية</p></div></div><div class="invoice-number"><strong>رقم الفاتورة</strong><span>#${escapeInvoiceHTML(order.id)}</span></div></div><div class="invoice-meta-grid"><div><strong>التاريخ:</strong> ${escapeInvoiceHTML(order.createdAt?new Date(order.createdAt).toLocaleString('ar-EG'):'')}</div><div><strong>العميل:</strong> ${escapeInvoiceHTML(order.customerName||'')}</div><div><strong>رقم العميل:</strong> ${escapeInvoiceHTML(order.phone||order.customerPhone||'')}</div><div><strong>المحافظة:</strong> ${escapeInvoiceHTML(order.state||'')}</div><div class="invoice-meta-full"><strong>العنوان:</strong> ${escapeInvoiceHTML(order.address||'')}</div><div><strong>التسليم:</strong> ${escapeInvoiceHTML(order.deliveryLabel||'')}</div><div><strong>الحالة:</strong> ${escapeInvoiceHTML(order.status||'')}</div><div><strong>بواسطة:</strong> ${escapeInvoiceHTML(order.createdBy||'')}</div></div><table class="invoice-table"><thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${items.map((i,n)=>`<tr><td>${n+1}</td><td>${escapeInvoiceHTML(i.productName)}</td><td>${i.qty}</td><td>${i.price.toFixed(2)} ج.م</td><td>${i.lineTotal.toFixed(2)} ج.م</td></tr>`).join('')}</tbody></table><div class="invoice-totals"><div><span>إجمالي المنتجات</span><strong>${itemsTotal.toFixed(2)} ج.م</strong></div><div><span>الشحن</span><strong>${shipping.toFixed(2)} ج.م</strong></div><div class="invoice-grand-total"><span>الإجمالي الكلي</span><strong>${total.toFixed(2)} ج.م</strong></div></div><div class="invoice-footer"><p>شكراً لتعاملكم مع فيلورا كوسمتكس</p></div></div>`;
}
function refreshElectronicInvoiceSelect(){const select=document.getElementById('electronic-invoice-select'),search=document.getElementById('electronic-invoice-search');if(!select||!['admin','dohaa','mona'].includes(String(currentUser?.key||'')))return;const q=String(search?.value||'').trim().toLowerCase();const list=orders.filter(o=>!q||[o.id,o.customerName,o.phone,o.address,o.status].some(v=>String(v||'').toLowerCase().includes(q)));select.innerHTML='<option value="">-- اختر رقم الفاتورة --</option>'+list.map(o=>`<option value="${escapeInvoiceHTML(o.id)}">#${escapeInvoiceHTML(o.id)} — ${escapeInvoiceHTML(o.customerName||'')} — ${escapeInvoiceHTML(o.phone||'')}</option>`).join('');if(selectedElectronicInvoiceId)select.value=selectedElectronicInvoiceId;}
function renderElectronicInvoicePreview(order){const box=document.getElementById('electronic-invoice-preview');if(!box)return;if(!order){selectedElectronicInvoiceId='';box.innerHTML='<div class="invoice-empty-state"><i class="fa-solid fa-receipt"></i><p>اختر فاتورة لعرضها وتجهيزها للطباعة أو الإرسال عبر واتساب.</p></div>';return;}selectedElectronicInvoiceId=String(order.id);box.innerHTML=buildElectronicInvoiceHTML(order);}
function invoiceSvgEscape(value){
 return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function invoiceExportStyles(){return `
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,Tahoma,sans-serif;color:#32151f;direction:rtl}
.invoice-print-area{width:740px;background:#fff;padding:20px;border:1px solid #ead9df;border-radius:10px;color:#32151f;font-family:Arial,Tahoma,sans-serif}
.invoice-brand{display:flex;justify-content:space-between;gap:14px;align-items:center;border-bottom:2px solid #b18a3c;padding-bottom:12px;margin-bottom:14px}.invoice-brand-main{display:flex;align-items:center;gap:10px}.invoice-brand h1{margin:0 0 2px;font-size:18px;color:#6f1735}.invoice-brand p{margin:0;font-size:10px;color:#8b6874}.invoice-number{text-align:left;font-size:11px}.invoice-number strong,.invoice-number span{display:block}.invoice-number span{font-size:15px;font-weight:bold;color:#9a762e;margin-top:3px}.invoice-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;margin:11px 0;font-size:10px;line-height:1.45}.invoice-meta-grid strong{color:#6f1735}.invoice-meta-full{grid-column:1/-1}.invoice-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}.invoice-table th,.invoice-table td{border:1px solid #e2d5da;padding:6px 5px;text-align:right;vertical-align:middle}.invoice-table th{background:#f8eef2;color:#6f1735;font-weight:700}.invoice-table th:first-child,.invoice-table td:first-child{width:34px;text-align:center}.invoice-table th:nth-child(3),.invoice-table td:nth-child(3){width:65px;text-align:center}.invoice-table th:nth-child(4),.invoice-table td:nth-child(4),.invoice-table th:nth-child(5),.invoice-table td:nth-child(5){width:95px}.invoice-totals{width:245px;margin:11px 0 0 auto;font-size:10px}.invoice-totals>div{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}.invoice-grand-total{font-size:13px;font-weight:bold;border-top:2px solid #b18a3c!important;color:#6f1735;padding-top:8px!important}.invoice-footer{text-align:center;border-top:1px solid #ddd;margin-top:11px;padding-top:7px;color:#8b6874;font-size:9px}`}
function getVisibleInvoiceNode(){const box=document.getElementById('electronic-invoice-preview');return box?.querySelector('.invoice-print-area')||null;}
function waitForInvoicePaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function canvasToPngBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('تعذر إنشاء صورة PNG')),'image/png'));}
async function captureVisibleInvoice(){const node=getVisibleInvoiceNode();if(!node)throw new Error('لم يتم العثور على الفاتورة المعروضة.');if(typeof window.html2canvas!=='function')throw new Error('مكتبة حفظ الصورة غير متاحة.');await waitForInvoicePaint();const rect=node.getBoundingClientRect();const width=Math.ceil(Math.max(node.scrollWidth,rect.width));const height=Math.ceil(Math.max(node.scrollHeight,rect.height));return await window.html2canvas(node,{backgroundColor:'#fff',scale:2,width,height,useCORS:false,allowTaint:false,foreignObjectRendering:false,imageTimeout:0,logging:false,scrollX:0,scrollY:0,windowWidth:Math.max(document.documentElement.clientWidth,width),windowHeight:Math.max(document.documentElement.clientHeight,height)});}
function safeInvoiceFileName(order,ext){return 'فاتورة-'+String(order.id||'invoice').replace(/[^\w\-\u0600-\u06FF]/g,'_')+'.'+ext;}
function saveBlob(blob,name){if(!blob){alert('تعذر إنشاء الملف.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
async function downloadElectronicInvoicePNG(order){try{const canvas=await captureVisibleInvoice();const blob=await canvasToPngBlob(canvas);saveBlob(blob,safeInvoiceFileName(order,'png'));}catch(e){console.error('PNG export failed:',e);alert('تعذر تنزيل الفاتورة كصورة. تأكد أن الفاتورة ظاهرة ثم حاول مرة أخرى.');}}
async function downloadElectronicInvoicePDF(order){try{const canvas=await captureVisibleInvoice();if(!window.jspdf?.jsPDF)throw new Error('مكتبة PDF غير متاحة.');const {jsPDF}=window.jspdf;const pxW=canvas.width,pxH=canvas.height;const pdf=new jsPDF({orientation:pxW>pxH?'landscape':'portrait',unit:'px',format:[pxW,pxH],compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,pxW,pxH,undefined,'FAST');pdf.save(safeInvoiceFileName(order,'pdf'));}catch(e){console.error('PDF export failed:',e);alert('تعذر تنزيل الفاتورة كـ PDF. تأكد أن الفاتورة ظاهرة ثم حاول مرة أخرى.');}}

function printElectronicInvoice(order){
 const w=window.open('','_blank','width=850,height=900');
 if(!w){alert('المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');return;}
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>فاتورة #${escapeInvoiceHTML(order.id)}</title><style>
 *{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;padding:12px;color:#32151f;background:#fff}.invoice-print-area{width:740px;max-width:100%;margin:auto;padding:20px;border:1px solid #ead9df;border-radius:10px}.invoice-brand{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #b18a3c;padding-bottom:12px;margin-bottom:14px}.invoice-brand-main{display:flex;align-items:center;gap:10px}.invoice-brand h1{margin:0 0 2px;font-size:18px;color:#6f1735}.invoice-brand p{margin:0;font-size:10px;color:#8b6874}.invoice-number{text-align:left;font-size:11px}.invoice-number strong,.invoice-number span{display:block}.invoice-number span{font-size:15px;font-weight:bold;color:#9a762e;margin-top:3px}.invoice-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;margin:11px 0;font-size:10px;line-height:1.45}.invoice-meta-full{grid-column:1/-1}.invoice-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}.invoice-table th,.invoice-table td{border:1px solid #e2d5da;padding:6px 5px;text-align:right}.invoice-table th{background:#f8eef2;color:#6f1735}.invoice-table th:first-child,.invoice-table td:first-child{width:34px;text-align:center}.invoice-table th:nth-child(3),.invoice-table td:nth-child(3){width:65px;text-align:center}.invoice-table th:nth-child(4),.invoice-table td:nth-child(4),.invoice-table th:nth-child(5),.invoice-table td:nth-child(5){width:95px}.invoice-totals{width:245px;margin:11px 0 0 auto;font-size:10px}.invoice-totals>div{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}.invoice-grand-total{font-size:13px;font-weight:bold;border-top:2px solid #b18a3c!important;color:#6f1735}.invoice-footer{text-align:center;border-top:1px solid #ddd;margin-top:11px;padding-top:7px;color:#8b6874;font-size:9px}@media print{body{padding:0}.invoice-print-area{border:0;border-radius:0;width:100%;padding:18px}@page{size:A4;margin:10mm}}</style></head><body>${buildElectronicInvoiceHTML(order)}</body></html>`);
 w.document.close();setTimeout(()=>{w.focus();w.print();},500);
}
function sendElectronicInvoiceWhatsApp(order){const phone='201107249120';const items=getElectronicInvoiceItems(order),shipping=Number(order.shipping||0),itemsTotal=items.reduce((s,i)=>s+i.lineTotal,0),total=Number(order.total||(itemsTotal+shipping));const text=['🧾 *فاتورة إلكترونية - فيلورا كوسمتكس*',`رقم الفاتورة: #${order.id}`,`العميل: ${order.customerName||''}`,`الهاتف: ${order.phone||''}`,'','*المنتجات:*',...items.map((i,n)=>`${n+1}. ${i.productName} × ${i.qty} = ${i.lineTotal.toFixed(2)} ج.م`),'',`إجمالي المنتجات: ${itemsTotal.toFixed(2)} ج.م`,`الشحن: ${shipping.toFixed(2)} ج.م`,`*الإجمالي الكلي: ${total.toFixed(2)} ج.م*`].join('\n');window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
