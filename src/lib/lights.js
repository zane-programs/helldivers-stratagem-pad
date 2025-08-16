const TPLSmartDevice = require("tplink-lightbulb");

function rgbToHsb(rgb) {
  const result = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgb);
  if (!result) return [0, 0, 100];

  let r = parseInt(result[1]);
  let g = parseInt(result[2]);
  let b = parseInt(result[3]);

  r /= 255, g /= 255, b /= 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;

  let d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

class LightManager {
  constructor(deviceIp) {
    this._deviceIp = deviceIp;
    this._device = new TPLSmartDevice(this._deviceIp);
    this._flashTimeout = null;
  }

  async flash(color, duration = 500) {
    if (this._flashTimeout) {
      clearTimeout(this._flashTimeout);
      this._flashTimeout = null;
    }

    try {
      const currentState = await this._device.info();
      const originalState = currentState.light_state;

      const [hue, saturation, brightness] = rgbToHsb(color);
      
      await this._device.power(true, 100, { hue, saturation, brightness });

      this._flashTimeout = setTimeout(async () => {
        try {
          await this._device.power(originalState.on_off, 500, {
            hue: originalState.hue,
            saturation: originalState.saturation,
            brightness: originalState.brightness,
          });
        } catch (err) {
          console.error("Error reverting light state:", err);
        }
      }, duration);
    } catch (err) {
      console.error("Error flashing light:", err);
    }
  }
}

module.exports = { LightManager };