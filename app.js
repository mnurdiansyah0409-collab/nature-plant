// Nature Plant - Core Logic & E-commerce System

// --- Constants & Config ---
const WHATSAPP_NUMBER = "6281234567890"; // Nomor WhatsApp Penjual
const SHIPPING_FEES = {
    "REG": 15000,
    "EXP": 30000,
    "GOSEND": 25000,
    "COD": 0
};

// --- Application State ---
let products = [];
let cart = [];
let currentCategory = "all";
let searchQuery = "";
let editingProductId = null; // Menyimpan ID produk yang sedang diedit

// --- DOM Elements ---
const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterPills = document.getElementById("filterPills");

const cartOverlay = document.getElementById("cartOverlay");
const cartDrawer = document.getElementById("cartDrawer");
const cartToggleBtn = document.getElementById("cartToggleBtn");
const cartCloseBtn = document.getElementById("cartCloseBtn");
const cartBadge = document.getElementById("cartBadge");
const cartItemsContainer = document.getElementById("cartItems");
const orderFormContainer = document.getElementById("orderFormContainer");
const orderForm = document.getElementById("orderForm");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartShippingEl = document.getElementById("cartShipping");
const cartTotalEl = document.getElementById("cartTotal");
const shippingMethodSelect = document.getElementById("shippingMethod");
const checkoutBtn = document.getElementById("checkoutBtn");
const shopNowBtn = document.getElementById("shopNowBtn");

