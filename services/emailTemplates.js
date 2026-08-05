// GOR MENSWEAR — Responsive Luxury Email Templates

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #090909;
  color: #F8F6F3;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
`;

const LOGO_HEADER = `
  <div style="text-align: center; padding: 32px 20px 24px; background-color: #090909; border-bottom: 1px solid #1E1E1E;">
    <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: normal; color: #F8F6F3; margin: 0; letter-spacing: 0.15em;">
      GOR <span style="color: #C8A45D; font-size: 14px; letter-spacing: 0.25em; display: block; margin-top: 4px; font-family: sans-serif;">LONDON MAYFAIR</span>
    </h1>
  </div>
`;

const FOOTER = `
  <div style="padding: 32px 20px; background-color: #0D0D0D; border-top: 1px solid #1E1E1E; text-align: center; font-size: 11px; color: #777; line-height: 1.6;">
    <p style="margin: 0 0 8px; color: #C8A45D; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">
      GOR MENSWEAR ATELIER
    </p>
    <p style="margin: 0 0 8px;">
      28 Savile Row, Mayfair, London W1S 3PR, United Kingdom
    </p>
    <p style="margin: 0 0 16px;">
      Questions? Contact Concierge at <a href="mailto:concierge@gormenswear.com" style="color: #C8A45D; text-decoration: none;">concierge@gormenswear.com</a>
    </p>
    <p style="margin: 0; color: #555; font-size: 10px;">
      © ${new Date().getFullYear()} GOR MENSWEAR. All rights reserved.
    </p>
  </div>
`;

function wrapTemplate(title, bodyContent) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="${BASE_STYLES}">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #090909; width: 100%;">
        <tr>
          <td align="center" style="padding: 20px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #121212; border: 1px solid #1E1E1E; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
              <tr>
                <td>
                  ${LOGO_HEADER}
                  <div style="padding: 32px 28px;">
                    ${bodyContent}
                  </div>
                  ${FOOTER}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// 1. Customer Welcome Email Template
function welcomeTemplate({ customerName = "Valued Client" }) {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: bold; color: #C8A45D; letter-spacing: 0.3em; text-transform: uppercase; display: block; margin-bottom: 8px;">
        WELCOME TO THE ATELIER
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 28px; color: #F8F6F3; font-weight: normal; margin: 0 0 12px;">
        Greetings, ${customerName}
      </h2>
      <p style="font-size: 13px; color: #999; line-height: 1.7; margin: 0 0 24px;">
        Your GOR account has been activated. Experience bespoke shirting, precision tailored trousers, and heavyweight outerwear crafted for the discerning modern gentleman.
      </p>
      <a href="http://localhost:3000/shop" style="display: inline-block; padding: 14px 32px; background-color: #C8A45D; color: #090909; text-decoration: none; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 8px;">
        Explore New Arrivals
      </a>
    </div>
  `;
  return wrapTemplate("Welcome to GOR MENSWEAR", content);
}

