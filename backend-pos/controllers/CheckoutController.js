const midtransClient = require('midtrans-client');
const { generateRandomInvoice } = require('../utils/generateRandomInvoice');
const prisma = require('../prisma/client');

const createSnapTransaction = async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone, cartItems } = req.body;

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                meta: {
                    success: false,
                    message: 'Keranjang belanja kosong'
                }
            });
        }

        // Precheck stock for all cart items
        for (const item of cartItems) {
            const product = await prisma.product.findUnique({
                where: { id: parseInt(item.product_id) }
            });

            if (!product) {
                return res.status(404).json({
                    meta: {
                        success: false,
                        message: `Produk dengan ID ${item.product_id} tidak ditemukan`
                    }
                });
            }

            if (parseInt(item.qty) > product.stock) {
                return res.status(400).json({
                    meta: {
                        success: false,
                        message: `Stok produk '${product.title}' tidak mencukupi. Stok saat ini: ${product.stock}, diminta: ${item.qty}`
                    }
                });
            }
        }

        let snap = new midtransClient.Snap({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.MIDTRANS_CLIENT_KEY
        });

        const invoiceId = generateRandomInvoice();

        const pointsUsed = parseInt(req.body.points_used) || 0;
        const finalAmount = amount - pointsUsed;

        const transactionDb = await prisma.transaction.create({
            data: {
                customer_id: req.userId,
                invoice: invoiceId,
                cash: finalAmount,
                change: 0,
                discount: pointsUsed, // Use points as discount
                grand_total: finalAmount,
                points_used: pointsUsed,
                status: 'pending'
            }
        });

        // Deduct points from customer balance if using points
        if (pointsUsed > 0) {
            await prisma.customer.update({
                where: { id: req.userId },
                data: { points: { decrement: pointsUsed } }
            });
        }

        for (const item of cartItems) {
            await prisma.transactionDetail.create({
                data: {
                    transaction_id: transactionDb.id,
                    product_id: parseInt(item.product_id),
                    qty: parseInt(item.qty),
                    price: parseFloat(item.price)
                }
            });
        }

        // format items according to midtrans specification
        const itemDetails = cartItems.map(item => ({
            id: item.product_id.toString(),
            price: item.price,
            quantity: item.qty,
            name: item.title.substring(0, 50) // midtrans max length 50
        }));

        // Add points used as a negative item if any
        if (pointsUsed > 0) {
            itemDetails.push({
                id: 'K-POINTS',
                price: -pointsUsed,
                quantity: 1,
                name: 'K-Points Discount'
            });
        }

        const parameter = {
            transaction_details: {
                order_id: invoiceId,
                gross_amount: finalAmount
            },
            credit_card: {
                secure: true
            },
            customer_details: {
                first_name: customerName,
                email: customerEmail,
                phone: customerPhone
            },
            item_details: itemDetails
        };

        const transaction = await snap.createTransaction(parameter);

        await prisma.transaction.update({
            where: { id: transactionDb.id },
            data: { snap_token: transaction.token }
        });

        res.status(200).json({
            meta: {
                success: true,
                message: 'Snap transaction created successfully'
            },
            data: {
                token: transaction.token,
                redirect_url: transaction.redirect_url,
                invoice: invoiceId
            }
        });

    } catch (error) {
        console.error('Midtrans Snap Error:', error);
        res.status(500).json({
            meta: {
                success: false,
                message: 'Failed to create midtrans transaction'
            },
            errors: error.message
        });
    }
};

