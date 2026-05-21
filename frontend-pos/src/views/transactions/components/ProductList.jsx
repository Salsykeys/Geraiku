import moneyFormat from "../../../utils/moneyFormat";
import { getImageUrl } from "../../../utils/getImageUrl";
import Api from "../../../service/api";
import Cookies from 'js-cookie';
import toast from "react-hot-toast";

export default function ProductList({ products, fetchCarts }) {

    const token = Cookies.get("token");

    const addToCart = (product) => {
        if (product.stock <= 0) {
            toast.error("Stok produk tidak mencukupi!", {
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

        if (token) {
            Api.defaults.headers.common['Authorization'] = token;

            Api.post('/api/carts', {
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
        }
    }

    return (
        <div className='row mt-3'>
            {
                products.length > 0
                    ? products.map((product) => (
                        <div className='col-4' key={product.id}>
                            <div className="card card-link card-link-pop mt-3 rounded">
                                <div className="ribbon bg-success mt-3">
                                    <h4 className="mb-0">{moneyFormat(product.sell_price)}</h4>
                                </div>
                                <div className="card-body text-center">
                                    <img
                                        src={getImageUrl(product.image)}
                                        alt={product.title}
                                        className="me-2 rounded"
                                    />
                                    <h4 className="mb-0 mt-2">{product.title}</h4>

                                    <div className="mt-2">
                                        {product.stock === 0 ? (
                                            <span className="badge bg-danger">Stok produk kosong</span>
                                        ) : product.stock < 5 ? (
                                            <span className="badge bg-warning text-white">Stok produk menipis ({product.stock})</span>
                                        ) : (
                                            <span className="badge bg-secondary-lt">Stok: {product.stock}</span>
                                        )}
                                    </div>

                                    <button 
                                        className="btn btn-primary mt-3 w-100 rounded" 
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock <= 0}
                                    >
                                        {product.stock <= 0 ? 'Stok produk kosong' : 'Add to Cart'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                    : <div className="alert alert-danger mb-0">Product not available</div>
            }
        </div>
    );
}