// 2. Order Confirmation Email Template
function orderConfirmationTemplate({ order }) {
  const orderNo = order.orderNo || order.id || "GOR-ORDER";
  const customerName = order.customerName || "Valued Client";
  const total = order.totalAmount || order.subtotal || 0;

  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #1E1E1E; font-size: 13px; color: #E8E4DF;">
        <strong>${item.name}</strong><br>
        <span style="font-size: 11px; color: #777;">SKU: ${item.sku || "GOR-SKU"} • Qty: ${item.quantity || 1}</span>
      </td>
      <td align="right" style="padding: 12px 0; border-bottom: 1px solid #1E1E1E; font-size: 13px; font-weight: bold; color: #C8A45D; font-family: monospace;">
        ₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}
      </td>
    </tr>
  `).join("");

  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 10px; font-weight: bold; color: #C8A45D; letter-spacing: 0.3em; text-transform: uppercase; display: block; margin-bottom: 8px;">
          ORDER CONFIRMED
        </span>
        <h2 style="font-family: Georgia, serif; font-size: 26px; color: #F8F6F3; font-weight: normal; margin: 0 0 6px;">
          Thank You, ${customerName}
        </h2>
        <p style="font-size: 12px; color: #888; margin: 0;">
          Order Reference: <strong style="color: #C8A45D; font-family: monospace;">${orderNo}</strong>
        </p>
      </div>

      <div style="background-color: #181818; border: 1px solid #222; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 12px; font-weight: bold; color: #C8A45D; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px; border-bottom: 1px solid #262626; padding-bottom: 8px;">
          Purchased Garments
        </h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${itemsHtml}
        </table>

        <div style="margin-top: 16px; font-size: 12px; color: #888;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span style="color: #E8E4DF; float: right;">₹${(order.subtotal || total).toLocaleString("en-IN")}</span>
          </div>
          ${order.discount ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #10b981;">
              <span>Discount Applied:</span>
              <span style="float: right;">-₹${order.discount.toLocaleString("en-IN")}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #262626; font-size: 15px; font-weight: bold; color: #F8F6F3;">
            <span>Total Paid:</span>
            <span style="color: #C8A45D; float: right; font-family: monospace;">₹${total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="http://localhost:3000/order-confirmation/${orderNo}" style="display: inline-block; padding: 12px 28px; background-color: #C8A45D; color: #090909; text-decoration: none; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 8px;">
          Track Your Order
        </a>
      </div>
    </div>
  `;
  return wrapTemplate(`Order Confirmation ${orderNo}`, content);
}

// 3. Order Status Email Template (Shipped / Out for Delivery / Delivered / Cancelled)
function orderStatusTemplate({ order, status }) {
  const orderNo = order.orderNo || order.id || "GOR-ORDER";
  const customerName = order.customerName || "Valued Client";

  let statusTitle = "Order Status Update";
  let statusBadge = status.toUpperCase();
  let badgeColor = "#C8A45D";
  let message = `Your order ${orderNo} status has been updated to ${status}.`;

  if (status === "Shipped") {
    statusTitle = "Your Order Has Been Shipped";
    badgeColor = "#06b6d4";
    message = `Exciting news! Your order ${orderNo} has been dispatched via express courier and is en route.`;
  } else if (status === "Out for Delivery") {
    statusTitle = "Out for Delivery Today";
    badgeColor = "#3b82f6";
    message = `Your package ${orderNo} is out for delivery with our courier. Please ensure someone is available to receive it.`;
  } else if (status === "Delivered" || status === "Fulfilled") {
    statusTitle = "Order Successfully Delivered";
    badgeColor = "#10b981";
    message = `Your order ${orderNo} has been delivered. We hope you enjoy your new garments!`;
  } else if (status === "Cancelled") {
    statusTitle = "Order Cancellation Notice";
    badgeColor = "#ef4444";
    message = `Your order ${orderNo} has been cancelled. If a payment was processed, a full refund will be issued.`;
  }

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: bold; color: ${badgeColor}; letter-spacing: 0.3em; text-transform: uppercase; display: block; margin-bottom: 8px;">
        STATUS UPDATE • ${statusBadge}
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 26px; color: #F8F6F3; font-weight: normal; margin: 0 0 12px;">
        ${statusTitle}
      </h2>
      <p style="font-size: 13px; color: #999; line-height: 1.7; margin: 0 0 24px;">
        Dear ${customerName}, ${message}
      </p>

      <div style="background-color: #181818; border: 1px solid #222; border-radius: 10px; padding: 16px; margin: 0 auto 24px; max-width: 400px; text-align: left; font-size: 12px; color: #888;">
        <p style="margin: 0 0 6px;"><strong>Order ID:</strong> <span style="color: #C8A45D; font-family: monospace;">${orderNo}</span></p>
        <p style="margin: 0 0 6px;"><strong>Current Status:</strong> <span style="color: ${badgeColor}; font-weight: bold;">${status}</span></p>
        <p style="margin: 0;"><strong>Shipping Address:</strong> ${order.shippingAddress?.address || "On File"}</p>
      </div>

      <a href="http://localhost:3000/account" style="display: inline-block; padding: 12px 28px; background-color: #C8A45D; color: #090909; text-decoration: none; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 8px;">
        View Account Orders
      </a>
    </div>
  `;
  return wrapTemplate(`Status Update: Order ${orderNo}`, content);
}

// 4. Password Reset Email Template
function passwordResetTemplate({ customerName = "Client", resetToken = "" }) {
  const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: bold; color: #C8A45D; letter-spacing: 0.3em; text-transform: uppercase; display: block; margin-bottom: 8px;">
        SECURITY VERIFICATION
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 26px; color: #F8F6F3; font-weight: normal; margin: 0 0 12px;">
        Reset Your Password
      </h2>
      <p style="font-size: 13px; color: #999; line-height: 1.7; margin: 0 0 24px;">
        Hello ${customerName}, a password reset request was received for your GOR account. Click below to securely reset your credentials:
      </p>
      <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #C8A45D; color: #090909; text-decoration: none; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 8px;">
        Reset Password Now
      </a>
      <p style="font-size: 11px; color: #666; margin-top: 24px;">
        If you did not request a password reset, please ignore this email.
      </p>
    </div>
  `;
  return wrapTemplate("Reset Password — GOR MENSWEAR", content);
}