const handleNotification = async (req, res) => {
    try {
        console.log("--> WEBHOOK_BODY_RECEIVED:", JSON.stringify(req.body));

        let snap = new midtransClient.Snap({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.MIDTRANS_CLIENT_KEY
        });

        const statusResponse = await snap.transaction.notification(req.body);
        let orderId = statusResponse.order_id;
        let transactionStatus = statusResponse.transaction_status;
        let fraudStatus = statusResponse.fraud_status;

        console.log(`--> MIDTRANS_STATUS: Invoice=${orderId}, Status=${transactionStatus}, Fraud=${fraudStatus}`);

        const transaction = await prisma.transaction.findUnique({
            where: { invoice: orderId },
            include: { transaction_details: { include: { product: true } } }
        });

        if (!transaction) {
            console.error("--> ERROR: Transaction not found in DB for invoice:", orderId);
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                console.log("--> FRAUD_CHALLENGE: Status remains pending");
            } else if (fraudStatus == 'accept') {
                await processSettlement(transaction);
            }
        } else if (transactionStatus == 'settlement') {
            await processSettlement(transaction);
        } else if (transactionStatus == 'cancel' ||
            transactionStatus == 'deny' ||
            transactionStatus == 'expire') {
            
            console.log(`--> PAYMENT_FAILED: ${transactionStatus}. Updating to failed and returning points if any.`);
            
            // Return points to customer if transaction failed
            if (transaction.points_used > 0 && transaction.customer_id) {
                await prisma.customer.update({
                    where: { id: transaction.customer_id },
                    data: { points: { increment: transaction.points_used } }
                });
                console.log(`--> POINTS_RETURNED: ${transaction.points_used} to Customer ID: ${transaction.customer_id}`);
            }

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'failed' }
            });
        } else if (transactionStatus == 'pending') {
            console.log("--> PAYMENT_STILL_PENDING");
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'pending' }
            });
        }
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('--> MIDTRANS_NOTIFICATION_ERROR:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

async function processSettlement(transaction) {
    if (transaction.status === 'success') {
        console.log("--> SKIPPED: Transaction already success");
        return;
    }

    console.log(`--> PROCESSING_SETTLEMENT for Invoice: ${transaction.invoice}`);

    // AWARD POINTS: 1% of grand_total
    const pointsEarned = Math.floor(transaction.grand_total * 0.01);

    await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
            status: 'success',
            points_earned: pointsEarned
        }
    });

    if (transaction.customer_id) {
        await prisma.customer.update({
            where: { id: transaction.customer_id },
            data: {
                points: {
                    increment: pointsEarned
                }
            }
        });
        console.log(`--> POINTS_AWARDED: ${pointsEarned} to Customer ID: ${transaction.customer_id}`);
    }

    for (const detail of transaction.transaction_details) {
        const totalBuyPrice = detail.product.buy_price * detail.qty;
        const totalSellPrice = detail.product.sell_price * detail.qty;
        const profit = totalSellPrice - totalBuyPrice;

        console.log(`--> CALCULATING_PROFIT for Product: ${detail.product.title}, Amount: ${profit}`);

        await prisma.profit.create({
            data: {
                transaction_id: transaction.id,
                total: profit,
            },
        });

        await prisma.product.update({
            where: { id: detail.product_id },
            data: { stock: { decrement: detail.qty } },
        });
        console.log(`--> STOCK_DECREMENTED for Product: ${detail.product.title}, Qty: ${detail.qty}`);
    }
    console.log("--> SETTLEMENT_COMPLETE");
}

const getTransactionStatus = async (req, res) => {
    try {
        const { invoice } = req.query;
        if (!invoice) {
            return res.status(400).json({ meta: { success: false, message: 'Invoice diperlukan' } });
        }

        // Mencegah cache status 304 agar polling selalu dapat data terbaru dari DB
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const transactionData = await prisma.transaction.findUnique({
            where: { invoice },
            select: { id: true, invoice: true, status: true, grand_total: true, created_at: true }
        });

        if (!transactionData) {
            return res.status(404).json({ meta: { success: false, message: 'Transaksi tidak ditemukan' } });
        }

        // Jika status masih pending, coba cek langsung ke Midtrans API (berguna untuk testing localhost tanpa webhook)
        if (transactionData.status === 'pending') {
            try {
                let apiClient = new midtransClient.CoreApi({
                    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
                    serverKey: process.env.MIDTRANS_SERVER_KEY,
                    clientKey: process.env.MIDTRANS_CLIENT_KEY
                });

                const statusResponse = await apiClient.transaction.status(invoice);
                const transactionStatus = statusResponse.transaction_status;
                const fraudStatus = statusResponse.fraud_status;

                let shouldProcessSettlement = false;
                let shouldFail = false;

                if (transactionStatus == 'capture') {
                    if (fraudStatus == 'accept') shouldProcessSettlement = true;
                } else if (transactionStatus == 'settlement') {
                    shouldProcessSettlement = true;
                } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
                    shouldFail = true;
                }

                if (shouldProcessSettlement || shouldFail) {
                    // Fetch full transaction details needed for processing
                    const fullTransaction = await prisma.transaction.findUnique({
                        where: { id: transactionData.id },
                        include: { transaction_details: { include: { product: true } } }
                    });

                    if (shouldProcessSettlement) {
                        await processSettlement(fullTransaction);
                        transactionData.status = 'success';
                    } else if (shouldFail) {
                        // Return points to customer
                        if (fullTransaction.points_used > 0 && fullTransaction.customer_id) {
                            await prisma.customer.update({
                                where: { id: fullTransaction.customer_id },
                                data: { points: { increment: fullTransaction.points_used } }
                            });
                        }
                        await prisma.transaction.update({
                            where: { id: fullTransaction.id },
                            data: { status: 'failed' }
                        });
                        transactionData.status = 'failed';
                    }
                }
            } catch (err) {
                // Ignore errors if Midtrans doesn't have the transaction yet or network fails
                console.error("Direct Midtrans Status Check Error:", err.message);
            }
        }

        res.status(200).json({
            meta: { success: true, message: 'Status transaksi berhasil diambil' },
            data: transactionData
        });
    } catch (error) {
        console.error('GetTransactionStatus Error:', error);
        res.status(500).json({ meta: { success: false, message: 'Internal server error' } });
    }
};

module.exports = { createSnapTransaction, handleNotification, getTransactionStatus };
