require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const axios = require("axios");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const express = require("express");
const path = require("path");

// ==========================
// المتغيرات
// ==========================
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const SERVER_URL = "http://38.54.76.50:8520/INFO";
const JOIN_LINK = "https://acstuff.ru/s/q:race/online/join?ip=38.54.76.50&httpPort=8520";

const UPDATE_INTERVAL = 30000;
const CACHE_TIME = 10000; // 10 ثواني

const SERVER_IMAGE_ONLINE = "https://iili.io/q0yCB19.png";
const SERVER_IMAGE_OFFLINE = "https://iili.io/H8kq0KX.png";

const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });

// ==========================
// Express API (للموقع)
// ==========================
const app = express();
const PORT = 3000;

app.use(express.json());

// ملفات ثابتة
app.use("/dashboard", express.static(path.join(__dirname, "dashboard")));

let cachedData = null;
let lastFetch = 0;

app.get("/api/server", async (req, res) => {
  if (!cachedData) cachedData = await getServerData();
  res.json(cachedData);
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard API running on http://localhost:${PORT}`);
});

// ==========================
// Discord Client
// ==========================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let message;
let playersHistory = [];
let lastFullAlert = false;

// ==========================
// دالة جلب بيانات السيرفر مع Cache
// ==========================
async function getServerData() {
  const now = Date.now();
  if (cachedData && (now - lastFetch < CACHE_TIME)) return cachedData;

  const start = Date.now();
  try {
    const res = await axios.get(SERVER_URL, { timeout: 5000 });
    const ping = Date.now() - start;

    cachedData = { online: true, data: res.data, ping };
  } catch {
    const ping = Date.now() - start;
    cachedData = { online: false, data: null, ping };
  }

  lastFetch = now;
  return cachedData;
}

// ==========================
// رسم بياني Players
// ==========================
async function generateChart() {
  if (playersHistory.length === 0) return null;

  const configuration = {
    type: "line",
    data: {
      labels: playersHistory.map((_, i) => i + 1),
      datasets: [{
        label: "Players",
        data: playersHistory,
        borderColor: "#00ff88",
        backgroundColor: "rgba(0,255,136,0.2)",
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  };

  return await chartCanvas.renderToBuffer(configuration);
}

// ==========================
// زر دخول
// ==========================
function createJoinButton() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel("Join Server")
        .setStyle(ButtonStyle.Link)
        .setURL(JOIN_LINK)
    );
}

// ==========================
// إشعار Full Server
// ==========================
async function checkFullAlert(channel, players, maxPlayers) {
  if (players >= maxPlayers && !lastFullAlert) {
    lastFullAlert = true;
    channel.send({ content: "@everyone 🚨 السيرفر امتلأ!" });
  } else if (players < maxPlayers) {
    lastFullAlert = false;
  }
}

// ==========================
// إنشاء Embed
// ==========================
async function createEmbed() {
  const { online, data, ping } = await getServerData();

  let players = 0;
  let maxPlayers = 0;
  let time = "Unknown";
  let weather = "Clear ☀️";
  let track = "Unknown";
  let cars = "Unknown";

  if (online && data) {
    players = data.clients || 0;
    maxPlayers = data.maxclients || 0;
    track = data.track_name || data.track || "Unknown";
    cars = data.cars?.join(", ") || "Unknown";

    const hour = data.time || 12;
    time = (hour >= 6 && hour < 18) ? "☀️ Day" : "🌙 Night";
    weather = data.weather || data.session_weather || "Clear ☀️";

    // تحديث الرسوم البيانية
    playersHistory.push(players);
    if (playersHistory.length > 10) playersHistory.shift();
  }

  // حالة السيرفر وألوان ديناميكية
  let statusText = "🟢 Online";
  let statusDesc = "Server running smoothly";
  let color = "#00ff88";

  if (!online) {
    statusText = "🔴 Offline";
    statusDesc = "Server is currently down";
    color = "#ff0000";
  } else if (players === 0) {
    statusText = "🟡 Empty";
    statusDesc = "No players online";
    color = "#ffaa00";
  } else if (players >= maxPlayers) {
    statusText = "🔴 Full";
    statusDesc = "Server is full";
    color = "#ff0000";
  } else if (players > maxPlayers * 0.7) {
    statusText = "🟠 Busy";
    statusDesc = "Server almost full";
    color = "#ff8800";
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("🏎 سيرفر طيب الرقدة")
    .setImage(online ? SERVER_IMAGE_ONLINE : SERVER_IMAGE_OFFLINE)
    .setTimestamp()
    .setFooter({ text: "Live Server Monitor • Auto Refresh" });

  if (!online) {
    embed.setDescription(
      "🔴 **SERVER OFFLINE**\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ السيرفر متوقف حالياً\nحاول مرة ثانية لاحقاً"
    );
  } else {
    embed.setDescription(
      "🏁 **احصائيات السيرفر**\n━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      `👥 **Players:** \`${players}/${maxPlayers}\`\n` +
      `📊 **Status:** ${statusText}\n` +
      `💬 *${statusDesc}*\n\n` +
      `⏱ **Time:** ${time}\n` +
      `🌦 **Weather:** ${weather}\n\n` +
      "━━━━━━━━━━━━━━━━━━━━━━\n🎮 **Click the button below to join!**"
    );

    embed.addFields(
      { name: "🗺 Track", value: `\`${track}\``, inline: true },
      { name: "📶 Ping", value: `\`${ping} ms\``, inline: true },
      { name: "🚗 Cars", value: cars.length > 100 ? cars.slice(0, 100) + "..." : cars, inline: false }
    );
  }

  return { embed, online };
}

// ==========================
// تشغيل البوت
// ==========================
client.once("clientReady", async () => {
  console.log(`Bot logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  const { embed, online } = await createEmbed();
  const chart = await generateChart();

  message = await channel.send({
    embeds: [embed],
    files: chart ? [{ attachment: chart, name: "chart.png" }] : [],
    components: online ? [createJoinButton()] : []
  });

  setInterval(async () => {
    try {
      const { embed, online } = await createEmbed();
      const chart = await generateChart();
      if (online && cachedData.data) {
        await checkFullAlert(channel, cachedData.data.clients || 0, cachedData.data.maxclients || 0);
      }

      await message.edit({
        embeds: [embed],
        files: chart ? [{ attachment: chart, name: "chart.png" }] : [],
        components: online ? [createJoinButton()] : []
      });
    } catch (err) {
      console.log("Error updating:", err.message);
    }
  }, UPDATE_INTERVAL);
});

client.login(TOKEN);