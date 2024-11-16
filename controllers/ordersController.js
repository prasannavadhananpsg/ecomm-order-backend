// controllers/ordersController.js
const Order = require('../models/Order');
const ReturnRequest = require('../models/ReturnRequest');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');
const  {invoiceGenerator}  = require('../invoices/invoiceGenerator');

function buildSearchQuery(filters) {
    const query = {};

    // Filter by Order Id
    if (filters.orderId) {
        query.orderNo = filters.orderId;
    }

    // Filter by Customer Name
    if (filters.customerName) {
        query.custNm = new RegExp(filters.customerName, 'i'); // Case-insensitive search
    }

    // Filter by Customer Email
    if (filters.customerEmail) {
        query.userId = new RegExp(filters.customerEmail, 'i');
    }

    // Filter by Payment Status
    if (filters.paymentStatus) {
        query.paymentStatus = filters.paymentStatus;
    }

    // Filter by Order Date (From-To)
    if (filters.orderFrom && filters.orderTo) {
        query.orderDate = { $gte: moment(filters.orderFrom).toDate(), $lte: moment(filters.orderTo).toDate() };
    }

    // Filter by Order Status
    if (filters.orderStatus) {
        query.orderStatus = filters.orderStatus;
    }

    // Filter by Order Amount
    if (filters.orderAmount) {
        switch (filters.orderAmount) {
            case 'lessThan50':
                query.totalAmount = { $lt: 50 }; // Less than $50
                break;
            case '50To100':
                query.totalAmount = { $gte: 50, $lte: 100 }; // Between $50 and $100
                break;
            case '100To1000':
                query.totalAmount = { $gte: 100, $lte: 1000 }; // Between $100 and $1000
                break;
            case 'greaterThan1000':
                query.totalAmount = { $gt: 1000 }; // Greater than $1000
                break;
            default:
                // Handle the case when the value is not valid, if needed
                break;
        }
    }

    return query;
}

function buildShipmentSearchQuery(filters) {
    const query = {};

    if (filters.trackingId) {
        query.orderTracking.trackingId = filters.trackingId
    }

    // Filter by Order Id
    if (filters.orderId) {
        query.orderNo = filters.orderId;
    }

    // Filter by Customer Name
    if (filters.customerName) {
        query.custNm = new RegExp(filters.customerName, 'i'); // Case-insensitive search
    }

    // Filter by Customer Email
    if (filters.customerEmail) {
        query.userId = new RegExp(filters.customerEmail, 'i');
    }

    // Filter by Payment Status
    if (filters.shipmentStatus) {
        query.shipmentStatus = filters.shipmentStatus;
    }

    // Filter by Order Date (From-To)
    if (filters.orderFrom && filters.orderTo) {
        query.shipmentDate = { $gte: moment(filters.orderFrom).toDate(), $lte: moment(filters.orderTo).toDate() };
    }

    return query;
}

function buildReturnOrderSearchQuery(filters) {
    const query = {};

    if (filters.requestId) {
        query.returnId = filters.returnId
    }

    // Filter by Order Id
    if (filters.orderId) {
        query.orderNo = filters.orderId;
    }

    // Filter by Customer Name
    if (filters.customerName) {
        query.custNm = new RegExp(filters.customerName, 'i'); // Case-insensitive search
    }

    // Filter by Customer Email
    if (filters.customerEmail) {
        query.userId = new RegExp(filters.customerEmail, 'i');
    }

    if (filters.returnStatus) {
        // Use the $elemMatch operator to match the first element in the orderReturn array
        query["orderReturn"] = {
            $elemMatch: {
                status: filters.returnStatus  // Check if the status of any element matches filters.returnStatus
            }
        };
    }

    // Filter by Order Date (From-To)
    if (filters.orderFrom && filters.orderTo) {
        query.returnDt = { $gte: moment(filters.orderFrom).toDate(), $lte: moment(filters.orderTo).toDate() };
    }

    return query;
}

