const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.product')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { customer, items, paymentMethod } = req.body;

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: customer, items' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;
      let productId = item.productId || item.product;
      
      if (productId && productId.length === 24) {
        try {
          product = await Product.findById(productId);
        } catch (e) {
          product = null;
        }
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
      paymentMethod: paymentMethod || 'credit_card',
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// Update order status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Missing required field: status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

module.exports = router;