const productModal = document.getElementById("productModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalBody = document.getElementById("modalBody");

const adminModal = document.getElementById("adminModal");
const openAdminBtn = document.getElementById("openAdminBtn");
const adminCloseBtn = document.getElementById("adminCloseBtn");
const adminProductForm = document.getElementById("adminProductForm");
const adminFormTitle = document.getElementById("adminFormTitle");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const adminProductTableBody = document.getElementById("adminProductTableBody");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const resetProductsBtn = document.getElementById("resetProductsBtn");

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

// Load initial data
async function initApp() {
    // 1. Load Cart from localStorage
    const savedCart = localStorage.getItem("np_cart");
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
    updateCartUI();

    // 2. Load Products from localStorage or JSON
    const savedProducts = localStorage.getItem("np_products");
    if (savedProducts) {
        try {
            products = JSON.parse(savedProducts);
            renderCatalog();
            renderAdminTable();
        } catch (e) {
            await fetchProductsFromJson();
        }
    } else {
        await fetchProductsFromJson();
    }

    // Initialize Lucide icons
    lucide.createIcons();
}

async function fetchProductsFromJson() {
    try {
        const response = await fetch("products.json");
        if (!response.ok) throw new Error("Gagal mengambil data produk.");
        products = await response.json();
        saveProductsToStorage();
        renderCatalog();
        renderAdminTable();
    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = `
            <div class="loading-state">
                <i data-lucide="alert-triangle" style="width:48px;height:48px;color:var(--danger-color);margin-bottom:1rem;"></i>
                <p>Gagal memuat katalog tanaman hias. Silakan muat ulang halaman.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function saveProductsToStorage() {
    localStorage.setItem("np_products", JSON.stringify(products));
}

function saveCartToStorage() {
    localStorage.setItem("np_cart", JSON.stringify(cart));
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Search
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery ? "block" : "none";
        renderCatalog();
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.style.display = "none";
        renderCatalog();
    });

    // Filters
    filterPills.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-btn")) {
            document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
            e.target.classList.add("active");
            currentCategory = e.target.getAttribute("data-category");
            renderCatalog();
        }
    });

    // Cart Drawer Toggle
    cartToggleBtn.addEventListener("click", openCart);
    cartCloseBtn.addEventListener("click", closeCart);
    cartOverlay.addEventListener("click", closeCart);
    if (shopNowBtn) {
        shopNowBtn.addEventListener("click", closeCart);
    }

    // Shipping Cost Change
    shippingMethodSelect.addEventListener("change", updateCartUI);

    // Checkout Form
    checkoutBtn.addEventListener("click", handleCheckout);

    // Modals
    modalCloseBtn.addEventListener("click", () => {
        productModal.classList.remove("active");
    });
    productModal.addEventListener("click", (e) => {
        if (e.target === productModal) productModal.classList.remove("active");
    });

    // Admin Panel
    openAdminBtn.addEventListener("click", openAdmin);
    adminCloseBtn.addEventListener("click", closeAdmin);
    adminModal.addEventListener("click", (e) => {
        if (e.target === adminModal) closeAdmin();
    });

    adminProductForm.addEventListener("submit", handleProductSubmit);
    cancelEditBtn.addEventListener("click", resetAdminForm);
    exportJsonBtn.addEventListener("click", exportProductsAsJson);
    resetProductsBtn.addEventListener("click", resetProductsToDefault);

    // Mobile Navigation Hamburger Menu Toggle
    const menuToggleBtn = document.getElementById("menuToggleBtn");
    const navMenu = document.getElementById("navMenu");
    menuToggleBtn.addEventListener("click", () => {
        navMenu.classList.toggle("active");
        const icon = menuToggleBtn.querySelector("i");
        if (navMenu.classList.contains("active")) {
            icon.setAttribute("data-lucide", "x");
        } else {
            icon.setAttribute("data-lucide", "menu");
        }
        lucide.createIcons();
    });

    // Close mobile nav menu when clicking links
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("active");
            document.getElementById("menuToggleBtn").querySelector("i").setAttribute("data-lucide", "menu");
            lucide.createIcons();
            
            // Mark active
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

// --- Format Currency (Rupiah) ---
function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(value);
}

// --- Catalog Rendering ---
function renderCatalog() {
    let filtered = products;

    // Filter by Category
    if (currentCategory !== "all") {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    // Filter by Search Query
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            (p.scientificName && p.scientificName.toLowerCase().includes(searchQuery)) ||
            p.description.toLowerCase().includes(searchQuery)
        );
    }

    if (filtered.length === 0) {
        productGrid.innerHTML = `
            <div class="loading-state">
                <i data-lucide="search-code" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:1rem;"></i>
                <p>Tidak ada tanaman yang cocok dengan pencarian Anda.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    productGrid.innerHTML = filtered.map(p => {
        // Tag HTML
        const badgesHtml = (p.tags || []).map(t => {
            const badgeClass = t.toLowerCase() === "terlaris" ? "badge-seller" : "badge-new";
            return `<span class="badge ${badgeClass}">${t}</span>`;
        }).join("");

        return `
            <div class="product-card">
                <div class="product-img-box">
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                    <div class="product-badges">
                        ${badgesHtml}
                    </div>
                </div>
                <div class="product-content">
                    <span class="product-category">${p.categoryName || formatCategoryName(p.category)}</span>
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-scientific">${p.scientificName || ""}</p>
                    <div class="product-rating">
                        <i data-lucide="star" class="star-icon"></i>
                        <span class="rating-num">${p.rating || "4.8"}</span>
                        <span class="reviews-num">(${p.reviews || "12"})</span>
                    </div>
                    <div class="product-footer">
                        <span class="product-price">${formatRupiah(p.price)}</span>
                        <div class="product-actions">
                            <button class="btn-icon" onclick="viewProductDetail('${p.id}')" title="Detail Tanaman">
                                <i data-lucide="info"></i>
                            </button>
                            <button class="btn-icon btn-add-cart" onclick="addToCart('${p.id}')" title="Tambah ke Keranjang">
                                <i data-lucide="shopping-cart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
}

function formatCategoryName(cat) {
    if (cat === "tanaman_hias") return "Tanaman Hias";
    if (cat === "tanaman_buah") return "Tanaman Buah";
    if (cat === "bibit") return "Bibit";
    return cat;
}

// --- Detail Product Modal ---
window.viewProductDetail = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    modalBody.innerHTML = `
        <div class="detail-layout">
            <div class="detail-img-box">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="detail-info">
                <span class="detail-category">${product.categoryName || formatCategoryName(product.category)}</span>
                <h2 class="detail-title">${product.name}</h2>
                <p class="detail-scientific">${product.scientificName || ""}</p>
                <div class="detail-price">${formatRupiah(product.price)}</div>
                <p class="detail-desc">${product.description}</p>
                
                <div class="care-guide-box">
                    <h4><i data-lucide="heart-handshake" style="display:inline;width:16px;margin-right:4px;"></i> Panduan Perawatan:</h4>
                    <div class="care-guide-items">
                        <div class="care-guide-item">
                            <i data-lucide="droplet"></i>
                            <div>
                                <h5>Penyiraman</h5>
                                <p>${product.care?.water || "Siram secukupnya saat permukaan tanah mengering."}</p>
                            </div>
                        </div>
                        <div class="care-guide-item">
                            <i data-lucide="sun"></i>
                            <div>
                                <h5>Pencahayaan</h5>
                                <p>${product.care?.light || "Letakkan di tempat teduh dengan sirkulasi udara baik."}</p>
                            </div>
                        </div>
                        <div class="care-guide-item">
                            <i data-lucide="gauge"></i>
                            <div>
                                <h5>Kesulitan Perawatan</h5>
                                <p>Tingkat: <strong>${product.care?.difficulty || "Mudah"}</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-block btn-detail-add" onclick="addToCartFromDetail('${product.id}')">
                    <i data-lucide="shopping-cart"></i> Masukkan Keranjang
                </button>
            </div>
        </div>
    `;

    productModal.classList.add("active");
    lucide.createIcons();
}

window.addToCartFromDetail = function(productId) {
    addToCart(productId);
    productModal.classList.remove("active");
}

// --- Cart Logic & UI Updates ---
function openCart() {
    cartDrawer.classList.add("active");
    cartOverlay.classList.add("active");
}

function closeCart() {
    cartDrawer.classList.remove("active");
    cartOverlay.classList.remove("active");
}

window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingCartItem = cart.find(item => item.product.id === productId);

    if (existingCartItem) {
        existingCartItem.quantity += 1;
    } else {
        cart.push({
            product: product,
            quantity: 1
        });
    }

    saveCartToStorage();
    updateCartUI();
    openCart();
};

window.updateQuantity = function(productId, change) {
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    cartItem.quantity += change;

    if (cartItem.quantity <= 0) {
        cart = cart.filter(item => item.product.id !== productId);
    }

    saveCartToStorage();
    updateCartUI();
};

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    saveCartToStorage();
    updateCartUI();
};

function getCartSubtotal() {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
}

function updateCartUI() {
    // 1. Update Navigation Cart Badge
    const count = getCartCount();
    cartBadge.textContent = count;

    if (count === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-state">
                <i data-lucide="shopping-cart"></i>
                <p>Keranjang belanja Anda masih kosong.</p>
                <a href="#katalog" class="btn btn-primary btn-sm" onclick="closeCart()">Mulai Belanja</a>
            </div>
        `;
        orderFormContainer.style.display = "none";
        document.getElementById("cartFooter").style.display = "none";
        lucide.createIcons();
        return;
    }

    // 2. Render Cart Items
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.product.image}" alt="${item.product.name}" class="cart-item-img">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.product.name}</h4>
                <div class="cart-item-price">${formatRupiah(item.product.price)}</div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateQuantity('${item.product.id}', -1)">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.product.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.product.id}')" title="Hapus item">
                <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
            </button>
        </div>
    `).join("");

    // 3. Show Form and Footer
    orderFormContainer.style.display = "block";
    document.getElementById("cartFooter").style.display = "block";

    // 4. Calculate Totals
    const subtotal = getCartSubtotal();
    const shippingMethod = shippingMethodSelect.value;
    const shippingCost = SHIPPING_FEES[shippingMethod] ?? 15000;
    const grandTotal = subtotal + shippingCost;

    cartSubtotalEl.textContent = formatRupiah(subtotal);
    cartShippingEl.textContent = shippingCost === 0 ? "Free Ongkir" : formatRupiah(shippingCost);
    cartTotalEl.textContent = formatRupiah(grandTotal);

    lucide.createIcons();
}

// --- WhatsApp Checkout Form Submission ---
function handleCheckout() {
    const name = document.getElementById("orderName").value.trim();
    const phone = document.getElementById("orderPhone").value.trim();
    const address = document.getElementById("orderAddress").value.trim();
    const shippingMethod = shippingMethodSelect.value;
    const notes = document.getElementById("orderNotes").value.trim();

    if (!name || !phone || !address) {
        alert("Mohon lengkapi data Nama, Nomor WhatsApp, dan Alamat Pengiriman Anda!");
        return;
    }

    const subtotal = getCartSubtotal();
    const shippingCost = SHIPPING_FEES[shippingMethod] ?? 15000;
    const grandTotal = subtotal + shippingCost;

    const shippingText = {
        "REG": "Reguler (2-4 hari kerja)",
        "EXP": "Express Kilat (1-2 hari kerja)",
        "GOSEND": "Ojek Online (Sameday/Instant)",
        "COD": "Ambil Langsung di Toko"
    }[shippingMethod];

    // Format list produk belanjaan
    let itemsText = "";
    cart.forEach((item, index) => {
        itemsText += `${index + 1}. *${item.product.name}* (Qty: ${item.quantity}) - ${formatRupiah(item.product.price * item.quantity)}\n`;
    });

    // Format WhatsApp message
    const message = `Halo *Nature Plant*, saya ingin memesan tanaman hias berikut:\n\n` +
        `*DAFTAR BELANJAAN:*\n` +
        `${itemsText}\n` +
        `*RINCIAN PEMBAYARAN:*\n` +
        `- Subtotal: ${formatRupiah(subtotal)}\n` +
        `- Ongkos Kirim (${shippingText}): ${shippingCost === 0 ? 'Gratis' : formatRupiah(shippingCost)}\n` +
        `- *Total Bayar: ${formatRupiah(grandTotal)}*\n\n` +
        `*DATA PENGIRIMAN:*\n` +
        `- Nama Penerima: ${name}\n` +
        `- No. WhatsApp: ${phone}\n` +
        `- Alamat Lengkap: ${address}\n` +
        (notes ? `- Catatan: ${notes}\n` : "") +
        `\nMohon segera info instruksi transfer rekening pembayaran. Terima kasih!`;

    // Encode text message for URL
    const encodedText = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodedText}`;

    // Open WhatsApp
    window.open(waUrl, "_blank");

    // Clear cart after redirect
    cart = [];
    saveCartToStorage();
    updateCartUI();
    closeCart();
    alert("Pesanan Anda sedang diteruskan ke WhatsApp Nature Plant!");
}

// --- Admin Panel Actions ---
function openAdmin() {
    adminModal.classList.add("active");
    renderAdminTable();
}

function closeAdmin() {
    adminModal.classList.remove("active");
    resetAdminForm();
}

function renderAdminTable() {
    if (products.length === 0) {
        adminProductTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Belum ada produk terdaftar.</td>
            </tr>
        `;
        return;
    }

    adminProductTableBody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image}" alt="${p.name}" class="admin-table-img"></td>
            <td>
                <div class="admin-row-name">${p.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-style:italic;">${p.scientificName || ""}</div>
            </td>
            <td><span class="admin-table-badge badge-${p.category}">${p.categoryName || formatCategoryName(p.category)}</span></td>
            <td style="font-weight:600;">${formatRupiah(p.price)}</td>
            <td>
                <div class="admin-table-actions">
                    <button class="btn-table-icon btn-edit" onclick="editProduct('${p.id}')" title="Edit">
                        <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
                    </button>
                    <button class="btn-table-icon btn-delete" onclick="deleteProduct('${p.id}')" title="Hapus">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    lucide.createIcons();
}

// Handle Add or Edit Product Submit
function handleProductSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("editProductId").value;
    const name = document.getElementById("adminName").value.trim();
    const scientificName = document.getElementById("adminScientific").value.trim();
    const category = document.getElementById("adminCategory").value;
    const price = parseInt(document.getElementById("adminPrice").value, 10);
    const image = document.getElementById("adminImage").value;
    const description = document.getElementById("adminDesc").value.trim();
    const careDiff = document.getElementById("adminCareDiff").value;
    const careWater = document.getElementById("adminCareWater").value.trim();
    const careLight = document.getElementById("adminCareLight").value.trim();
    
    const tagsInput = document.getElementById("adminTags").value.trim();
    const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(t => t) : [];

    const categoryName = formatCategoryName(category);

    const productData = {
        id: id || "p_" + Date.now(),
        name,
        scientificName,
        category,
        categoryName,
        price,
        rating: 4.8, // default rating baru
        reviews: 1,  // default review baru
        image,
        description,
        tags,
        care: {
            water: careWater || "Siram secukupnya",
            light: careLight || "Sinar matahari sedang",
            difficulty: careDiff
        }
    };

    if (id) {
        // Edit Mode
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = productData;
            alert("Produk berhasil diperbarui!");
        }
    } else {
        // Add Mode
        products.push(productData);
        alert("Produk baru berhasil ditambahkan!");
    }

    saveProductsToStorage();
    renderCatalog();
    renderAdminTable();
    resetAdminForm();
}

// Edit Product Form Prefill
window.editProduct = function(productId) {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    document.getElementById("editProductId").value = p.id;
    document.getElementById("adminName").value = p.name;
    document.getElementById("adminScientific").value = p.scientificName || "";
    document.getElementById("adminCategory").value = p.category;
    document.getElementById("adminPrice").value = p.price;
    document.getElementById("adminImage").value = p.image;
    document.getElementById("adminDesc").value = p.description;
    document.getElementById("adminCareDiff").value = p.care?.difficulty || "Mudah";
    document.getElementById("adminCareWater").value = p.care?.water || "";
    document.getElementById("adminCareLight").value = p.care?.light || "";
    document.getElementById("adminTags").value = (p.tags || []).join(", ");

    adminFormTitle.textContent = "Edit Data Produk";
    document.getElementById("saveProductBtn").textContent = "Update Produk";
    cancelEditBtn.style.display = "inline-flex";
}

// Reset Form State
function resetAdminForm() {
    adminProductForm.reset();
    document.getElementById("editProductId").value = "";
    adminFormTitle.textContent = "Tambah Produk Baru";
    document.getElementById("saveProductBtn").textContent = "Simpan Produk";
    cancelEditBtn.style.display = "none";
}

// Delete Product
window.deleteProduct = function(productId) {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini dari katalog?")) return;

    products = products.filter(p => p.id !== productId);
    saveProductsToStorage();
    renderCatalog();
    renderAdminTable();
    
    // Clear product from cart if it's there
    if (cart.some(item => item.product.id === productId)) {
        cart = cart.filter(item => item.product.id !== productId);
        saveCartToStorage();
        updateCartUI();
    }
}

// Export database as JSON file so admin can copy/paste it into products.json permanently
function exportProductsAsJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "products.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Reset database to default JSON values
async function resetProductsToDefault() {
    if (!confirm("Apakah Anda yakin ingin meriset semua produk kembali ke pengaturan bawaan awal? Semua produk tambahan akan terhapus.")) return;
    localStorage.removeItem("np_products");
    await fetchProductsFromJson();
    alert("Katalog produk telah direset ke pengaturan awal!");
}
