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
    admin: { name: "الآدمن الرئيسي", role: "Admin", pass: "admin123", access: ["dashboard", "pos-order", "inventory", "orders", "customers", "reports"] },
    dohaa: { name: "دعاء", role: "مساعد إدارة", pass: "dohaa123", access: ["pos-order", "inventory", "orders", "customers"] },
    mona: { name: "منى", role: "مساعد إدارة", pass: "mona123", access: ["pos-order", "inventory", "orders", "customers"] },
    poultry: { name: "فرع الدواجن", role: "مسؤول فرع الدواجن", pass: "poultry123", access: ["pos-order", "inventory"] },
    gardens: { name: "فرع الحدايق", role: "مسؤول فرع الحدايق", pass: "gardens123", access: ["pos-order", "inventory"] },
    nesma: { name: "نسمة", role: "متابعة المبيعات", pass: "nesma123", access: ["dashboard", "orders"] }
};

let currentUser = JSON.parse(sessionStorage.getItem('velora_current_user')) || null;

const defaultProducts = [
    { id: 1, name: "مجموعة العناية بالبشرة كافيار بلس", price: 390, stock: { admin: 15, poultry: 5, gardens: 5 } },
    { id: 2, name: "سيروم الهيالورونيك النقي", price: 240, stock: { admin: 10, poultry: 3, gardens: 3 } },
    { id: 3, name: "أحمر شفاه مطفي ثابت", price: 120, stock: { admin: 25, poultry: 10, gardens: 8 } }
];

let products = [];
let orders = [];
let customers = [];
let notifications = [];

// جلب وتحديث البيانات لحظياً من سحابة Firebase
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        products = data.products || defaultProducts;
        orders = data.orders || [];
        customers = data.customers || [];
        notifications = data.notifications || [];
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
        renderNotifications();
    }
});

