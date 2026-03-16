const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');

router.post('/', async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;
      if (item.productId && item.productId.length === 24) {
        product = await Product.findById(item.productId);
      }

      if (product) {
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        processedItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
        });
      } else {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        totalAmount += itemTotal;
        processedItems.push({
          product: null,
          name: item.name || 'Unknown Product',
          price: item.price || 0,
          quantity: item.quantity || 1,
        });
      }
    }

    const count = await Order.countDocuments();
    const orderId = 'ORD' + String(count + 1).padStart(6, '0');

    const order = new Order({
      orderId,
      customer,
      items: processedItems,
      totalAmount,
      paymentMethod: 'stripe',
      status: 'pending',
    });

    await order.save();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: processedItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/order-success?orderId=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/pay.html?orderId=${order._id}`,
      metadata: { orderId: order._id.toString() },
    });

    res.json({ sessionId: session.id, url: session.url, orderId: order._id });
  } catch (error) {
    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
});

module.exports = router;