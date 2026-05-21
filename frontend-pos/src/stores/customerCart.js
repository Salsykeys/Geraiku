import { create } from 'zustand';

export const useCustomerCartStore = create((set) => ({
    // state
    cartItems: [],

    // action
    addToCart: (product, qty = 1) => set((state) => {
        // Cek apakah produk sudah ada di keranjang
        const existingItem = state.cartItems.find(item => item.product_id === product.id);

        if (existingItem) {
            // Jika ada, tambahkan qty nya
            return {
                cartItems: state.cartItems.map(item =>
                    item.product_id === product.id
                        ? { ...item, qty: item.qty + qty, total: (item.qty + qty) * item.price }
                        : item
                )
            };
        } else {
            // Jika belum ada, masukkan sebagai item baru
            const newItem = {
                product_id: product.id,
                qty: qty,
                title: product.title,
                price: product.sell_price,
                image: product.image,
                total: qty * product.sell_price,
                stock: product.stock,
            };
            return {
                cartItems: [...state.cartItems, newItem]
            };
        }
    }),

    removeFromCart: (productId) => set((state) => ({
        cartItems: state.cartItems.filter(item => item.product_id !== productId)
    })),

    updateQty: (productId, qty) => set((state) => ({
        cartItems: state.cartItems.map(item =>
            item.product_id === productId
                ? { ...item, qty: qty, total: qty * item.price }
                : item
        )
    })),

    clearCart: () => set({ cartItems: [] }),
}));
