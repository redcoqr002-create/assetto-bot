require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const axios = require("axios");

// ====== ENV ======
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const UPDATE_INTERVAL = 30000;

if (!TOKEN || !CHANNEL_ID) {
  console.error("❌ Missing TOKEN or CHANNEL_ID in Environment Variables");
  process.exit(1);
}

// ====== Server Config ======
const SERVER_IMAGE = "https://iili.io/q0yCB19.png";
const JOIN_LINK =
  "https://acstuff.ru/s/q:race/online/join?ip=38.54.76.50&httpPort=8520";
const SERVER_URL = "http://38.54.76.50:8520/INFO";

// ====== Discord Client ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let message;

// --------- Fetch Server Data ---------
async function getServerData() {
  const start = Date.now();
  try {
    const res = await axios.get(SERVER_URL, { timeout: 5000 });
    const ping = Date.now() - start;
    return { online: true, data: res.data, ping };
  } catch (err) {
    const ping = Date.now() - start;
    return { online: false, data: null, ping };
  }
}

// --------- Create Embed ---------
async function createEmbed() {
  const { online, data, ping } = await getServerData();

  const embed = new EmbedBuilder()
    .setTitle("🏎 Assetto Corsa Server")
    .setImage(SERVER_IMAGE)
    .setTimestamp()
    .setFooter({ text: "Auto Updating Server Status" })
    .setColor(online ? 0x00ff88 : 0xff0000)
    .setDescription(
      online
        ? `**👥 Players:** ${data.clients || 0}/${data.maxclients || 0}
⏱ Time: ${data.time || "Unknown"}
🌦 Weather: ${data.weather || "Unknown"}
🎮 Car: ${data.car || "Unknown"}`
        : "🔴 **Server Offline**"
    )
    .addFields(
      { name: "📶 Ping", value: `${ping} ms`, inline: true },
      { name: "🌐 Info", value: "38.54.76.50:8520", inline: true }
    );

  return { embed, online };
}

// --------- Join Button ---------
function createJoinButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Join Server")
      .setStyle(ButtonStyle.Link)
      .setURL(JOIN_LINK)
  );
}

// --------- Bot Ready ---------
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 5 });

  message = messages.find(msg => msg.author.id === client.user.id);

  if (!message) {
    const { embed, online } = await createEmbed();
    message = await channel.send({
      embeds: [embed],
      components: online ? [createJoinButton()] : []
    });
  }

  setInterval(async () => {
    try {
      const { embed, online } = await createEmbed();
      await message.edit({
        embeds: [embed],
        components: online ? [createJoinButton()] : []
      });
    } catch (err) {
      console.log("⚠ Failed to update message");
    }
  }, UPDATE_INTERVAL);
});

client.login(TOKEN);

// --------- Express (Keep Alive + Dashboard) ---------
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/dashboard", express.static("dashboard"));

// Root route (مهم عشان UptimeRobot)
app.get("/", (req, res) => {
  res.send("Bot is alive 🚀");
});

// API endpoint
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

app.listen(PORT, () =>
  console.log(`🌐 Dashboard API running on port ${PORT}`)
);
