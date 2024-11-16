const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({}, { strict: false });  // schema-less
const Order = mongoose.models.OrderNested || mongoose.model('OrderNested', orderSchema, 'orderNested');

module.exports = Order;
