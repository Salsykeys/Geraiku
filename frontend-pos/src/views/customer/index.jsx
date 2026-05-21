import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Api from '../../service/api';
import { useCustomerStore } from '../../stores/customer';
import { useCustomerCartStore } from '../../stores/customerCart';
import { handleCheckout } from '../../service/midtrans';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/getImageUrl';

export default function CustomerHome() {
    const navigate = useNavigate();
    const { customer, customerToken, customerLogout } = useCustomerStore();
    const { cartItems, addToCart, removeFromCart, updateQty } = useCustomerCartStore();

    // States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isCheckout, setIsCheckout] = useState(false);
    const [usePoints, setUsePoints] = useState(false);
    const [customerPoints, setCustomerPoints] = useState(0);

    // Fetch Categories
    const fetchCategories = async () => {
        try {
            const response = await Api.get('/api/categories-all');
            setCategories(response.data.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    // Fetch Products
    const fetchProducts = async (catId = null, query = "") => {
        setLoading(true);
        try {
            // Use random=true only if no category or search is specified for discovery
            const randomParam = (!catId && !query) ? '&random=true' : '';
            let url = `/api/products?limit=12&search=${query}${randomParam}`;
            if (catId) {
                url = `/api/products-by-category/${catId}?limit=12`;
            }
            const response = await Api.get(url);
            setProducts(response.data.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomerPoints = async () => {
        try {
            const token = useCustomerStore.getState().customerToken;
            const response = await Api.get('/api/customers/transactions?limit=1', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerPoints(response.data.customer_points || 0);
        } catch (error) {
            console.error("Error fetching points:", error);
        }
    };

    useEffect(() => {
        if (!customerToken) {
            navigate('/login');
            return;
        }
        fetchCategories();
        fetchProducts();
        fetchCustomerPoints();
    }, [customerToken, navigate]);

    const handleCategoryClick = (catId) => {
        if (selectedCategory === catId) {
            setSelectedCategory(null);
            fetchProducts(null, search);
        } else {
            setSelectedCategory(catId);
            fetchProducts(catId);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts(selectedCategory, search);
    };

    const handleLogout = () => {
        customerLogout();
        useCustomerCartStore.getState().clearCart();
        toast.success("Logout Berhasil!");
        navigate('/login');
    };

    // Currency Formatting
    const formatIDR = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    };

    const handleAddToCart = (product) => {
        if (product.stock <= 0) {
            toast.error("Stok produk tidak mencukupi!");
            return;
        }

        const existingItem = cartItems.find(item => item.product_id === product.id);
        const currentQty = existingItem ? existingItem.qty : 0;

        if (currentQty + 1 > product.stock) {
            toast.error(`Stok produk tidak mencukupi! Stok saat ini: ${product.stock}`);
            return;
        }

        addToCart(product);
        toast.success(`${product.title} masuk keranjang!`);
    };

    const cartTotal = cartItems.reduce((acc, item) => acc + item.total, 0);

    // K-Points Calculation
    const maxPointsAllowed = Math.floor(cartTotal / 2); // default max reduction is 50%
    const pointsToUse = usePoints ? Math.min(customerPoints, maxPointsAllowed) : 0;
    const finalCartTotal = cartTotal - pointsToUse;

    const onCheckout = async () => {
        if (cartItems.length === 0) return;
        setIsCheckout(true);
        try {
            const { status } = await handleCheckout(cartItems, customer, cartTotal, pointsToUse);
            if (status === 'success' || status === 'pending') {
                if (status === 'success') {
                    toast.success('Pembayaran berhasil! Terima kasih sudah belanja di Kiru! 🎉');
                } else {
                    toast.success('Pesananmu sudah dibuat! Segera selesaikan pembayaranmu ya.', { duration: 5000 });
                }

                useCustomerCartStore.getState().clearCart();

                // Cleanup body before navigation
                document.body.style.overflow = 'auto';
                document.body.classList.remove('modal-open');
                document.body.classList.remove('offcanvas-open');

                // Add small delay to allow Midtrans Snap scripts to finish background requests
                setTimeout(() => {
                    navigate('/customer/profile');
                }, 1000);
            }
        } catch (error) {
            if (error.message !== 'popup_closed') {
                toast.error(error.message || 'Checkout gagal. Coba lagi ya!');
            }
        } finally {
            setIsCheckout(false);
        }
    };

    return (
        <div className="page bg-light overflow-hidden">
            <style>
                {`
                .nav-glass {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }
                .search-pill {
                    border-radius: 50px;
                    border: 1px solid #e2e8f0;
                    padding: 0.5rem 1.5rem;
                    background: #f8fafc;
                    transition: all 0.3s ease;
                }
                .search-pill:focus-within {
                    border-color: #206bc4;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(32, 107, 196, 0.1);
                }
                .hero-banner {
                    background: linear-gradient(135deg, #206bc4 0%, #4299e1 100%);
                    border-radius: 2rem;
                    padding: 3rem;
                    color: white;
                    margin-top: 5rem;
                    position: relative;
                    overflow: hidden;
                }
                .cat-card {
                    padding: 1rem;
                    border-radius: 1rem;
                    background: white;
                    border: 1px solid #f1f5f9;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                    min-width: 100px;
                }
                .cat-card:hover {
                    border-color: #206bc4;
                    transform: translateY(-3px);
                    box-shadow: 0 10px 15px rgba(0,0,0,0.05);
                }
                .cat-card.active {
                    background: #206bc4;
                    color: white;
                    border-color: #206bc4;
                }
                .product-card {
                    border-radius: 1.25rem;
                    overflow: hidden;
                    border: 1px solid #f1f5f9;
                    transition: all 0.3s ease;
                    height: 100%;
                }
                .product-card:hover {
                    box-shadow: 0 15px 30px rgba(0,0,0,0.08);
                    transform: translateY(-5px);
                }
                .product-image-container {
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                    padding: 1rem;
                    position: relative;
                }
                .product-image {
                    max-height: 100%;
                    max-width: 100%;
                    object-fit: contain;
                }
                .btn-add-cart {
                    border-radius: 10px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }
                .btn-add-cart:hover {
                    transform: scale(1.02);
                }
                .floating-hero {
                    animation: floatHero 6s ease-in-out infinite;
                }
                @keyframes floatHero {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }
                .transform-hover {
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .transform-hover:hover {
                    transform: scale(1.05) translateY(-5px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                }
                /* Offcanvas utilities */
                .offcanvas {
                    border-radius: 1.5rem 0 0 1.5rem;
                }
                `}
            </style>

            {/* Navbar */}
            <header className="navbar navbar-expand-md nav-glass fixed-top d-print-none px-4">
                <div className="container-xl">
                    <h1 className="navbar-brand me-5">
                        <Link to="/customer" className="d-flex align-items-center text-decoration-none">
                            <img src="/images/logo-kirudoang.png" width="40" height="40" alt="Kiru" className="me-2" />
                            <span className="h1 mb-0 fw-bold text-primary">Kiru</span>
                        </Link>
                    </h1>

                    <div className="flex-fill mx-lg-5 d-none d-lg-block">
                        <form onSubmit={handleSearch}>
                            <div className="search-pill d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon text-muted me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                                <input
                                    type="text"
                                    className="form-control border-0 bg-transparent shadow-none"
                                    placeholder="Cari kebutuhan harianmu di sini..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary btn-sm rounded-pill px-3">Cari</button>
                            </div>
                        </form>
                    </div>

                    <div className="navbar-nav flex-row order-md-last gap-3 align-items-center">
                        {/* Cart Button */}
                        <div className="nav-item">
                            <button className="btn btn-ghost-primary rounded-pill position-relative" data-bs-toggle="offcanvas" data-bs-target="#cartOffcanvas" aria-controls="cartOffcanvas">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-shopping-cart" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17h-11v-14h-2" /><path d="M6 5l14 1l-1 7h-13" /></svg>
                                {cartItems.length > 0 && (
                                    <span className="badge bg-red position-absolute top-0 end-0 translate-middle rounded-pill px-2 pb-1" style={{ fontSize: '0.65rem' }}>
                                        {cartItems.reduce((acc, curr) => acc + curr.qty, 0)}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Profile Dropdown */}
                        <div className="nav-item dropdown">
                            <a href="#" className="nav-link d-flex lh-1 text-reset p-0 pe-2" data-bs-toggle="dropdown" aria-label="Open user menu">
                                <span className="avatar avatar-sm rounded-circle bg-blue-lt text-uppercase fw-bold">{customer?.name?.charAt(0)}</span>
                                <div className="d-none d-xl-block ps-2">
                                    <div className="fw-semibold text-dark">{customer?.name}</div>
                                    <div className="mt-1 small text-muted">Customer Member</div>
                                </div>
                            </a>
                            <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow rounded mt-3 shadow-sm border-0 pt-0 pb-0 overflow-hidden">
                                <Link to="/customer/profile" className="dropdown-item py-2 fw-medium">Profile</Link>
                                <div className="dropdown-divider m-0"></div>
                                <button onClick={handleLogout} className="dropdown-item py-2 text-danger fw-medium">Logout</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="page-wrapper px-4">
                <div className="container-xl">
                    {/* Hero Banner */}
                    <section className="hero-banner shadow-lg">
                        <div className="row align-items-center">
                            <div className="col-lg-7">
                                <h1 className="display-4 fw-extrabold mb-3">Belanja Hemat & <br />Cepat di <span className="text-warning">Kiru!</span></h1>
                                <p className="fs-2 mb-4 opacity-90">
                                    Kebutuhan dapur, snack favorit, hingga minuman segar siap kamu bawa pulang. Berkualitas, Lengkap, dan Terpercaya.
                                </p>
                                <div className="d-flex gap-3">
                                    <div className="bg-white rounded-4 px-4 py-3 shadow-lg transform-hover">
                                        <div className="h2 fw-bold mb-0 text-primary">Diskon 10%</div>
                                        <div className="small text-muted fw-semibold">Khusus Member Baru</div>
                                    </div>
                                    <div className="bg-white rounded-4 px-4 py-3 shadow-lg transform-hover">
                                        <div className="h2 fw-bold mb-0 text-primary">Cashback Poin</div>
                                        <div className="small text-muted fw-semibold">Tiap Belanja Rp 1.000</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-5 text-center d-none d-lg-block">
                                <img src="/images/hero_promo.png" alt="Promo Geraiku" className="img-fluid floating-hero" style={{ maxHeight: '400px', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.2))', borderRadius: '35px' }} />
                            </div>
                        </div>
                    </section>

                    {/* Categories Section */}
                    <section className="py-5 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <h2 className="h1 fw-bold mb-0">Categories</h2>
                        </div>
                        <div className="d-flex gap-3 overflow-auto pb-3 scroll-hide" style={{ scrollSnapType: 'x mandatory' }}>
                            {categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className={`cat-card flex-shrink-0 ${selectedCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => handleCategoryClick(cat.id)}
                                >
                                    <div className="avatar avatar-md bg-blue-lt rounded-circle mb-2">
                                        <img src={getImageUrl(cat.image)} className="rounded-circle p-1" alt="" />
                                    </div>
                                    <div className="small fw-bold">{cat.name}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Products Grid */}
                    <section className="py-4 min-vh-100 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h2 className="h1 fw-bold mb-1">
                                    {selectedCategory
                                        ? `Produk: ${categories.find(c => c.id === selectedCategory)?.name}`
                                        : search
                                            ? `Hasil Cari: "${search}"`
                                            : "For You"
                                    }
                                </h2>
                                <p className="text-secondary mb-0">Temukan barang berkualitas dengan harga terbaik.</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="row g-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="col-6 col-md-4 col-lg-3">
                                        <div className="card product-card p-3 border-0 bg-white placeholder-glow">
                                            <div className="ratio ratio-1x1 bg-light rounded-4 mb-3 placeholder"></div>
                                            <div className="placeholder col-8 mb-2"></div>
                                            <div className="placeholder col-5"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="row g-4">
                                {products.map((product) => (
                                    <div key={product.id} className="col-6 col-md-4 col-lg-3">
                                        <div className="card product-card bg-white">
                                            <div className="product-image-container">
                                                <img
                                                    src={getImageUrl(product.image)}
                                                    className="product-image"
                                                    alt={product.title}
                                                />
                                                {product.stock === 0 ? (
                                                    <span className="badge bg-danger position-absolute top-0 end-0 m-3">Stok produk kosong</span>
                                                ) : product.stock < 5 ? (
                                                    <span className="badge bg-warning position-absolute top-0 end-0 m-3 text-white">Stok produk menipis</span>
                                                ) : null}
                                            </div>
                                            <div className="card-body p-3">
                                                <div className="text-muted small mb-1">{product.category?.name}</div>
                                                <h3 className="h4 fw-bold mb-2 text-truncate" title={product.title}>
                                                    {product.title}
                                                </h3>
                                                <div className="d-flex align-items-center justify-content-between mt-auto">
                                                    <div>
                                                        <div className="h3 fw-extrabold text-primary mb-0">{formatIDR(product.sell_price)}</div>
                                                        <div className="small text-muted text-decoration-line-through">
                                                            {formatIDR(product.sell_price * 1.1)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-primary w-100 btn-add-cart mt-3"
                                                    onClick={() => handleAddToCart(product)}
                                                    disabled={product.stock <= 0}
                                                >
                                                    {product.stock <= 0 ? 'Stok produk kosong' : 'Masukkan Keranjang'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-7">
                                <img src="https://img.icons8.com/bubbles/200/search.png" alt="Empty" className="mb-4" />
                                <h3 className="fw-bold">Yah, Produk Nggak Ketemu...</h3>
                                <p className="text-secondary">Coba ganti kata kunci atau pilih kategori lain ya!</p>
                                <button className="btn btn-primary px-4" onClick={() => { setSearch(""); fetchProducts(); }}>Kembali Belanja</button>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Cart Offcanvas */}
            <div className="offcanvas offcanvas-end shadow-lg" tabIndex="-1" id="cartOffcanvas" aria-labelledby="cartOffcanvasLabel">
                <div className="offcanvas-header border-bottom py-3">
                    <h2 className="offcanvas-title d-flex align-items-center fw-bold" id="cartOffcanvasLabel">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon text-primary me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17h-11v-14h-2" /><path d="M6 5l14 1l-1 7h-13" /></svg>
                        Keranjang Anda
                    </h2>
                    <button type="button" className="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div className="offcanvas-body p-0 d-flex flex-column bg-light">
                    <div className="flex-grow-1 overflow-auto p-3">
                        {cartItems.length === 0 ? (
                            <div className="text-center py-5 h-100 d-flex flex-column align-items-center justify-content-center">
                                <img src="https://img.icons8.com/bubbles/150/shopping-cart.png" alt="Empty Cart" className="opacity-75 mb-3" />
                                <h4 className="text-muted fw-bold">Keranjangmu masih kosong</h4>
                                <p className="text-secondary small">Yuk, isi dengan barang kebutuhanmu!</p>
                                <button className="btn btn-primary btn-sm rounded-pill px-4 mt-2" data-bs-dismiss="offcanvas">Mulai Belanja</button>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {cartItems.map((item) => (
                                    <div key={item.product_id} className="card border-0 shadow-sm rounded-3 overflow-hidden">
                                        <div className="row g-0 align-items-center">
                                            <div className="col-3 p-2 text-center bg-white border-end">
                                                <img src={getImageUrl(item.image)} className="img-fluid rounded" alt={item.title} style={{ maxHeight: '60px', objectFit: 'contain' }} />
                                            </div>
                                            <div className="col-9">
                                                <div className="card-body p-2 pe-3">
                                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                                        <h5 className="mb-0 text-truncate pe-2 lh-sm" title={item.title}>{item.title}</h5>
                                                        <button onClick={() => removeFromCart(item.product_id)} className="btn-close opacity-50 hover-opacity-100" style={{ fontSize: '10px' }}></button>
                                                    </div>
                                                    <div className="text-primary fw-bold mb-2 small">{formatIDR(item.price)}</div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <button onClick={() => updateQty(item.product_id, Math.max(1, item.qty - 1))} className="btn btn-sm btn-icon btn-light rounded-circle border shadow-sm">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l14 0" /></svg>
                                                        </button>
                                                        <span className="fw-bold px-1" style={{ minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                                                        <button 
                                                            onClick={() => {
                                                                const product = products.find(p => p.id === item.product_id);
                                                                const maxStock = product ? product.stock : item.stock || 999;
                                                                if (item.qty + 1 > maxStock) {
                                                                    toast.error(`Stok produk tidak mencukupi! Stok saat ini: ${maxStock}`);
                                                                    return;
                                                                }
                                                                updateQty(item.product_id, item.qty + 1);
                                                            }} 
                                                            className="btn btn-sm btn-icon btn-light rounded-circle border shadow-sm"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                                                        </button>
                                                        <div className="ms-auto fw-bold text-dark small">
                                                            {formatIDR(item.total)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <div className="p-3 bg-white border-top shadow-sm position-sticky bottom-0">
                            {customerPoints > 0 && (
                                <div className="mb-3 p-3 rounded-4 d-flex justify-content-between align-items-center shadow-sm border-0"
                                    style={{
                                        background: 'linear-gradient(135deg, #206bc4 0%, #4299e1 100%)',
                                        color: 'white'
                                    }}>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bg-white p-1 rounded-circle shadow-sm" style={{ width: '40px', height: '37px' }}>
                                            <img src="/images/logo-kirudoang.png" alt="Kiru" className="img-fluid" />
                                        </div>
                                        <div>
                                            <div className="fw-bold fs-3 mb-0">K-Points ({customerPoints.toLocaleString()})</div>
                                            <div className="opacity-75" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Hemat hingga 50% transaksi!</div>
                                        </div>
                                    </div>
                                    <div className="form-check form-switch m-0 pb-1">
                                        <input
                                            className="form-check-input shadow-none bg-white border-white border-opacity-50"
                                            type="checkbox"
                                            role="switch"
                                            checked={usePoints}
                                            onChange={(e) => setUsePoints(e.target.checked)}
                                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted small">Subtotal</span>
                                <span className="fw-semibold text-dark small">{formatIDR(cartTotal)}</span>
                            </div>
                            {usePoints && pointsToUse > 0 && (
                                <div className="d-flex justify-content-between mb-2 text-success">
                                    <span className="small">Diskon K-Points</span>
                                    <span className="fw-semibold small">- {formatIDR(pointsToUse)}</span>
                                </div>
                            )}
                            <div className="d-flex justify-content-between mb-3 align-items-center border-top pt-2">
                                <span className="text-muted fw-semibold">Total Belanja</span>
                                <span className="h2 fw-bolder mb-0 text-primary">{formatIDR(finalCartTotal)}</span>
                            </div>
                            <button onClick={onCheckout} disabled={isCheckout} className="btn btn-primary w-100 rounded-pill py-2 shadow-sm fs-4 fw-bold">
                                {isCheckout ? 'Memproses...' : 'Checkout Sekarang'}
                                {!isCheckout && <svg xmlns="http://www.w3.org/2000/svg" className="icon ms-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l14 0" /><path d="M13 18l6 -6" /><path d="M13 6l6 6" /></svg>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="footer footer-transparent d-print-none py-6 border-top bg-white px-4">
                <div className="container-xl overflow-hidden">
                    <div className="row g-4 mb-5">
                        <div className="col-md-4">
                            <div className="mb-3 d-flex align-items-center">
                                <img src="/images/logo-kirudoang.png" width="40" height="40" alt="Geraiku" className="me-2" />
                                <span className="h1 fw-bold mb-0 text-primary">Kiru</span>
                            </div>
                            <p className="text-secondary lh-lg pe-md-5">
                                Belanja kebutuhan harian jadi lebih mudah, murah, dan cepat bersama kiru. Dekat di hati, hemat di kantong!
                            </p>
                        </div>
                    </div>
                    <div className="row text-center border-top pt-4 overflow-hidden">
                        <div className="col-12">
                            <p className="text-secondary mb-0">
                                Copyright &copy; 2026 <strong>Kiru Superstore</strong>. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
