import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Api from '../../service/api';
import { useStore } from '../../stores/user';
import { useCustomerStore } from '../../stores/customer';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/getImageUrl';

export default function Home() {
    const { token } = useStore();
    const { customerToken } = useCustomerStore();

    // States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);

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
            // Use random=true only if no category or search is specified
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

    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, []);

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



    // Currency Formatting
    const formatIDR = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
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
                .floating-cart {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    z-index: 1000;
                }
                .floating-hero {
                    animation: floatHero 6s ease-in-out infinite;
                    max-height: 220px;
                }
                @media (min-width: 992px) {
                    .floating-hero {
                        max-height: 400px;
                    }
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
                `}
            </style>

            {/* Navbar */}
            <header className="navbar navbar-expand-md nav-glass fixed-top d-print-none px-4">
                <div className="container-xl">
                    <h1 className="navbar-brand me-5">
                        <Link to="/" className="d-flex align-items-center text-decoration-none">
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
                        <div className="nav-item d-none d-sm-block">
                            <Link to="/customer" className="btn btn-ghost-primary rounded-pill fw-bold">
                                {customerToken ? 'Pojok Saya' : 'Cek Poin'}
                            </Link>
                        </div>
                        <div className="nav-item">
                            {customerToken ? (
                                <Link to="/customer" className="nav-link d-flex align-items-center gap-2">
                                    <span className="avatar avatar-sm rounded-circle bg-blue-lt">C</span>
                                    <span className="d-none d-lg-inline fw-bold text-dark">Customer</span>
                                </Link>
                            ) : token ? (
                                <Link to="/dashboard" className="btn btn-primary rounded-pill px-4 fw-bold">Dashboard</Link>
                            ) : (
                                <Link to="/login" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm">Masuk</Link>
                            )}
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

                                {/* Mobile Search Bar */}
                                <div className="d-block d-lg-none mb-4">
                                    <form onSubmit={handleSearch}>
                                        <div className="search-pill d-flex align-items-center bg-white shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="icon text-muted me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                                            <input
                                                type="text"
                                                className="form-control border-0 bg-transparent shadow-none text-dark"
                                                placeholder="Cari kebutuhan harianmu..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            <button type="submit" className="btn btn-primary btn-sm rounded-pill px-3">Cari</button>
                                        </div>
                                    </form>
                                </div>

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
                            <div className="col-lg-5 text-center mt-4 mt-lg-0">
                                <img src="/images/hero_promo.png" alt="Promo Kiru" className="img-fluid floating-hero" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.2))', borderRadius: '35px' }} />
                            </div>
                        </div>
                    </section>

                    {/* Categories Section */}
                    <section className="py-5 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <h2 className="h1 fw-bold mb-0">Kategori Pilihan</h2>
                            <Link to="#" className="text-primary fw-bold text-decoration-none">Lihat Semua</Link>
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
                                            : "Terlaris Untukmu"
                                    }
                                </h2>
                                <p className="text-secondary mb-0">Temukan barang berkualitas dengan harga terbaik.</p>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-white btn-icon"><svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" /></svg></button>
                                <button className="btn btn-white btn-icon active"><svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /></svg></button>
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
                                                    onClick={() => toast.error(`Silahkan login terlebih dahulu`)}
                                                >
                                                    Masukkan Keranjang
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

            {/* Footer */}
            <footer className="footer footer-transparent d-print-none py-6 border-top bg-white px-4">
                <div className="container-xl overflow-hidden">
                    <div className="row g-4 mb-5">
                        <div className="col-md-4">
                            <div className="mb-3 d-flex align-items-center">
                                <img src="/images/logo-kirudoang.png" width="40" height="40" alt="Kiru" className="me-2" />
                                <span className="h1 fw-bold mb-0 text-primary">Kiru</span>
                            </div>
                            <p className="text-secondary lh-lg pe-md-5">
                                Belanja kebutuhan harian jadi lebih mudah, murah, dan cepat bersama Kiru. Dekat di hati, hemat di kantong!
                            </p>
                        </div>
                        <div className="col-md-2 offset-md-1">
                            <h4 className="fw-bold mb-4">Layanan</h4>
                            <ul className="list-unstyled">
                                <li className="mb-2"><Link to="#" className="link-secondary text-decoration-none">Cek Poin Member</Link></li>
                                <li className="mb-2"><Link to="#" className="link-secondary text-decoration-none">Cara Belanja</Link></li>
                                <li className="mb-2"><Link to="#" className="link-secondary text-decoration-none">FAQ</Link></li>
                            </ul>
                        </div>
                        <div className="col-md-2">
                            <h4 className="fw-bold mb-4">Metode Bayar</h4>
                            <div className="d-flex flex-wrap gap-2">
                                <span className="badge bg-light text-dark p-2 border">GOPAY</span>
                                <span className="badge bg-light text-dark p-2 border">OVO</span>
                                <span className="badge bg-light text-dark p-2 border">QRIS</span>
                                <span className="badge bg-light text-dark p-2 border">Bank Virtual Account</span>
                                <span className="badge bg-light text-dark p-2 border">Credit/Debit Card</span>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <h4 className="fw-bold mb-4">Ikuti Kami</h4>
                            <div className="d-flex gap-3">
                                <Link to="#" className="btn btn-icon btn-white rounded-circle"><svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" /></svg></Link>
                                <Link to="#" className="btn btn-icon btn-white rounded-circle"><svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 4m0 4a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M16.5 7.5l0 .01" /></svg></Link>
                                <Link to="#" className="btn btn-icon btn-white rounded-circle"><svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 21l1.65 -4.8a9 9 0 1 1 3.45 3.45l-5.1 1.35" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" /></svg></Link>
                            </div>
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
