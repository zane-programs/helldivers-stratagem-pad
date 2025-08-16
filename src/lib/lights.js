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

  async flash(color, duration = 2000) {
    if (this._flashTimeout) {
      clearTimeout(this._flashTimeout);
      this._flashTimeout = null;
    }

    try {
      console.log(`[LightManager] Getting current state from device at ${this._deviceIp}`);
      const currentState = await this._device.info();
      const originalState = currentState.light_state;
      
      console.log(`[LightManager] Original state:`, {
        on_off: originalState.on_off,
        mode: originalState.mode,
        hue: originalState.hue,
        saturation: originalState.saturation,
        brightness: originalState.brightness,
        color_temp: originalState.color_temp
      });

      const [hue, saturation, brightness] = rgbToHsb(color);
      console.log(`[LightManager] Flashing with color ${color} -> HSB: ${hue}, ${saturation}, ${brightness}`);
      
      // Set the color with fast transition
      // When saturation > 0, the bulb switches to color mode automatically
      await this._device.power(true, 100, {
        mode: 'normal',
        hue: hue,
        saturation: saturation,
        brightness: brightness,
        color_temp: 0
      });

      this._flashTimeout = setTimeout(async () => {
        try {
          console.log(`[LightManager] Reverting to original state after ${duration}ms`);
          
          // Restore original state with transition
          await this._device.power(originalState.on_off === 1, 500, {
            mode: originalState.mode || 'normal',
            hue: originalState.hue,
            saturation: originalState.saturation,
            brightness: originalState.brightness,
            color_temp: originalState.color_temp
          });
        } catch (err) {
          console.error("[LightManager] Error reverting light state:", err);
        }
      }, duration);
    } catch (err) {
      console.error("[LightManager] Error flashing light:", err);
      throw err;
    }
  }
}

module.exports = { LightManager };