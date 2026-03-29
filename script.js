const apiURL = "http://localhost:3000/api/server";

let playersHistory = [];

async function loadData() {
  try {
    const res = await fetch(apiURL);
    const data = await res.json();

    const online = data.online;
    const serverData = data.data || {};
    
    document.getElementById("status").innerText = online ? "🟢 Online" : "🔴 Offline";
    document.getElementById("players").innerText = online ? `${serverData.clients || 0}/${serverData.maxclients || 0}` : "0/0";
    document.getElementById("time").innerText = online ? ((serverData.time >= 6 && serverData.time < 18) ? "☀️ Day" : "🌙 Night") : "--";
    document.getElementById("weather").innerText = online ? (serverData.weather || serverData.session_weather || "Clear ☀️") : "--";
    document.getElementById("track").innerText = online ? (serverData.track_name || serverData.track || "Unknown") : "--";
    document.getElementById("ping").innerText = `${data.ping} ms`;

    if (online) {
      playersHistory.push(serverData.clients || 0);
      if (playersHistory.length > 10) playersHistory.shift();
    }

    updateChart();
  } catch (err) {
    console.log(err);
  }
}

let chart = null;
function updateChart() {
  const ctx = document.getElementById('playersChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: playersHistory.map((_, i) => i + 1),
      datasets: [{
        label: 'Players',
        data: playersHistory,
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0,255,136,0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

setInterval(loadData, 3000);
loadData();