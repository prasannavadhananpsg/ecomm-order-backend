
const PDFDocument = require('pdfkit');
const fs = require('fs');
const stream = require('stream');

function invoiceGenerator(orderData, filename = 'invoice.pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Pipe the document to a writable stream (file)
    // Create a buffer stream to capture the PDF data in memory
    const bufferStream = new stream.PassThrough();

    // Pipe the document output into this buffer stream
    doc.pipe(bufferStream);

    // Add Bestingems Logo and Company Information
    doc.image('./assets/sample2.png', 50, 50, { width: 100 })
        .fontSize(16).text('Bestingems', 160, 50)
        .fontSize(10).text('123 Gem Street, Gem City, State, 12345')
        .text('Phone: +1 (800) 123-4567')
        .text('Email: info@bestingems.com')
        .moveDown(2);

    // Add Order Details Section
    doc.text(`Order ID: ${orderData.orderId}`, 50, 150)
        .text(`Order Date: ${orderData.orderDate}`, 50, 170)
        .moveDown(2);

    // Add Billing Address
    doc.fontSize(12).text('Billing Address:', 50, 200)
        .fontSize(10).text(orderData.billingAddr.custName)
        .text(orderData.billingAddr.addr1)
        .text(orderData.billingAddr.addr2)
        .text(`${orderData.billingAddr.city}, ${orderData.billingAddr.state} ${orderData.billingAddr.zip}`)
        .text(`Email: ${orderData.billingAddr.email}`)
        .text(`Phone: ${orderData.billingAddr.phone}`)
        .moveDown(2);

    // Add Shipping Address
    doc.fontSize(12).text('Shipping Address:', 50, 300)
        .fontSize(10).text(orderData.shippingAddr.custName)
        .text(orderData.shippingAddr.addr1)
        .text(orderData.shippingAddr.addr2)
        .text(`${orderData.shippingAddr.city}, ${orderData.shippingAddr.state} ${orderData.shippingAddr.zip}`)
        .text(`Email: ${orderData.shippingAddr.email}`)
        .text(`Phone: ${orderData.shippingAddr.phone}`)
        .moveDown(2);

    // // Add Payment Information
    // doc.fontSize(12).text('Payment Information:', 50, 400)
    //     .fontSize(10).text(`Payment Status: ${orderData.paymentStatus}`)
    //     .text(`Payment Method: ${orderData.paymentMethod}`)
    //     .moveDown(2);
    //
    // // Add Shipping Information
    // doc.fontSize(12).text('Shipping Information:', 50, 500)
    //     .fontSize(10).text(`Tracking Number: ${orderData.trackingNumber}`)
    //     .text(`Carrier: ${orderData.shippingCarrier}`)
    //     .text(`Delivery Date: ${orderData.deliveryDate}`)
    //     .moveDown(2);
    //
    // // Add Product Table
    // const tableTop = 600;
    // const productTableHeaders = ['Serial Number', 'Product Image', 'Description', 'Quantity', 'Price per Unit', 'Total Price'];
    //
    // // Draw table headers
    // doc.fontSize(12).text(productTableHeaders[0], 50, tableTop)
    //     .text(productTableHeaders[1], 150, tableTop)
    //     .text(productTableHeaders[2], 250, tableTop)
    //     .text(productTableHeaders[3], 400, tableTop)
    //     .text(productTableHeaders[4], 480, tableTop)
    //     .text(productTableHeaders[5], 580, tableTop);
    //
    // let yPosition = tableTop + 20;
    //
    // // Loop through the products and print them
    // orderData.products.forEach(product => {
    //     doc.fontSize(10).text(product.serialNumber, 50, yPosition)
    //         .text(product.imageUrl, 150, yPosition) // You can add product image if needed (though it may need adjustment for actual images)
    //         .text(product.description, 250, yPosition)
    //         .text(product.quantity.toString(), 400, yPosition)
    //         .text(`$${product.price.toFixed(2)}`, 480, yPosition)
    //         .text(`$${(product.quantity * product.price).toFixed(2)}`, 580, yPosition);
    //     yPosition += 20; // Adjust for each row
    // });
    //
    // // Add Order Totals Section
    // doc.fontSize(12).text('Order Totals:', 50, yPosition + 10)
    //     .fontSize(10).text(`Subtotal: $${orderData.subTotal.toFixed(2)}`, 50, yPosition + 30)
    //     .text(`Coupon Applied: -$${orderData.couponApplied.toFixed(2)}`, 50, yPosition + 50)
    //     .text(`Credits Used: -$${orderData.creditsUsed.toFixed(2)}`, 50, yPosition + 70)
    //     .text(`Shipping: $${orderData.shippingCost.toFixed(2)}`, 50, yPosition + 90)
    //     .text(`Grand Total: $${orderData.grandTotal.toFixed(2)}`, 50, yPosition + 110)
    //     .moveDown(2);

    // Finalize PDF document
    doc.end();

    return new Promise((resolve, reject) => {
        const pdfBuffer = [];

        // Collect the data in chunks as the document is generated
        bufferStream.on('data', (chunk) => pdfBuffer.push(chunk));
        bufferStream.on('end', () => {
            resolve(Buffer.concat(pdfBuffer));  // Concatenate chunks into a single buffer
        });
        bufferStream.on('error', (err) => reject(err));  // Reject on error
    });
}

module.exports = { invoiceGenerator };
