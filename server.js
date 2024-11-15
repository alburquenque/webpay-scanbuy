const express = require("express");
const cors = require("cors");
const { WebpayPlus } = require("transbank-sdk");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : [
            "http://localhost:8100",
            "capacitor://localhost",
            "ionic://localhost",
            "http://localhost",
            "http://localhost:8080",
            "com.scanbuy.app",
            "com.scanbuy.app://",
            "*",
          ];

      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes("*") ||
        origin.startsWith("com.scanbuy.app")
      ) {
        callback(null, true);
      } else {
        console.log("Origin blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);

app.use(express.json());

const tx = new WebpayPlus.Transaction();

app.options("*", cors());

app.post("/api/pago/init", async (req, res) => {
  try {
    const { amount, buyOrder, returnUrl, sessionId } = req.body;

    if (!Number.isInteger(amount)) {
      throw new Error("El monto debe ser un número entero");
    }

    console.log("Datos de la transacción:", {
      amount,
      buyOrder,
      returnUrl,
      sessionId,
      clientIP: req.ip,
      origin: req.get("origin"),
      userAgent: req.get("user-agent"),
    });

    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);

    console.log("Respuesta de WebPay:", {
      token: response.token,
      url: response.url,
    });

    res.json({
      token: response.token,
      url: response.url,
    });
  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({
      error: "Error al iniciar transacción",
      details: error.message,
    });
  }
});

app.get("/api/pago/redirect", (req, res) => {
  const token_ws = req.query.token_ws;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Redirigiendo...</title>
      <script>
        function openApp() {
          // Intentar abrir la app con el deeplink
          window.location.href = "com.scanbuy.app://payment/confirmation?token_ws=${token_ws}";
          
          // Fallback después de 2 segundos si el deeplink no funciona
          setTimeout(function() {
            // Si estamos en dispositivo móvil pero el deeplink falló
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
              window.location.href = "https://webpay-scanbuy.onrender.com/payment/confirmation?token_ws=${token_ws}";
            } else {
              // Si estamos en desktop
              window.location.href = "http://localhost:8100/payment/confirmation?token_ws=${token_ws}";
            }
          }, 2000);
        }
      </script>
    </head>
    <body onload="openApp()">
      <p>Redirigiendo a la aplicación...</p>
    </body>
    </html>
  `;

  res.send(html);
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    corsOrigins: process.env.CORS_ORIGIN || "default origins",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `CORS Origins permitidos: ${process.env.CORS_ORIGIN || "default origins"}`
  );
});
