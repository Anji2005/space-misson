// Very simple interactive logic for cards, ISS live position, and solar chart.
// Written to be copy/paste friendly for beginners.

document.addEventListener('DOMContentLoaded', () => {
  const enterBtn = document.getElementById('enterBtn');
  const hero = document.getElementById('hero');
  const main = document.getElementById('main');
  const cards = document.querySelectorAll('.card');

  // Show main when Enter pressed
  enterBtn.addEventListener('click', () => {
    hero.classList.add('hidden');
    main.classList.remove('hidden');
    // automatically open ISS feature so user sees something
    showFeature('iss');
  });

  // Card clicks
  cards.forEach(card => {
    card.addEventListener('click', () => showFeature(card.dataset.feature));
  });

  // Show/hide features
  function showFeature(name) {
    document.querySelectorAll('.feature').forEach(s => s.classList.add('hidden'));
    if (name === 'iss') {
      document.getElementById('issSection').classList.remove('hidden');
      initISS();
    } else if (name === 'solar') {
      document.getElementById('solarSection').classList.remove('hidden');
      initSolar();
    } else {
      document.getElementById('placeholder').classList.remove('hidden');
      document.getElementById('placeholderTitle').textContent = name.toUpperCase().replace('-', ' ');
    }
  }

  /* ------------------ ISS MAP & LIVE POSITION WITH ALERT + USER MARKER + COLOR-CHANGING LINE ------------------ */
  let map, issMarker, userMarker, lineToISS, issInterval;
  let userLat = null, userLon = null;
  let issNear = false;

  function showISSAlert(lat, lon) {
    const banner = document.createElement('div');
    banner.textContent = "🚀 THE ISS IS PASSING NEAR YOU!";
    banner.style.cssText = `
      position:fixed;
      top:0; left:0; right:0;
      background:#ff3333;
      color:white;
      font-size:1.2em;
      padding:15px;
      text-align:center;
      font-weight:bold;
      z-index:9999;
    `;
    document.body.appendChild(banner);

    const sound = new Audio("https://www.soundjay.com/buttons/sounds/beep-07.mp3");
    sound.play();

    if (map) {
      map.setView([lat, lon], 6, { animate: true, duration: 2.0 });
    }

    setTimeout(() => {
      banner.remove();
      if (map) {
        map.setZoom(2);
      }
    }, 8000);
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function initISS() {
    if (!map) {
      map = L.map('map', { zoomControl: false, attributionControl: false }).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 8,
      }).addTo(map);

      issMarker = L.circleMarker([0, 0], {
        radius: 8,
        color: '#ff0000',
        fillColor: '#ff6666',
        fillOpacity: 0.8
      }).addTo(map);

      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          userLat = pos.coords.latitude;
          userLon = pos.coords.longitude;
          // Blue marker for user's location
          userMarker = L.circleMarker([userLat, userLon], {
            radius: 8,
            color: '#0000ff',
            fillColor: '#3399ff',
            fillOpacity: 0.8
          })
            .bindPopup("📍 You are here")
            .addTo(map);
        }, () => {
          console.warn("User location access denied.");
        });
      }

      updateISS();
      issInterval = setInterval(updateISS, 5000);
    }
  }

  async function updateISS() {
    const info = document.getElementById('issInfo');
    try {
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      const lat = data.latitude;
      const lon = data.longitude;
      const alt = data.altitude;
      const vel = data.velocity;

      issMarker.setLatLng([lat, lon]);
      map.panTo([lat, lon], { animate: true, duration: 0.8 });
      info.textContent = `Lat: ${lat.toFixed(3)} · Lon: ${lon.toFixed(3)} · Alt: ${alt.toFixed(1)} km · Speed: ${vel.toFixed(1)} km/h`;

      // Draw live line between user and ISS
      if (userLat !== null && userLon !== null) {
        const distance = getDistance(userLat, userLon, lat, lon);

        // Create line if it doesn't exist
        if (!lineToISS) {
          lineToISS = L.polyline([[userLat, userLon], [lat, lon]], { color: 'blue', weight: 2 }).addTo(map);
        } else {
          lineToISS.setLatLngs([[userLat, userLon], [lat, lon]]);
        }

        // Change line color depending on proximity
        if (distance < 1000) {
          lineToISS.setStyle({ color: 'red' });
          if (!issNear) {
            showISSAlert(lat, lon);
            issNear = true;
          }
        } else {
          lineToISS.setStyle({ color: 'blue' });
          issNear = false;
        }
      }

    } catch (err) {
      console.warn('ISS fetch failed, showing demo position.', err);
      const demoLat = (Math.sin(Date.now() / 30000) * 20);
      const demoLon = (Date.now() / 100000) % 360 - 180;
      issMarker.setLatLng([demoLat, demoLon]);
      info.textContent = `Demo Lat: ${demoLat.toFixed(2)} · Lon: ${demoLon.toFixed(2)} · (Live API failed)`;
    }
  }

  /* ------------------ SOLAR CHART ------------------ */
  let solarChart, solarInitialized = false;
  function initSolar() {
    if (solarInitialized) return;
    solarInitialized = true;

    const ctx = document.getElementById('solarChart').getContext('2d');
    const labels = ['Day -6', 'Day -5', 'Day -4', 'Day -3', 'Day -2', 'Day -1', 'Today'];
    const data = [18, 20, 22, 19, 21, 23, 24];

    solarChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Production (kWh)',
          data,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    document.getElementById('csvFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data;
          const newLabels = rows.map(r => r.date);
          const newData = rows.map(r => parseFloat(r.production || 0));
          if (newLabels.length === 0) return alert('CSV looks empty or incorrect. Expect columns: date,production');
          solarChart.data.labels = newLabels;
          solarChart.data.datasets[0].data = newData;
          solarChart.update();
        }
      });
    });
  }

}); // DOMContentLoaded