const nodemailer = require("nodemailer");
const templates = require("./emailTemplates");

class EmailService {
  constructor() {
    this.from = process.env.EMAIL_FROM || "GOR MENSWEAR <concierge@gormenswear.com>";
    this.adminEmail = process.env.ADMIN_EMAIL || "admin@gormenswear.com";
    this.transporter = null;
    this._initTransporter();
  }

  _initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user, pass },
      });
      console.log("✉️ EmailService: SMTP Transporter initialized for", host);
    } else {
      console.log("✉️ EmailService: SMTP credentials not set. Operating in Log Mode (non-blocking).");
    }
  }

  /**
   * Non-blocking asynchronous email sender with error logging
   */
  async _sendMail(to, subject, html) {
    setImmediate(async () => {
      try {
        if (this.transporter) {
          await this.transporter.sendMail({
            from: this.from,
            to,
            subject,
            html,
          });
          console.log(`✉️ EMAIL SENT to [${to}] — Subject: "${subject}"`);
        } else {
          console.log(`✉️ [EMAIL LOG MODE] To: ${to} | Subject: "${subject}"`);
        }
      } catch (err) {
        console.error(`✉️ EMAIL FAILURE to [${to}]:`, err.message);
      }
    });
  }

  // 1. Customer Welcome Email
  sendWelcomeEmail(customer) {
    if (!customer || !customer.email) return;
    const html = templates.welcomeTemplate({ customerName: customer.name });
    this._sendMail(customer.email, "Welcome to GOR MENSWEAR", html);
  }

  // 2. Customer Order Confirmation Email
  sendOrderConfirmationEmail(order) {
    if (!order || !order.customerEmail) return;
    const html = templates.orderConfirmationTemplate({ order });
    this._sendMail(order.customerEmail, `Order Confirmation - ${order.orderNo || order.id}`, html);
  }

  // 3. Customer Order Status Update Email (Shipped / Out for Delivery / Delivered / Cancelled)
  sendOrderStatusEmail(order, status) {
    if (!order || !order.customerEmail) return;
    const html = templates.orderStatusTemplate({ order, status });
    this._sendMail(order.customerEmail, `Order ${order.orderNo || order.id} Status: ${status}`, html);
  }

  // 4. Customer Password Reset Email
  sendPasswordResetEmail(customer, resetToken) {
    if (!customer || !customer.email) return;
    const html = templates.passwordResetTemplate({ customerName: customer.name, resetToken });
    this._sendMail(customer.email, "Reset Your GOR Password", html);
  }

  // 5. Admin New Order Alert
  sendAdminNewOrderAlert(order) {
    const html = templates.adminNewOrderTemplate({ order });
    this._sendMail(this.adminEmail, `[ADMIN ALERT] New Order ${order.orderNo}`, html);
  }

  // 6. Admin Low Stock Alert
  sendAdminLowStockAlert(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    const html = templates.adminLowStockTemplate({ products });
    this._sendMail(this.adminEmail, `[ADMIN ALERT] Low Stock Warning (${products.length} items)`, html);
  }

  // 7. Admin New Customer Alert
  sendAdminNewCustomerAlert(customer) {
    if (!customer || !customer.email) return;
    const html = templates.adminNewCustomerTemplate({ customer });
    this._sendMail(this.adminEmail, `[ADMIN ALERT] New Customer Signup: ${customer.name}`, html);
  }
}

module.exports = new EmailService();
