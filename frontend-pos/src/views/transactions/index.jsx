import { useState, useEffect, useRef } from 'react';
import LayoutAdmin from "../../layouts/admin";
import Api from "../../service/api";
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import ProductList from "./components/ProductList";
import CategoryList from "./components/CategoryList";
import OrderItemList from "./components/OrderItemList";
import moneyFormat from "../../utils/moneyFormat";
import PaginationComponent from "../../components/Pagination";
import Payment from './components/Payment';

export default function TransactionsIndex() {

    const [products, setProducts] = useState([]);

    const [pagination, setPagination] = useState({
        currentPage: 1,
        perPage: 0,
        total: 0
    });


    const [barcode, setBarcode] = useState("");
    const searchInputRef = useRef(null);
    const [categories, setCategories] = useState([]);
    const [currentCategoryId, setCurrentCategoryId] = useState(null);
    const [carts, setCarts] = useState([]);
    const [totalCarts, setTotalCarts] = useState(0);
    const token = Cookies.get("token");

    const fetchProducts = async (pageNumber) => {

        if (token) {
            const page = pageNumber ? pageNumber : pagination.currentPage;
            Api.defaults.headers.common['Authorization'] = token;
            await Api.get(`/api/products?page=${page}&limit=9`)
                .then(response => {
                    setProducts(response.data.data);
                    setPagination({
                        currentPage: response.data.pagination.currentPage,
                        perPage: response.data.pagination.perPage,
                        total: response.data.pagination.total
                    });
                });

        }
    }

    const fetchProductByBarcode = async (barcode) => {
        if (token) {
            Api.defaults.headers.common['Authorization'] = token;

            await Api.post('/api/products-by-barcode', {
                barcode: barcode
            })
                .catch(barcode.trim(''))
                .then(response => {
                    setProducts(response.data.data);
                    barcode.trim('')
                });
                
        }
    }

    const searchHandler = (e) => {
        setBarcode(e.target.value);
        fetchProductByBarcode(e.target.value);
    }


    const fetchCategories = async () => {

        if (token) {
            Api.defaults.headers.common['Authorization'] = token;

            await Api.get('/api/categories-all')
                .then(response => {

                    setCategories(response.data.data);
                });

        }
    }

    const fetchProductByCategoryID = async (categoryId, pageNumber) => {

        if (token) {
            const page = pageNumber ? pageNumber : pagination.currentPage;
            Api.defaults.headers.common['Authorization'] = token;

            await Api.get(`/api/products-by-category/${categoryId}?page=${page}&limit=9`)
                .then(response => {
                    setProducts(response.data.data);
                    setPagination({
                        currentPage: response.data.pagination.currentPage,
                        perPage: response.data.pagination.perPage,
                        total: response.data.pagination.total
                    });
                });
        }
    }

    const fetchCarts = async () => {

        if (token) {
            Api.defaults.headers.common['Authorization'] = token;

            await Api.get('/api/carts')
                .then(response => {

                    setCarts(response.data.data);


                    setTotalCarts(response.data.totalPrice);
                });
        }
    }

    
    const handleBarcodeSubmit = async (e) => {
        e.preventDefault();

        if (barcode === "") return;

        if (token) {
            Api.defaults.headers.common['Authorization'] = token;

            await Api.post('/api/products-by-barcode', {
                barcode: barcode
            })
                .then(async (response) => {
                    if (response.data.data.length > 0) {
                        const product = response.data.data[0];

                        if (product.stock <= 0) {
                            toast.error("Stok produk tidak mencukupi", {
                                duration: 4000,
                                position: "top-right",
                                style: {
                                    borderRadius: '10px',
                                    background: '#333',
                                    color: '#fff',
                                },
                            });
                            return;
                        }

                        // Add to cart
                        await Api.post('/api/carts', {
                            product_id: product.id,
                            qty: 1,
                            price: product.sell_price
                        })
                            .then(response => {
                                toast.success(`${response.data.meta.message}`, {
                                    duration: 4000,
                                    position: "top-right",
                                    style: {
                                        borderRadius: '10px',
                                        background: '#333',
                                        color: '#fff',
                                    },
                                });

                                fetchCarts();
                                setBarcode("");
                                fetchProducts();
                            })
                            .catch(error => {
                                const message = error.response?.data?.meta?.message || "Gagal menambahkan ke keranjang";
                                toast.error(message, {
                                    duration: 4000,
                                    position: "top-right",
                                    style: {
                                        borderRadius: '10px',
                                        background: '#333',
                                        color: '#fff',
                                    },
                                });
                            });
                    } else {
                        toast.error("Product not found", {
                            duration: 4000,
                            position: "top-right",
                            style: {
                                borderRadius: '10px',
                                background: '#333',
                                color: '#fff',
                            },
                        });
                    }
                });
        }
    }


    //hook
    useEffect(() => {

        fetchProducts();
        fetchCategories();
        fetchCarts();

        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }



    }, []);

    return (
        <LayoutAdmin>
            <div className="page-body">
                <div className="container-xl">
                    <div className="row">
                        <div className="col-md-8 mb-3">
                            {/* Search and Scan Barcode */}
                            <form onSubmit={handleBarcodeSubmit} autoComplete="off" noValidate>
                                <div className="input-icon">
                                    <span className="input-icon-addon">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                                    </span>
                                    <input type="text" className="form-control" placeholder="Scan Barcode" value={barcode} onChange={(e) => searchHandler(e)} ref={searchInputRef} />
                                </div>
                            </form>

                            {/* Category List */}
                            <CategoryList
                                categories={categories}
                                fetchProducts={fetchProducts}
                                fetchProductByCategoryID={fetchProductByCategoryID}
                                setCurrentCategoryId={setCurrentCategoryId}
                            />

                            {/* Product List */}
                            <ProductList products={products} fetchCarts={fetchCarts} />

                            {/* Pagination */}
                            <div className='row mt-3'>
                                <PaginationComponent
                                    currentPage={pagination.currentPage}
                                    perPage={pagination.perPage}
                                    total={pagination.total}
                                    onChange={(pageNumber) => {
                                        if (currentCategoryId) {
                                            fetchProductByCategoryID(currentCategoryId, pageNumber);
                                        } else {
                                            fetchProducts(pageNumber);
                                        }
                                    }}
                                    position="center"
                                />
                            </div>

                        </div>
                        <div className="col-md-4">
                            <div className="card rounded">
                                <div className="card-header p-3">
                                    <h3 className='mb-0'>
                                        ORDER ITEMS
                                    </h3>
                                </div>
                                <div className="card-body scrollable-card-body p-0">
                                    {/* Order Items */}
                                    <OrderItemList carts={carts} fetchCarts={fetchCarts} />
                                </div>
                                <div className='card-body'>
                                    <div className='mt-3'>
                                        <h3 className='float-end'>{moneyFormat(totalCarts)}</h3>
                                        <h3 className='mb-0'>Total ({carts.length} Items)</h3>
                                    </div>
                                    <hr />
                                    <Payment totalCarts={totalCarts} fetchCarts={fetchCarts} />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </LayoutAdmin>
    )
}