// 5. Admin Alert Templates
function adminNewOrderTemplate({ order }) {
  const content = `
    <div>
      <h2 style="font-size: 20px; color: #C8A45D; margin: 0 0 12px;">⚡ ADMIN ALERT: New Order Placed</h2>
      <p style="font-size: 13px; color: #CCC; margin: 0 0 16px;">
        Order <strong>${order.orderNo}</strong> placed by <strong>${order.customerName}</strong> (${order.customerEmail}).
      </p>
      <p style="font-size: 16px; font-weight: bold; color: #10b981; font-family: monospace;">
        Total Amount: ₹${(order.totalAmount || 0).toLocaleString("en-IN")}
      </p>
      <a href="http://localhost:3000/admin/orders" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #C8A45D; color: #000; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px;">
        Open Admin Orders
      </a>
    </div>
  `;
  return wrapTemplate("Admin Alert: New Order", content);
}

function adminLowStockTemplate({ products = [] }) {
  const list = products.map(p => `<li>${p.name} (Stock: <strong>${p.stock}</strong>)</li>`).join("");
  const content = `
    <div>
      <h2 style="font-size: 20px; color: #f59e0b; margin: 0 0 12px;">⚠️ ADMIN ALERT: Low Stock Warning</h2>
      <p style="font-size: 13px; color: #CCC; margin: 0 0 12px;">The following garments have low stock remaining:</p>
      <ul style="font-size: 13px; color: #F8F6F3; line-height: 1.6;">${list}</ul>
      <a href="http://localhost:3000/admin/inventory" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #C8A45D; color: #000; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px;">
        Manage Inventory
      </a>
    </div>
  `;
  return wrapTemplate("Admin Alert: Low Stock", content);
}

function adminNewCustomerTemplate({ customer }) {
  const content = `
    <div>
      <h2 style="font-size: 20px; color: #C8A45D; margin: 0 0 12px;">👤 ADMIN ALERT: New Customer Registered</h2>
      <p style="font-size: 13px; color: #CCC; margin: 0 0 8px;">Name: <strong>${customer.name}</strong></p>
      <p style="font-size: 13px; color: #CCC; margin: 0 0 16px;">Email: <strong>${customer.email}</strong></p>
      <a href="http://localhost:3000/admin/customers" style="display: inline-block; padding: 10px 20px; background: #C8A45D; color: #000; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px;">
        View Customer Profile
      </a>
    </div>
  `;
  return wrapTemplate("Admin Alert: New Customer", content);
}

module.exports = {
  welcomeTemplate,
  orderConfirmationTemplate,
  orderStatusTemplate,
  passwordResetTemplate,
  adminNewOrderTemplate,
  adminLowStockTemplate,
  adminNewCustomerTemplate,
};
