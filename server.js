const express = require("express");
const cors = require("cors");
const { WebpayPlus } = require("transbank-sdk");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:8100"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const tx = new WebpayPlus.Transaction();

app.post("/api/pago/init", async (req, res) => {
  try {
    const { amount, buyOrder, returnUrl, sessionId } = req.body;

    if (!Number.isInteger(amount)) {
      throw new Error("El monto debe ser un número entero");
    }

    console.log("Estos son los datos que me devuelve la transacción:", {
      amount,
      buyOrder,
      returnUrl,
      sessionId,
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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
