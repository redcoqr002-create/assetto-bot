require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const UPDATE_INTERVAL = 30000;

const SERVER_IMAGE = "https://iili.io/q0yCB19.png"; // صورة السيرفر
const JOIN_LINK = "#"; // لو عندك رابط للانضمام

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let message;

// --------- Discord Bot ---------
async function getServerData() {
  const start = Date.now();
  try {
    const res = await axios.get("http://localhost:3000/api/server", { timeout: 5000 });
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
        ? `**👥 Players:** ${data.clients || 0}/${data.maxclients || 0}\n⏱ Time: ${data.time || "Unknown"}\n🌦 Weather: ${data.weather || "Unknown"}`
        : "🔴 **Server Offline**"
    )
    .setColor(online ? "#00ff88" : "#ff0000");

  return { embed, online };
}

function createJoinButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Join Server")
      .setStyle(ButtonStyle.Link)
      .setURL(JOIN_LINK)
  );
}

client.once("ready", async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);
  const { embed, online } = await createEmbed();

  message = await channel.send({
    embeds: [embed],
    components: online ? [createJoinButton()] : []
  });

  setInterval(async () => {
    const { embed, online } = await createEmbed();
    await message.edit({
      embeds: [embed],
      components: online ? [createJoinButton()] : []
    });
  }, UPDATE_INTERVAL);
});

client.login(TOKEN);

// --------- Express Dashboard ---------
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/dashboard", express.static("dashboard"));

// Dummy API for testing
app.get("/api/server", (req, res) => {
  // مثال بيانات السيرفر
  res.json({
    clients: Math.floor(Math.random() * 16),
    maxclients: 16,
    track: "Monza",
    car: "Ferrari 488",
    time: "Day",
    weather: "Sunny"
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard API running on port ${PORT}`);
});
