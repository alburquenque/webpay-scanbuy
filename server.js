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

  // Si no hay token, redirigir a la página principal
  if (!token_ws) {
    return res.redirect("http://localhost:8100");
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Procesando pago...</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f5f5f5;
        }
        .container {
          text-align: center;
          padding: 20px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          margin: 20px auto;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <script>
        function handleRedirect() {
          // La URL de la app con el deeplink
          const appUrl = 'com.scanbuy.app://payment/confirmation?token_ws=${token_ws}';
          
          // La URL web de fallback
          const webUrl = 'http://localhost:8100/payment/confirmation?token_ws=${token_ws}';
          
          // Detectar si es dispositivo móvil
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          if (isMobile) {
            // Intentar abrir la app
            window.location.href = appUrl;
            
            // Si después de 2 segundos no se abrió la app, ir a la versión web
            setTimeout(() => {
              window.location.href = webUrl;
            }, 2000);
          } else {
            // En desktop, ir directamente a la versión web
            window.location.href = webUrl;
          }
        }

        // Ejecutar cuando la página esté completamente cargada
        window.onload = handleRedirect;
      </script>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <p>Procesando tu pago...</p>
        <p>Redirigiendo a la aplicación...</p>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Agregar una ruta específica para la confirmación
app.get("/payment/confirmation", (req, res) => {
  const token_ws = req.query.token_ws;

  // Aquí puedes manejar la confirmación del pago si es necesario
  // y luego redirigir a la app o a la versión web según corresponda

  res.redirect(
    `http://localhost:8100/payment/confirmation?token_ws=${token_ws}`
  );
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
