const express = require("express");
const prisma = require("../prisma/client");
const { generateRandomInvoice } = require('../utils/generateRandomInvoice');

const createTransaction = async (req, res) => {
    try {
        const invoice = generateRandomInvoice();

        const cashierId = parseInt(req.userId);
        const customerid = parseInt(req.body.customer_id) || null;
        const cash = parseInt(req.body.cash);
        const change = parseInt(req.body.change);
        const discount = parseInt(req.body.discount);
        const grandTotal = parseInt(req.body.grand_total);

        if (isNaN(customerid) || isNaN(cash) || isNaN(change) || isNaN(discount) || isNaN(grandTotal)) {
            return res.status(400).send({
                meta: {
                    success: false,
                    message: 'Data input tidak valid. Silahkan periksa permintaan anda',
                },
            });
        }

        // Fetch carts first to validate stock and items
        const carts = await prisma.cart.findMany({
            where: { cashier_id: cashierId },
            include: { product: true },
        });

        if (carts.length === 0) {
            return res.status(400).send({
                meta: {
                    success: false,
                    message: 'Keranjang belanja kosong',
                },
            });
        }

        // Precheck stock for all cart items to ensure none exceed available stock
        for (const cart of carts) {
            if (cart.qty > cart.product.stock) {
                return res.status(400).send({
                    meta: {
                        success: false,
                        message: `Stok produk '${cart.product.title}' tidak mencukupi. Stok saat ini: ${cart.product.stock}, diminta: ${cart.qty}`,
                    },
                });
            }
        }

        const pointsEarned = customerid ? Math.floor(grandTotal * 0.01) : 0;
        const pointsUsed = parseInt(req.body.points_used) || 0;

        const transaction = await prisma.transaction.create({
            data: {
                cashier_id: cashierId,
                customer_id: customerid,
                invoice: invoice,
                cash: cash,
                change: change,
                discount: discount,
                grand_total: grandTotal,
                points_earned: pointsEarned,
                points_used: pointsUsed,
            },
        });

        // Award points to customer if customer_id is provided
        if (customerid) {
            await prisma.customer.update({
                where: { id: customerid },
                data: {
                    points: {
                        increment: pointsEarned - pointsUsed
                    }
                }
            });
        }

        for (const cart of carts) {

            const price = parseFloat(cart.price);

            await prisma.transactionDetail.create({
                data: {
                    transaction_id: transaction.id,
                    product_id: cart.product_id,
                    qty: cart.qty,
                    price: price,
                },
            });

            const totalBuyPrice = cart.product.buy_price * cart.qty;
            const totalSellPrice = cart.product.sell_price * cart.qty;
            const profit = totalSellPrice - totalBuyPrice;

            await prisma.profit.create({
                data: {
                    transaction_id: transaction.id,
                    total: profit,
                },
            });

            await prisma.product.update({
                where: { id: cart.product_id },
                data: { stock: { decrement: cart.qty } },
            });
        }

        await prisma.cart.deleteMany({
            where: { cashier_id: cashierId },
        });

        res.status(201).send({
            meta: {
                success: true,
                message: 'Transaksi berhasil dibuat',
            },
            data: {
                ...transaction,
                points_earned: pointsEarned, // Return points earned for UI
            },
        });
    } catch (error) {
        console.error('CREATE_TRANSACTION_ERROR:', error.name, '-', error.message, '\nStack:', error.stack);
        res.status(500).send({
            meta: {
                success: false,
                message: 'Internal server error',
            },
            errors: error.message,
        });
    }
};

const findTransactionByInvoice = async (req, res) => {
    const { invoice } = req.query;

    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                invoice: invoice,
            },
            select: {
                id: true,
                cashier_id: true,
                customer_id: true,
                invoice: true,
                cash: true,
                change: true,
                discount: true,
                grand_total: true,
                created_at: true,
                customer: {
                    select: {
                        name: true,
                    },
                },
                cashier: {
                    select: {
                        name: true,
                        created_at: true,
                        updated_at: true,
                    },
                },
                transaction_details: {
                    select: {
                        id: true,
                        product_id: true,
                        qty: true,
                        price: true,
                        product: {
                            select: {
                                title: true,
                            },
                        },
                    },
                },
            }
        });

        if (!transaction) {
            return res.status(404).send({
                meta: {
                    success: false,
                    message: `Transaksi dengan invoice: ${invoice} tidak ditemukan`,
                },
            });
        }

        res.status(200).send({
            meta: {
                success: true,
                message: `Berhasil mendapatkan transaksi dengan invoice: ${invoice}`
            },
            data: transaction,
        });

    } catch (error) {
        res.status(500).send({
            meta: {
                success: false,
                message: 'Internal server error',
            },
            errors: error,
        });
    }
}

module.exports = { createTransaction, findTransactionByInvoice };