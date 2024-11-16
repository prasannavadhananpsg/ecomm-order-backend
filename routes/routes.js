// routes/routes.js
const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authenticateJWT = require('../middleware/authMiddleware');

router.post('/', authenticateJWT, ordersController.createOrder);
router.get('/orders/dashboard' , ordersController.getDashboard);
router.put('/orders/:id/shippingInfo', ordersController.addShipmentToOrder);
router.put('/orders/:id/cancel', authenticateJWT, ordersController.cancelOrder);
router.delete('/orders/:id',  authenticateJWT,ordersController.deleteOrder);
router.get('/orders', ordersController.getOrders);
router.get('/orders/getShipments', ordersController.getShipments);
router.get('/orders/getReturnOrders', ordersController.getReturnOrders);
router.get('/orders/:id/invoice', ordersController.getInvoice);
router.get('/orders/:id', ordersController.getOrderByOrderNo);
// const upload = require('../middleware/upload');

module.exports = router;