function saveDataToCloud() {
    dbRef.set({
        products: products,
        orders: orders,
        customers: customers,
        notifications: notifications
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
    if(currentUser.access.includes('pos-order')) {
        initPOSForm();
        initCustomerSearchAutoFill();
    }
}

function buildSidebarMenu() {
    const menuList = document.getElementById('sidebar-menu-list');
    const allowed = currentUser.access;

    let menuHTML = '';
    if(allowed.includes('dashboard')) menuHTML += `<li class="active" data-target="dashboard"><i class="fa-solid fa-chart-pie"></i> الرئيسية</li>`;
    if(allowed.includes('pos-order')) menuHTML += `<li data-target="pos-order"><i class="fa-solid fa-file-invoice-dollar"></i> إنشاء فاتورة (بيع)</li>`;
    if(allowed.includes('inventory')) menuHTML += `<li data-target="inventory"><i class="fa-solid fa-warehouse"></i> رصيد المخزن</li>`;
    if(allowed.includes('orders')) menuHTML += `<li data-target="orders"><i class="fa-solid fa-box-archive"></i> متابعة المبيعات والأوردرات</li>`;
    if(allowed.includes('customers')) menuHTML += `<li data-target="customers"><i class="fa-solid fa-users"></i> بيانات العملاء</li>`;
    if(allowed.includes('reports')) menuHTML += `<li data-target="reports"><i class="fa-solid fa-chart-line"></i> تقارير المبيعات</li>`;

    menuList.innerHTML = menuHTML;

    if (currentUser.key === 'nesma') {
        switchView('dashboard');
        const firstLi = document.querySelector('.sidebar-menu li');
        if (firstLi) firstLi.classList.add('active');
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

function renderDashboard() {
    if(!currentUser.access.includes('dashboard')) return;
    const validOrders = orders.filter(o => o.status !== 'مرتجع');
    const poultryTotal = validOrders.filter(o => o.createdBy === 'فرع الدواجن').reduce((s,o)=>s+o.total,0);
    const gardensTotal = validOrders.filter(o => o.createdBy === 'فرع الحدايق').reduce((s,o)=>s+o.total,0);
    const dohaaTotal = validOrders.filter(o => o.createdBy === 'دعاء').reduce((s,o)=>s+o.total,0);
    const monaTotal = validOrders.filter(o => o.createdBy === 'منى').reduce((s,o)=>s+o.total,0);

    const statsEl = document.getElementById('dashboard-stats');
    if(statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-shopping-bag"></i></div><div class="info"><span>إجمالي الطلبات النشطة</span><h3>${validOrders.length}</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-money-bill-wave"></i></div><div class="info"><span>إجمالي المبيعات العامة</span><h3>${validOrders.reduce((s,o)=>s+o.total,0)} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-store"></i></div><div class="info"><span>مبيعات فرع الدواجن</span><h3>${poultryTotal} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-store"></i></div><div class="info"><span>مبيعات فرع الحدايق</span><h3>${gardensTotal} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-user-tie"></i></div><div class="info"><span>مبيعات دعاء</span><h3>${dohaaTotal} ج.م</h3></div></div>
            <div class="stat-card"><div class="icon"><i class="fa-solid fa-user-tie"></i></div><div class="info"><span>مبيعات منى</span><h3>${monaTotal} ج.م</h3></div></div>
        `;
    }
}

let isPosInitialized = false;
function initPOSForm() {
    const productSelect = document.getElementById('order-product-select');
    const searchProdInput = document.getElementById('product-filter-search');
    const shippingInput = document.getElementById('order-shipping');

    if (shippingInput && !shippingInput.value) {
        shippingInput.value = "0";
    }

    const getActiveStockKey = () => {
        if (currentUser.key === 'poultry') return 'poultry';
        if (currentUser.key === 'gardens') return 'gardens';
        return 'admin';
    };

    const updateProductDropdown = (filter = "") => {
        if(!productSelect) return;
        const stockKey = getActiveStockKey();
        const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        
        productSelect.innerHTML = filtered.map(p => {
            const currentStock = (p.stock && typeof p.stock === 'object') ? (p.stock[stockKey] || 0) : p.stock;
            return `<option value="${p.id}" data-price="${p.price}" data-stock="${currentStock}">${p.name} (السعر: ${p.price} - رصيدك المتاح: ${currentStock})</option>`;
        }).join('');
        calcTotal();
    };

    const calcTotal = () => {
        if(!productSelect) return;
        const selectedOpt = productSelect.options[productSelect.selectedIndex];
        const price = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-price')) : 0;
        const qty = parseInt(document.getElementById('order-qty').value) || 1;
        const shipping = parseFloat(document.getElementById('order-shipping').value) || 0;
        const grandTotalEl = document.getElementById('calc-grand-total');
        if(grandTotalEl) grandTotalEl.innerText = (price * qty) + shipping;
    };

    if(!isPosInitialized) {
        if(searchProdInput) searchProdInput.addEventListener('input', (e) => updateProductDropdown(e.target.value));

        if(productSelect) productSelect.addEventListener('change', calcTotal);
        const qtyInput = document.getElementById('order-qty');
        if(qtyInput) qtyInput.addEventListener('input', calcTotal);
        if(shippingInput) shippingInput.addEventListener('input', calcTotal);

        const submitBtn = document.getElementById('submit-order-btn');
        if(submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const customerName = document.getElementById('cust-name').value.trim();
                const phone = document.getElementById('cust-phone').value.trim();
                const address = document.getElementById('cust-address').value.trim();

                if(!customerName || !phone || !address) {
                    alert('يرجى ملء جميع بيانات العميل الأساسية (الاسم، رقم الهاتف، والعنوان)!');
                    return;
                }

                const prodId = productSelect.value;
                const prod = products.find(p => p.id == prodId);
                const qty = parseInt(document.getElementById('order-qty').value);
                const stockKey = getActiveStockKey();

                if(!prod) return;

                if(typeof prod.stock !== 'object') {
                    prod.stock = { admin: prod.stock || 0, poultry: 0, gardens: 0 };
                }

                if(prod.stock[stockKey] < qty) {
                    alert(`عذراً، الرصيد المتاح في حسابك (${currentUser.name}) لا يكفي للكمية المطلوبة!`);
                    return;
                }

                prod.stock[stockKey] -= qty;

                const newId = (1050 + orders.length).toString();
                const shipping = parseFloat(shippingInput.value) || 0;
                const total = (prod.price * qty) + shipping;
                const state = document.getElementById('cust-state').value;

                if(currentUser.key !== 'admin') {
                    notifications.unshift({
                        assistantName: currentUser.name,
                        customerName: customerName,
                        phone: phone,
                        productName: prod.name,
                        qty: qty,
                        total: total,
                        time: new Date().toLocaleTimeString()
                    });
                }

                let existingCust = customers.find(c => c.phone === phone);
                if(existingCust) {
                    existingCust.ordersCount += 1;
                    existingCust.totalSpent += total;
                } else {
                    customers.push({ name: customerName, phone: phone, state: state, address: address, ordersCount: 1, totalSpent: total });
                }

                orders.unshift({
                    id: newId,
                    customerName: customerName,
                    phone: phone,
                    state: state,
                    address: address,
                    productName: prod.name,
                    productId: prod.id,
                    stockKeyUsed: stockKey,
                    qty: qty,
                    shipping: shipping,
                    total: total,
                    status: "جديد",
                    createdBy: currentUser.name
                });

                saveDataToCloud();

                document.getElementById('cust-name').value = '';
                document.getElementById('cust-phone').value = '';
                document.getElementById('cust-address').value = '';
                document.getElementById('order-qty').value = '1';
                shippingInput.value = '0';
                calcTotal();

                alert(`تم إنشاء الفاتورة بنجاح برقم #${newId} وتم الخصم من رصيد (${currentUser.name}) وتحديثه سحابياً!`);
            });
        }

        isPosInitialized = true;
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

    const isAdminOrAssistant = (currentUser.key === 'admin' || currentUser.key === 'dohaa' || currentUser.key === 'mona');
    const isBranch = (currentUser.key === 'poultry' || currentUser.key === 'gardens');
    const isAdmin = (currentUser.key === 'admin');

    tbody.innerHTML = products.map(p => {
        if(typeof p.stock !== 'object') {
            p.stock = { admin: p.stock || 0, poultry: 0, gardens: 0 };
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
                        </div>
                    ` : (isBranch ? `
                        <button class="btn-secondary" onclick="branchAddStock(${p.id})">+ إضافة رصيد لنفسي</button>
                    ` : '<span style="color:var(--text-muted); font-size:0.85rem;">للاطلاع فقط</span>')}
                </td>
            </tr>
        `;
    }).join('');
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
    if(qty && !isNaN(qty)) {
        const p = products.find(item => item.id === id);
        if(p) {
            if(typeof p.stock !== 'object') p.stock = { admin: 0, poultry: 0, gardens: 0 };
            p.stock[targetKey] += parseInt(qty);
            saveDataToCloud();
            alert(`تمت إضافة الرصيد بنجاح وتحديثه سحابياً لـ ${targetName}!`);
        }
    }
}

function branchAddStock(id) {
    const targetKey = currentUser.key === 'poultry' ? 'poultry' : 'gardens';
    const qty = prompt(`أدخل عدد الوحدات المراد إضافتها لرصيدك (${currentUser.name}):`);
    if(qty && !isNaN(qty)) {
        const p = products.find(item => item.id === id);
        if(p) {
            if(typeof p.stock !== 'object') p.stock = { admin: 0, poultry: 0, gardens: 0 };
            p.stock[targetKey] += parseInt(qty);
            saveDataToCloud();
            alert(`تمت إضافة الرصيد بنجاح لحسابك وسيظهر التحديث لدى الإدارة سحابياً!`);
        }
    }
}

function advanceOrderStatus(id) {
    const o = orders.find(ord => ord.id === id);
    if (!o) return;

    if (o.status === 'جديد') {
        o.status = 'جارٍ التجهيز';
    } else if (o.status === 'جارٍ التجهيز') {
        o.status = 'تم التجهيز';
    } else if (o.status === 'تم التجهيز') {
        o.status = 'تم الشحن';
    } else if (o.status === 'تم الشحن') {
        o.status = 'تم التسليم';
    } else {
        alert('الأوردر مكتمل بالفعل.');
        return;
    }

    saveDataToCloud();
}

function makeReturnOrder(id) {
    if (currentUser.key !== 'admin') {
        alert('عذراً، خاصية عمل المرتجع متاح للحساب الرئيسي (الآدمن) فقط.');
        return;
    }

    const o = orders.find(ord => ord.id === id);
    if (!o) return;
    if (o.status === 'مرتجع') {
        alert('هذا الطلب تم إرجاعه مسبقاً.');
        return;
    }

    if (confirm(`هل أنت متأكد من عمل مرتجع للأوردر #${o.id}؟ سيتم رد الكمية للمخزن وإلغاء المبلغ.`)) {
        const p = products.find(item => item.id == o.productId);
        if (p) {
            if (typeof p.stock !== 'object') p.stock = { admin: 0, poultry: 0, gardens: 0 };
            const key = o.stockKeyUsed || 'admin';
            p.stock[key] = (p.stock[key] || 0) + o.qty;
        }

        o.status = 'مرتجع';
        saveDataToCloud();
        alert('تم تسجيل المرتجع ورد الكمية للمخزن وتحديث السحابة بنجاح.');
    }
}

function deleteOrder(id) {
    if (currentUser.key !== 'admin') {
        alert('خاصية حذف الحجوزات والأوردرات مخصصة للحساب الرئيسي (الآدمن) فقط.');
        return;
    }

    if (confirm(`هل أنت متأكد تماماً من حذف الأوردر #${id} نهائياً لتفريغ المساحة؟`)) {
        orders = orders.filter(o => o.id !== id);
        saveDataToCloud();
        alert('تم حذف الأوردر نهائياً وتحديث النظام سحابياً.');
    }
}

function renderOrders() {
    if(!currentUser.access.includes('orders')) return;
    const tbody = document.getElementById('orders-table-body');
    if(!tbody) return;

    let filteredOrders = orders;
    if (currentUser.key === 'nesma') {
        filteredOrders = orders.filter(o => o.createdBy !== 'الآدمن الرئيسي' && o.createdBy !== 'الآدمن');
    }

    const canManage = (currentUser.key !== 'nesma');
    const isAdmin = (currentUser.key === 'admin');

    tbody.innerHTML = filteredOrders.map(o => {
        let nextStepText = "تقدم";
        if (o.status === 'جديد') nextStepText = 'بدء التجهيز';
        else if (o.status === 'جارٍ التجهيز') nextStepText = 'تم التجهيز';
        else if (o.status === 'تم التجهيز') nextStepText = 'شحن الأوردر';
        else if (o.status === 'تم الشحن') nextStepText = 'تأكيد التسليم';

        return `
            <tr>
                <td><strong>#${o.id}</strong></td>
                <td><span style="color:var(--primary); font-weight:600;"><i class="fa-solid fa-store"></i> ${o.createdBy}</span></td>
                <td><strong>${o.customerName}</strong><br><span style="color:var(--text-muted); font-size:0.85rem;">هاتف: ${o.phone} | ${o.productName} (العدد: ${o.qty})</span></td>
                <td><strong style="color:var(--success);">${o.total} ج.م</strong></td>
                <td><span class="badge-status status-${o.status.replace(/\s+/g, '-')}">${o.status}</span></td>
                <td>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        ${canManage && o.status !== 'مرتجع' ? (o.status !== 'تم التسليم' ? `<button class="btn-secondary" onclick="advanceOrderStatus('${o.id}')">${nextStepText}</button>` : '<span style="color:var(--success); font-weight:bold; font-size:0.85rem;">منتهي</span>') : ''}
                        ${isAdmin && o.status !== 'مرتجع' ? `<button class="btn-danger" onclick="makeReturnOrder('${o.id}')"><i class="fa-solid fa-rotate-left"></i> مرتجع</button>` : ''}
                        ${o.status === 'مرتجع' ? '<span style="color:var(--danger); font-weight:bold;">تم الإرجاع</span>' : ''}
                        ${isAdmin ? `<button class="btn-danger" style="background:#444;" onclick="deleteOrder('${o.id}')"><i class="fa-solid fa-trash"></i> حذف</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات مسجلة حالياً</td></tr>';
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

    const validOrders = orders.filter(o => o.status !== 'مرتجع');
    grid.innerHTML = `
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-chart-line"></i></div><div class="info"><span>إجمالي المبيعات النشطة</span><h3>${validOrders.reduce((s,o)=>s+o.total,0)} ج.م</h3></div></div>
        <div class="stat-card"><div class="icon"><i class="fa-solid fa-users"></i></div><div class="info"><span>إجمالي العملاء المسجلين</span><h3>${customers.length} عميل</h3></div></div>
    `;
}
