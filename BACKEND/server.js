const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with standard options
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Custom request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

let alerts = [];

// 📩 Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kunalshrivas67@gmail.com",
    pass: "rsao fqso lyxe nzpw",
  },
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn("⚠️ Mail Transporter offline (credentials might be expired/incorrect):", error.message);
  } else {
    console.log("📩 Mail Transporter ready to dispatch alerts");
  }
});

// 🩺 Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// 🚨 POST ALERT
app.post("/alert", async (req, res) => {
  const { threat_level, score, objects } = req.body;

  // Validation middleware check
  if (!threat_level || score === undefined || !Array.isArray(objects)) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid alert payload. Must contain threat_level, score (number), and objects (array)." 
    });
  }

  const alertData = {
    threat_level,
    score,
    objects,
    time: new Date().toLocaleString(),
  };

  console.log(`🚨 ALERT RECEIVED: [${alertData.threat_level}] Score: ${alertData.score} | Detected: ${alertData.objects.join(", ")}`);

  // ✅ Prevent duplicates (Checks within the same time signature and score)
  const isDuplicate = alerts.some(
    (a) => a.time === alertData.time && a.score === alertData.score,
  );

  if (!isDuplicate) {
    alerts.push(alertData);
    
    // ✅ Keep memory capped to last 50 alerts
    if (alerts.length > 50) {
      alerts.shift();
    }
  }

  // 📩 Handle Email Dispatching for HIGH threat alerts
  if (alertData.threat_level === "HIGH") {
    // Dynamic recipient fallback: If placeholder is used, route it to the authenticated user's address
    const recipientEmail = "receiver_email@gmail.com";
    const targetRecipient = recipientEmail === "receiver_email@gmail.com" ? transporter.options.auth.user : recipientEmail;
    const senderEmail = "your_email@gmail.com" === "your_email@gmail.com" ? transporter.options.auth.user : "your_email@gmail.com";

    try {
      await transporter.sendMail({
        from: `"Sentrix AI Security" <${senderEmail}>`,
        to: targetRecipient,
        subject: "🚨 CRITICAL THREAT DETECTED - SENTRIX AI",
        text: `
[SENTRIX SECURITY INCIDENT REPORT]
-----------------------------------------
Threat Level: ${alertData.threat_level} (CRITICAL)
Threat Score: ${alertData.score}%
Detected Objects: ${alertData.objects.join(", ")}
Incident Time: ${alertData.time}
Status: ACTIVE - UNRESOLVED
-----------------------------------------
Please check the monitoring dashboard immediately.
        `,
      });

      console.log(`📩 Dispatch: Notification email successfully sent to ${targetRecipient}`);
    } catch (err) {
      console.error("❌ Dispatch Error: Failed to send threat notification email:", err.message);
    }

    // ⏱ Escalation timer after 30 seconds
    setTimeout(async () => {
      // If the alert still exists in the unresolved array, escalate
      if (alerts.includes(alertData)) {
        try {
          await transporter.sendMail({
            from: `"Sentrix AI Security" <${senderEmail}>`,
            to: targetRecipient,
            subject: "🚨 ESCALATION ALERT - SENTRIX AI",
            text: `
[SENTRIX SECURITY ESCALATION REPORT]
-----------------------------------------
CRITICAL ALERT IS STILL ACTIVE AND UNRESOLVED.
Threat Level: HIGH
Threat Score: ${alertData.score}%
Time elapsed: 30 seconds since first detection
-----------------------------------------
Immediate physical sweep and action required.
            `,
          });
          console.log("🚨 Dispatch: Escalation alert successfully sent");
        } catch (err) {
          console.error("❌ Dispatch Error: Failed to send escalation alert:", err.message);
        }
      }
    }, 30000);
  }

  res.status(200).json({ success: true, message: "Alert processed successfully" });
});

// 📥 GET ALERTS
app.get("/alerts", (req, res) => {
  res.json(alerts);
});

// ❌ DELETE ALERT
app.delete("/alerts/:index", (req, res) => {
  const index = parseInt(req.params.index, 10);
  
  if (isNaN(index) || index < 0 || index >= alerts.length) {
    return res.status(400).json({ success: false, error: "Invalid alert index" });
  }

  alerts.splice(index, 1);
  console.log(`✅ Alert resolved and removed from index: ${index}`);
  res.status(200).json({ success: true, message: "Alert resolved successfully" });
});

const server = app.listen(PORT, () => console.log(`🚀 Sentrix AI Backend running on port ${PORT}`));

// Handle Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated.");
  });
});
