//
// // const ReturnRequest = require('../models/ReturnRequest');
// const Order = require("../models/order");
// const moment = require("moment/moment");
//
// function buildReturnRequestSearchQuery(filters) {
//     const query = {};
//
//     if (filters.requestId) {
//         query.orderTracking.trackingId = filters.requestId
//     }
//
//     // Filter by Order Id
//     if (filters.orderId) {
//         query.orderNo = filters.orderId;
//     }
//
//     // Filter by Customer Name
//     if (filters.customerName) {
//         query.custNm = new RegExp(filters.customerName, 'i'); // Case-insensitive search
//     }
//
//     // Filter by Customer Email
//     if (filters.customerEmail) {
//         query.userId = new RegExp(filters.customerEmail, 'i');
//     }
//
//     // Filter by Payment Status
//     if (filters.shipmentStatus) {
//         query.shipmentStatus = filters.shipmentStatus;
//     }
//
//     // Filter by Order Date (From-To)
//     if (filters.orderFrom && filters.orderTo) {
//         query.shipmentDate = { $gte: moment(filters.orderFrom).toDate(), $lte: moment(filters.orderTo).toDate() };
//     }
//
//     return query;
// }
//
//
// const returnRequestsController = {
//     getReturnRequests: async (req, res) => {
//         try {
//             const page = parseInt(req.query.page) || 1;
//
//             // Define the number of orders per page
//             const ordersPerPage = 10;
//
//             // Calculate how many orders to skip based on the page
//             const skip = (page - 1) * ordersPerPage;
//             const filters = req.query;
//
//             // Build query from other filters
//             const additionalFilters = buildReturnRequestSearchQuery(filters);
//
//             // Merge the additional filters into the base query
//             query = { ...query, ...additionalFilters };
//
//             // Fetch the orders with pagination
//             const orders = await Order.find(query).skip(skip).limit(ordersPerPage);
//
//             if (orders.length === 0) {
//                 return res.status(404).json({ message: "No results found for the search filters." });
//             }
//
//             // Include gift request in order details
//             const orderList = orders.map(order => ({
//                 orderTrackingID: order.trackingId,
//                 deliveryDate: order.delvryDate,
//                 orderId: order.orderNo,
//                 orderDate: order.orderDate,
//                 customerName: order.custNm,
//                 orderItemsCount: order.orderItems ? order.orderItems.length : 0,  // Check if orderItems is not null/undefined
//                 shippingAddress: order.shippingAddr,
//                 orderValue: order.totalAmount,
//                 orderStatus: order.orderStatus,
//                 paymentStatus: order.paymentStatus,
//                 shipmentStatus: order.shipmentStatus
//             }));
//
//             res.json({ orders: orderList });
//         } catch (err) {
//             console.error("Error fetching orders", err);
//             res.status(500).json({ error: "Failed to fetch orders" });
//         }
//     },
//
//     getReturnRequest: async (req, res) => {
//         try {
//             const returnRequest = await ReturnRequest.findById(req.params.id);
//             if (!returnRequest) {
//                 return res.status(404).json({ message: "Return request not found" });
//             }
//             res.json(returnRequest);
//         } catch (err) {
//             res.status(500).json({ message: err.message });
//         }
//     },
//
//     updateReturnRequestAction: async (req, res) => {
//         try {
//             const returnRequest = await ReturnRequest.findById(req.params.id);
//             if (!returnRequest) {
//                 return res.status(404).json({ message: "Return request not found" });
//             }
//
//             const { action, shippingLabel, partialRefund } = req.body;
//
//             if (action === 'Approve') {
//                 returnRequest.status = 'Approved';
//                 returnRequest.shippingLabel = shippingLabel;
//                 returnRequest.partialRefund = partialRefund || 0;
//             } else if (action === 'Reject') {
//                 returnRequest.status = 'Rejected';
//             } else {
//                 return res.status(400).json({ message: "Invalid action" });
//             }
//
//             await returnRequest.save();
//             res.json(returnRequest);
//         } catch (err) {
//             res.status(400).json({ message: err.message });
//         }
//     },
//
//     receiveReturnRequest: async (req, res) => {
//         try {
//             const returnRequest = await ReturnRequest.findById(req.params.id);
//             if (!returnRequest) {
//                 return res.status(404).json({ message: "Return request not found" });
//             }
//
//             const { receivedQuantity, conditionRemarks, restock } = req.body;
//
//             returnRequest.receivedQuantity = receivedQuantity;
//             returnRequest.conditionRemarks = conditionRemarks;
//             returnRequest.status = 'Received';
//
//             await returnRequest.save();
//
//             res.json(returnRequest);
//         } catch (err) {
//             res.status(400).json({ message: err.message });
//         }
//     },
//
//     refundReturnRequest: async (req, res) => {
//         try {
//             const returnRequest = await ReturnRequest.findById(req.params.id);
//             if (!returnRequest) {
//                 return res.status(404).json({ message: "Return request not found" });
//             }
//
//             const { approvedRefundAmount } = req.body;
//
//             returnRequest.approvedRefundAmount = approvedRefundAmount;
//             returnRequest.status = 'Refunded';
//
//             await returnRequest.save();
//
//             const invoice = await generateInvoice(returnRequest);
//
//             res.json({ returnRequest });
//         } catch (err) {
//             res.status(400).json({ message: err.message });
//         }
//     },
//
//     uploadShippingLabel: async (req, res) => {
//         try {
//             const returnRequest = await ReturnRequest.findById(req.params.id);
//             if (!returnRequest) {
//                 return res.status(404).json({ message: "Return request not found" });
//             }
//
//             returnRequest.shippingLabel = req.file.path; // Save the file path
//             await returnRequest.save();
//
//             res.json({ message: "Shipping label uploaded successfully." });
//         } catch (err) {
//             res.status(500).json({ message: err.message });
//         }
//     }
// };
//
// module.exports = returnRequestsController;
