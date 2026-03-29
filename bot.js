require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const UPDATE_INTERVAL = 30000;

const SERVER_IMAGE = "https://iili.io/q0yCB19.png";
const JOIN_LINK = "https://acstuff.ru/s/q:race/online/join?ip=38.54.76.50&httpPort=8520";
const SERVER_URL = "http://38.54.76.50:8520/INFO";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let message;

// --------- Discord Bot ---------
async function getServerData() {
  const start = Date.now();
  try {
    const res = await axios.get(SERVER_URL, { timeout: 5000 });
    const ping = Date.now() - start;
    return { online: true, data: res.data, ping };
  } catch {
    const ping = Date.now() - start;
    return { online: false, data: null, ping };
  }
}

async function createEmbed() {
  const { online, data, ping } = await getServerData();

  const embed = new EmbedBuilder()
    .setTitle("🏎 Assetto Corsa Server")
    .setImage(SERVER_IMAGE)
    .setTimestamp()
    .setFooter({ text: "Auto Updating Server Status" })
    .setDescription(
      online
        ? `**👥 Players:** ${data.clients || 0}/${data.maxclients || 0}\n⏱ Time: ${data.time || "Unknown"}\n🌦 Weather: ${data.weather || "Unknown"}\n🎮 Car: ${data.car || "Unknown"}`
        : "🔴 **Server Offline**"
    )
    .setColor(online ? "#00ff88" : "#ff0000")
    .addFields(
      { name: "📶 Ping", value: `${ping} ms`, inline: true },
      { name: "🌐 Info", value: "38.54.76.50:8520", inline: true }
    );

  return { embed, online };
}

function createJoinButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("Join Server").setStyle(ButtonStyle.Link).setURL(JOIN_LINK)
  );
}

client.once("ready", async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);

  // جلب آخر رسالة البوت لتعديلها
  const messages = await channel.messages.fetch({ limit: 1 });
  message = messages.first();

  if (!message || message.author.id !== client.user.id) {
    const { embed, online } = await createEmbed();
    message = await channel.send({ embeds: [embed], components: online ? [createJoinButton()] : [] });
  }

  setInterval(async () => {
    const { embed, online } = await createEmbed();
    await message.edit({ embeds: [embed], components: online ? [createJoinButton()] : [] });
  }, UPDATE_INTERVAL);
});

client.login(TOKEN);

// --------- Express Dashboard ---------
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/dashboard", express.static("dashboard"));

// API لجلب البيانات من السيرفر الحقيقي
app.get("/api/server", async (req, res) => {
  try {
    const server = await axios.get(SERVER_URL);
    res.json(server.data);
  } catch {
    res.json({
      clients: 0,
      maxclients: 0,
      track: "Unknown",
      car: "Unknown",
      time: "Unknown",
      weather: "Unknown"
    });
  }
});

app.listen(PORT, () => console.log(`🌐 Dashboard API running on port ${PORT}`));