const ordersController = {
    createOrder: async (req, res) => {
        const order = new Order(req.body);
        try {
            const savedOrder = await order.save();
            res.status(201).json(savedOrder);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    getDashboard: async (req, res, next) => {
        try {
            const currentMonthStart = moment().startOf('month').toDate();
            const last24HoursStart = moment().subtract(24, 'hours').toDate();

            // Order Tracker metrics
            const ordersToBeShipped = await Order.countDocuments({
                "orderStatus": "Pending"
            });

            const newOrdersLast24Hours = await Order.countDocuments({
                orderDate: { $gte: last24HoursStart }
            });

            const returnRequestsAwaitingApproval = await Order.countDocuments({
                "orderReturn": {
                    $elemMatch: {
                        returnStatus: "Requested"
                    }
                }
            });

            // Order Value (Total value of completed orders for the current month)
            const orderValueForMonth = await Order.aggregate([
                { $match: { orderDate: { $gte: currentMonthStart }} },
                { $group: { _id: null, totalValue: { $sum: "$totalAmount" } } }
            ]);

            const totalOrderValue = orderValueForMonth.length > 0 ? orderValueForMonth[0].totalValue : 0;

            // Sales Tracker (Breakdown of order count and total value for the current month)
            const salesTracker = await Order.aggregate([
                { $match: { orderDate: { $gte: currentMonthStart } } },
                { $group: { _id: { $month: "$orderDate" }, orderCount: { $sum: 1 }, totalValue: { $sum: "$totalAmount" } } },
                { $sort: { "_id": 1 } } // Sort by month
            ]);

// Count all orders for the current month
            const totalOrders = await Order.countDocuments({
                orderDate: { $gte: currentMonthStart }
            });

// Count orders with "Shipped" status for the current month
            const shippedOrders = await Order.countDocuments({
                orderDate: { $gte: currentMonthStart },
                orderStatus: "Shipped"
            });

// Count orders with "Delivered" status for the current month
            const deliveredOrders = await Order.countDocuments({
                orderDate: { $gte: currentMonthStart },
                orderStatus: "Delivered"
            });

// Count orders with "Pending" status for the current month
            const pendingShipments = await Order.countDocuments({
                orderDate: { $gte: currentMonthStart },
                orderStatus: "Pending"
            });

            // Pending Orders List
            const pendingOrders = await Order.find({ "orderStatus": "Pending" }).limit(5).select('orderNo orderDate');

            const pendingOrderList = pendingOrders.map(order => ({
                orderId: order.orderNo,
                orderDate: order.orderDate,
                customerName: order.custNm,
                orderValue: order.totalAmount,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus
            }));

            // Prepare the response
            const dashboardData = {
                orderTracker: {
                    ordersToBeShipped,
                    newOrdersLast24Hours,
                    returnRequestsAwaitingApproval
                },
                orderValue: totalOrderValue,
                salesTracker,
                orderOverview: {
                    totalOrders,
                    shippedOrders,
                    deliveredOrders,
                    pendingShipments
                },
                pendingOrderList
            };

            res.json(dashboardData);

        } catch (err) {
            console.error("Error fetching dashboard data", err);
            res.status(500).json({ error: "Failed to fetch dashboard data" });
        }
    },

    getShipments: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;

            // Define the number of orders per page
            const ordersPerPage = 10;

            // Calculate how many orders to skip based on the page
            const skip = (page - 1) * ordersPerPage;
            const filters = req.query;

            // Initialize the base query with orderStatus filter
            let query = {
                orderStatus: { $in: ["Shipped", "Delivered"] }
            };

            // Build query from other filters
            const additionalFilters = buildShipmentSearchQuery(filters);

            // Merge the additional filters into the base query
            query = { ...query, ...additionalFilters };

            // Fetch the orders with pagination
            const orders = await Order.find(query).skip(skip).limit(ordersPerPage);

            if (orders.length === 0) {
                return res.status(404).json({ message: "No results found for the search filters." });
            }

            // Include gift request in order details
            const orderList = orders.map(order => ({
                orderTrackingID: order.orderTracking.trackingId,
                deliveryDate: order.orderTracking.delvryDate,
                orderId: order.orderNo,
                orderDate: order.orderDate,
                customerName: order.custNm,
                orderItemsCount: order.orderItems ? order.orderItems.length : 0,  // Check if orderItems is not null/undefined
                shippingAddress: order.shippingAddr,
                orderValue: order.totalAmount,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                shipmentStatus: order.shipmentStatus
            }));

            res.json({ orders: orderList });
        } catch (err) {
            console.error("Error fetching orders", err);
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    },

    getReturnOrders: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;

            // Define the number of orders per page
            const ordersPerPage = 10;

            // Calculate how many orders to skip based on the page
            const skip = (page - 1) * ordersPerPage;
            const filters = req.query;

            // Initialize the base query with orderStatus filter
            let query = {
                returnId: { $ne: null, $ne: 0 }
            };

            // Build query from other filters
            const additionalFilters = buildReturnOrderSearchQuery(filters);

            // Merge the additional filters into the base query
            query = { ...query, ...additionalFilters };

            // Fetch the orders with pagination
            const orders = await Order.find(query).skip(skip).limit(ordersPerPage);

            if (orders.length === 0) {
                return res.status(404).json({ message: "No results found for the search filters." });
            }

            // Include gift request in order details
            const orderList = orders.map(order => ({
                returnID: order.returnId,
                deliveryDate: order.orderTracking.delvryDate,
                orderId: order.orderNo,
                orderDate: order.orderDate,
                customerName: order.custNm,
                orderItemsCount: order.orderItems ? order.orderItems.length : 0,  // Check if orderItems is not null/undefined
                shippingAddress: order.shippingAddr,
                orderValue: order.totalAmount,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                returnStatus: order.orderReturn && order.orderReturn.length > 0
                    ? order.orderReturn[0].status || null  // Get the status of the first object or null if it doesn't exist
                    : null
            }));

            res.json({ orders: orderList });
        } catch (err) {
            console.error("Error fetching orders", err);
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    },

    addShipmentToOrder: async (req, res) => {
        try {
            const orderId = req.params.id;

            // Fetch the order from the database based on orderNo
            const order = await Order.findOne({ orderNo: orderId });
            if (!order) return res.status(404).json({ message: "Order not found" });

            if (order.orderStatus === 'delivered') {
                return res.status(400).json({ message: "Cannot edit shipping info for delivered orders." });
            }

            if (req.body.trackingId) {
                order.orderTracking.trackingId = req.body.trackingId;
            }

            if (req.body.trackingUrl) {
                order.orderTracking.trackingUrl = req.body.trackingUrl;
            }

            if (req.body.trackingComments) {
                order.orderTracking.trackingComments = req.body.trackingComments;
            }

            if (req.body.delvryDate) {
                order.orderTracking.delvryDate = req.body.delvryDate;
            }

            if (req.body.trackingRemarks) {
                order.orderTracking.trackingRemarks = req.body.trackingRemarks;
            }

            if (req.body.shipmentStatus) {
                order.shipmentStatus = req.body.shipmentStatus;
            }

            await order.save();
            res.json(order);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    cancelOrder: async (req, res, next) => {
        try {
            const orderId = req.params.id;

            // Fetch the order from the database based on orderNo
            const order = await Order.findOne({ orderNo: orderId });
            if (!order) return res.status(404).json({ message: "Order not found" });

            if (order.orderStatus === 'shipped') {
                return res.status(400).json({ message: "Order cannot be canceled as it is already shipped." });
            }

            order.orderStatus = 'canceled';
            await order.save();

            res.json({ message: "Order has been canceled" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    deleteOrder: async (req, res, next) => {
        try {
            const orderId = req.params.id;

            // Fetch the order from the database based on orderNo
            const order = await Order.findOne({orderNo: orderId});
            if (!order) return res.status(404).json({message: "Order not found"});
            await order.delete();
            res.json({message: "Order has been deleted"});
        } catch (err) {
            res.status(500).json({message: err.message});
        }
    },

    getOrderByOrderNo: async (req, res, next) => {
        try {
            // Extract the orderNo from the request params
            const orderId = req.params.id;

            // Fetch the order from the database based on orderNo
            const order = await Order.findOne({ orderNo: orderId });

            // Check if the order exists
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found for the provided order number',
                });
            }
            console.log(order.creditUsed);

            const orderDetails = {
                orderId: order.orderNo,
                orderDate: order.orderDate,
                customerName: order.custNm,
                orderItemsCount: order.orderItems ? order.orderItems.length : 0,  // Check if orderItems is not null/undefined
                shippingAddress: order.shippingAddr,
                orderSummary: {
                    orderTotal: order.totalAmount,
                    credit: order.creditUsed ? order.creditUsed[0].creditUsed : null,
                    discountPrice: { $sum: "$orderItems.discPrice" },
                },
                paymentDetails: {
                  mode: order.orderTxn.payment_gateway
                },
                productInformation: {
                    items: order.OrderItems
                },
                shipmentInfo: order.orderTracking,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus
            };

            res.json({ order: orderDetails });
            // If order found, return it in the response
        } catch (err) {
            console.error(err);
            // Handle error (e.g., database connection issues, invalid input, etc.)
            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching the order',
                error: err.message,
            });
        }
    },

    getOrders: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;

    // Define the number of orders per page
    const ordersPerPage = 10;

        // Calculate how many orders to skip based on the page
        const skip = (page - 1) * ordersPerPage;
        const filters = req.query;

        // Build query from filters
        const query = buildSearchQuery(filters);

        // Fetch the orders with pagination
        const orders = await Order.find(query||{}).skip(skip).limit(ordersPerPage);

            if (orders.length === 0) {
                return res.status(404).json({ message: "No results found for the search filters." });
            }

            // Include gift request in order details
            const orderList = orders.map(order => ({
                orderId: order.orderNo,
                orderDate: order.orderDate,
                customerName: order.custNm,
                orderItemsCount: order.orderItems ? order.orderItems.length : 0,  // Check if orderItems is not null/undefined
                shippingAddress: order.shippingAddr,
                orderValue: order.totalAmount,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus
            }));

            res.json({ orders: orderList });
        } catch (err) {
            console.error("Error fetching orders", err);
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    },

    getInvoice: async (req, res) => {
        const orderId = req.params.id;

        const orderData = await Order.findOne({ orderNo: orderId });

        const pdfBuffer = await invoiceGenerator(orderData);

        // Set the response headers to trigger a file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${orderId}_invoice.pdf`);

        // Send the generated PDF buffer as the HTTP response
        res.send(pdfBuffer);
    },
};

module.exports = ordersController;
