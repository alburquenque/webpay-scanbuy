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

app.post("/api/pago/confirmar", async (req, res) => {
  try {
    const { token_ws } = req.body;

    if (!token_ws) {
      return res.status(400).json({
        error: "Token de transacción no proporcionado",
        status: "error",
      });
    }

    const response = await tx.commit(token_ws);

    let purchaseStatus = "error";
    let message = "Transacción fallida";

    if (response.status === "AUTHORIZED") {
      purchaseStatus = "success";
      message = "Transacción autorizada";
    } else if (response.status === "FAILED") {
      purchaseStatus = "error";
      message = "Transacción rechazada";
    } else if (response.status === "CANCELED") {
      purchaseStatus = "cancelled";
      message = "Transacción cancelada";
    }

    res.json({
      status: purchaseStatus,
      message: message,
      details: response,
    });
  } catch (error) {
    console.error("Error al verificar estado de transacción:", error);
    res.status(500).json({
      error: "Error al verificar estado de transacción",
      details: error.message,
      status: "error",
    });
  }
});

app.get("/api/pago/redirect", (req, res) => {
  const token_ws = req.query.token_ws;
  const userAgent = req.get("user-agent");
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

  console.log("Redirect recibido. Token:", token_ws);
  console.log("User-Agent:", userAgent);
  console.log("Es móvil:", isMobile);

  if (!token_ws) {
    console.error("Token no recibido, redirigiendo al esquema base...");
    return res.redirect("com.scanbuy.app://");
  }

  if (isMobile) {
    console.log("Redirigiendo a la app móvil con token...");
    return res.redirect(
      `com.scanbuy.app://payment/confirmation?token_ws=${token_ws}`
    );
  } else {
    console.log("Redirigiendo al navegador...");
    return res.redirect(
      `http://localhost:8100/payment/confirmation?token_ws=${token_ws}`
    );
  }
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
