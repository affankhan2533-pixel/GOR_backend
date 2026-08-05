const express = require("express");
const router = express.Router();

// POST /api/newsletter
router.post("/", (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address required" });
    }

    res.json({
      success: true,
      message: "Welcome to GOR MENSWEAR Private Atelier.",
      promoCode: "GORVIP",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Newsletter subscription error" });
  }
});

module.exports = router;
