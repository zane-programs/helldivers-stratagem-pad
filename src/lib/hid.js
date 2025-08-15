#!/usr/bin/env node

/**
 * USB HID Keyboard Controller for Raspberry Pi 4
 * Node.js Implementation
 *
 * A modular, well-structured Node.js utility class for controlling
 * USB HID keyboard gadget functionality on Raspberry Pi 4.
 *
 * @version 1.0.0
 */

const fs = require("fs").promises;
const { EventEmitter } = require("events");

/**
 * USB HID Keyboard Controller Class
 * Provides comprehensive interface for USB HID keyboard gadget operations
 */
class HIDKeyboard extends EventEmitter {
  /**
   * HID device path on the system
   * @static
   * @readonly
   */
  static get HID_DEVICE() {
    return "/dev/hidg0";
  }

  /**
   * USB HID Key codes mapping for standard keyboard layout
   * @static
   * @readonly
   */
  static get KEY_CODES() {
    return {
      // Letters (a-z)
      a: 0x04,
      b: 0x05,
      c: 0x06,
      d: 0x07,
      e: 0x08,
      f: 0x09,
      g: 0x0a,
      h: 0x0b,
      i: 0x0c,
      j: 0x0d,
      k: 0x0e,
      l: 0x0f,
      m: 0x10,
      n: 0x11,
      o: 0x12,
      p: 0x13,
      q: 0x14,
      r: 0x15,
      s: 0x16,
      t: 0x17,
      u: 0x18,
      v: 0x19,
      w: 0x1a,
      x: 0x1b,
      y: 0x1c,
      z: 0x1d,

      // Numbers (0-9)
      1: 0x1e,
      2: 0x1f,
      3: 0x20,
      4: 0x21,
      5: 0x22,
      6: 0x23,
      7: 0x24,
      8: 0x25,
      9: 0x26,
      0: 0x27,

      // Special keys
      enter: 0x28,
      return: 0x28,
      escape: 0x29,
      esc: 0x29,
      backspace: 0x2a,
      tab: 0x2b,
      space: 0x2c,
      spacebar: 0x2c,

      // Punctuation and symbols
      "-": 0x2d,
      minus: 0x2d,
      "=": 0x2e,
      equal: 0x2e,
      "[": 0x2f,
      "]": 0x30,
      "\\": 0x31,
      backslash: 0x31,
      ";": 0x33,
      semicolon: 0x33,
      "'": 0x34,
      quote: 0x34,
      "`": 0x35,
      grave: 0x35,
      ",": 0x36,
      comma: 0x36,
      ".": 0x37,
      period: 0x37,
      "/": 0x38,
      slash: 0x38,

      // Function keys
      f1: 0x3a,
      f2: 0x3b,
      f3: 0x3c,
      f4: 0x3d,
      f5: 0x3e,
      f6: 0x3f,
      f7: 0x40,
      f8: 0x41,
      f9: 0x42,
      f10: 0x43,
      f11: 0x44,
      f12: 0x45,

      // Navigation keys
      insert: 0x49,
      home: 0x4a,
      pageup: 0x4b,
      pagedown: 0x4e,
      delete: 0x4c,
      end: 0x4d,
      right: 0x4f,
      left: 0x50,
      down: 0x51,
      up: 0x52,

      // System keys
      printscreen: 0x46,
      scrolllock: 0x47,
      pause: 0x48,
      capslock: 0x39,
      numlock: 0x53,

      // Numpad keys
      kp_divide: 0x54,
      kp_multiply: 0x55,
      kp_minus: 0x56,
      kp_plus: 0x57,
      kp_enter: 0x58,
      kp_1: 0x59,
      kp_2: 0x5a,
      kp_3: 0x5b,
      kp_4: 0x5c,
      kp_5: 0x5d,
      kp_6: 0x5e,
      kp_7: 0x5f,
      kp_8: 0x60,
      kp_9: 0x61,
      kp_0: 0x62,
      kp_period: 0x63,
    };
  }

  /**
   * Modifier key bitmasks for HID reports
   * @static
   * @readonly
   */
  static get MODIFIERS() {
    return {
      ctrl: 0x01,
      lctrl: 0x01, // Left Control
      shift: 0x02,
      lshift: 0x02, // Left Shift
      alt: 0x04,
      lalt: 0x04, // Left Alt
      meta: 0x08,
      lmeta: 0x08, // Left Meta (Windows/Cmd)
      cmd: 0x08,
      super: 0x08, // Aliases for Meta
      rctrl: 0x10, // Right Control
      rshift: 0x20, // Right Shift
      ralt: 0x40,
      altgr: 0x40, // Right Alt
      rmeta: 0x80,
      rcmd: 0x80, // Right Meta
    };
  }

  /**
   * Characters requiring shift modifier
   * @static
   * @readonly
   */
  static get SHIFT_CHARACTERS() {
    return {
      // Shifted numbers
      "!": "1",
      "@": "2",
      "#": "3",
      $: "4",
      "%": "5",
      "^": "6",
      "&": "7",
      "*": "8",
      "(": "9",
      ")": "0",

      // Shifted punctuation
      _: "-",
      "+": "=",
      "{": "[",
      "}": "]",
      "|": "\\",
      ":": ";",
      '"': "'",
      "~": "`",
      "<": ",",
      ">": ".",
      "?": "/",

      // Uppercase letters
      A: "a",
      B: "b",
      C: "c",
      D: "d",
      E: "e",
      F: "f",
      G: "g",
      H: "h",
      I: "i",
      J: "j",
      K: "k",
      L: "l",
      M: "m",
      N: "n",
      O: "o",
      P: "p",
      Q: "q",
      R: "r",
      S: "s",
      T: "t",
      U: "u",
      V: "v",
      W: "w",
      X: "x",
      Y: "y",
      Z: "z",
    };
  }

  /**
   * Default configuration options
   * @static
   * @readonly
   */
  static get DEFAULT_CONFIG() {
    return {
      devicePath: HIDKeyboard.HID_DEVICE,
      defaultDelay: 50, // milliseconds
      keyHoldTime: 100, // milliseconds
      autoRelease: true,
      enableLogging: false,
    };
  }

  /**
   * Initialize HID Keyboard controller
   * @param {Object} options - Configuration options
   * @param {string} [options.devicePath] - Custom HID device path
   * @param {number} [options.defaultDelay] - Default delay between keystrokes (ms)
   * @param {number} [options.keyHoldTime] - How long to hold keys (ms)
   * @param {boolean} [options.autoRelease] - Auto-release keys after press
   * @param {boolean} [options.enableLogging] - Enable debug logging
   */
  constructor(options = {}) {
    super();

    this.config = { ...HIDKeyboard.DEFAULT_CONFIG, ...options };
    this.deviceHandle = null;
    this.isConnected = false;
    this.currentReport = Buffer.alloc(8); // 8-byte HID report
    
    // Track currently held keys and modifiers
    this.heldModifiers = 0; // Bitmask of held modifiers
    this.heldKeys = []; // Array of held key codes (max 6)

    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendReport = this.sendReport.bind(this);

    this._log("HIDKeyboard initialized with config:", this.config);
  }

  /**
   * Internal logging method
   * @private
   * @param {...*} args - Arguments to log
   */
  _log(...args) {
    if (this.config.enableLogging) {
      console.log("[HIDKeyboard]", ...args);
    }
  }

  /**
   * Validate HID device availability
   * @returns {Promise<boolean>} Device availability status
   */
  async isDeviceAvailable() {
    try {
      await fs.access(
        this.config.devicePath,
        fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Connect to HID device
   * @returns {Promise<boolean>} Connection success status
   * @throws {Error} If device connection fails
   */
  async connect() {
    if (this.isConnected) {
      this._log("Already connected to HID device");
      return true;
    }

    try {
      // Check device availability first
      const available = await this.isDeviceAvailable();
      if (!available) {
        throw new Error(
          `HID device not found or inaccessible: ${this.config.devicePath}`
        );
      }

      // Open device handle
      this.deviceHandle = await fs.open(this.config.devicePath, "r+");
      this.isConnected = true;

      this._log("Successfully connected to HID device");
      this.emit("connected");

      return true;
    } catch (error) {
      this.isConnected = false;
      this.deviceHandle = null;

      this._log("Failed to connect:", error.message);
      this.emit("error", error);

      throw new Error(`Failed to connect to HID device: ${error.message}`);
    }
  }

  /**
   * Disconnect from HID device
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected || !this.deviceHandle) {
      return;
    }

    try {
      // Release all keys before disconnecting
      await this.releaseAll();

      // Close device handle
      await this.deviceHandle.close();

      this.deviceHandle = null;
      this.isConnected = false;

      this._log("Disconnected from HID device");
      this.emit("disconnected");
    } catch (error) {
      this._log("Error during disconnect:", error.message);
      this.emit("error", error);
    }
  }

  /**
   * Send raw HID keyboard report
   * @param {number} [modifiers=0] - Modifier key bitmask
   * @param {number[]} [keys=[]] - Array of key codes (max 6)
   * @returns {Promise<void>}
   * @throws {Error} If not connected or write fails
   */
  async sendReport(modifiers = 0, keys = []) {
    if (!this.isConnected || !this.deviceHandle) {
      throw new Error("Not connected to HID device");
    }

    // Validate inputs
    if (modifiers < 0 || modifiers > 255) {
      throw new Error("Invalid modifier bitmask");
    }

    if (!Array.isArray(keys) || keys.length > 6) {
      throw new Error("Keys must be an array with maximum 6 elements");
    }

    // Build HID report: [modifier, reserved, key1, key2, key3, key4, key5, key6]
    this.currentReport.fill(0);
    this.currentReport[0] = modifiers;
    this.currentReport[1] = 0; // Reserved byte

    for (let i = 0; i < Math.min(keys.length, 6); i++) {
      this.currentReport[2 + i] = keys[i] || 0;
    }

    try {
      await this.deviceHandle.write(this.currentReport, 0, 8, null);
      this._log(
        "Sent HID report:",
        Array.from(this.currentReport)
          .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
          .join(" ")
      );
      this.emit("reportSent", {
        modifiers,
        keys,
        report: Buffer.from(this.currentReport),
      });
    } catch (error) {
      this._log("Failed to send HID report:", error.message);
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Release all keys (send empty report)
   * @returns {Promise<void>}
   */
  async releaseAll() {
    this.heldModifiers = 0;
    this.heldKeys = [];
    await this.sendReport(0, []);
    this._log("Released all keys");
  }

  /**
   * Hold a key or modifier without releasing it
   * Allows combining multiple keys/modifiers
   * @param {string} key - Key or modifier name to hold
   * @returns {Promise<void>}
   * @throws {Error} If key is invalid or max keys reached
   */
  async holdKey(key) {
    const normalizedKey = key.toLowerCase().trim();
    
    // Check if it's a modifier
    if (normalizedKey in HIDKeyboard.MODIFIERS) {
      const modifierValue = HIDKeyboard.MODIFIERS[normalizedKey];
      this.heldModifiers |= modifierValue;
      await this.sendReport(this.heldModifiers, this.heldKeys);
      this._log(`Holding modifier: ${key} (0x${modifierValue.toString(16)})`);
      this.emit('keyHeld', { key, type: 'modifier', value: modifierValue });
      return;
    }
    
    // It's a regular key
    const keyCode = this._resolveKeyCode(key);
    if (keyCode === null) {
      throw new Error(`Unknown key: ${key}`);
    }
    
    // Check if key is already held
    if (this.heldKeys.includes(keyCode)) {
      this._log(`Key already held: ${key}`);
      return;
    }
    
    // Check max keys limit (USB HID supports max 6 simultaneous keys)
    if (this.heldKeys.length >= 6) {
      throw new Error('Maximum 6 keys can be held simultaneously');
    }
    
    this.heldKeys.push(keyCode);
    await this.sendReport(this.heldModifiers, this.heldKeys);
    this._log(`Holding key: ${key} (0x${keyCode.toString(16)})`);
    this.emit('keyHeld', { key, type: 'key', keyCode });
  }

  /**
   * Release a specific held key or modifier
   * @param {string} key - Key or modifier name to release
   * @returns {Promise<void>}
   */
  async releaseKey(key) {
    const normalizedKey = key.toLowerCase().trim();
    
    // Check if it's a modifier
    if (normalizedKey in HIDKeyboard.MODIFIERS) {
      const modifierValue = HIDKeyboard.MODIFIERS[normalizedKey];
      this.heldModifiers &= ~modifierValue; // Clear the modifier bit
      await this.sendReport(this.heldModifiers, this.heldKeys);
      this._log(`Released modifier: ${key}`);
      this.emit('keyReleased', { key, type: 'modifier' });
      return;
    }
    
    // It's a regular key
    const keyCode = this._resolveKeyCode(key);
    if (keyCode === null) {
      this._log(`Cannot release unknown key: ${key}`);
      return;
    }
    
    const keyIndex = this.heldKeys.indexOf(keyCode);
    if (keyIndex !== -1) {
      this.heldKeys.splice(keyIndex, 1);
      await this.sendReport(this.heldModifiers, this.heldKeys);
      this._log(`Released key: ${key}`);
      this.emit('keyReleased', { key, type: 'key' });
    } else {
      this._log(`Key was not held: ${key}`);
    }
  }

  /**
   * Press a key while maintaining currently held keys/modifiers
   * Useful for key combinations where some keys need to stay held
   * @param {string} key - Key to press
   * @param {Object} [options={}] - Press options
   * @param {number} [options.holdTime] - Hold duration in milliseconds
   * @returns {Promise<void>}
   */
  async pressWithHeld(key, options = {}) {
    const { holdTime = this.config.keyHoldTime } = options;
    
    // Temporarily add the key to held keys
    const keyCode = this._resolveKeyCode(key);
    if (keyCode === null) {
      throw new Error(`Unknown key: ${key}`);
    }
    
    const tempKeys = [...this.heldKeys];
    if (!tempKeys.includes(keyCode) && tempKeys.length < 6) {
      tempKeys.push(keyCode);
    }
    
    // Send the combined report
    await this.sendReport(this.heldModifiers, tempKeys);
    this._log(`Pressed ${key} with held keys/modifiers`);
    
    // Hold for specified time
    if (holdTime > 0) {
      await this._delay(holdTime);
    }
    
    // Return to original held state
    await this.sendReport(this.heldModifiers, this.heldKeys);
    await this._delay(10); // Brief inter-key delay
    
    this.emit('keyPressedWithHeld', { key, keyCode, heldModifiers: this.heldModifiers, heldKeys: this.heldKeys });
  }

  /**
   * Press a single key with optional modifiers
   * @param {string} key - Key name to press
   * @param {Object} [options={}] - Press options
   * @param {string[]} [options.modifiers=[]] - Modifier keys
   * @param {number} [options.holdTime] - Hold duration in milliseconds
   * @param {boolean} [options.autoRelease=true] - Auto-release after hold time
   * @returns {Promise<void>}
   * @throws {Error} If key is invalid
   */
  async pressKey(key, options = {}) {
    const {
      modifiers = [],
      holdTime = this.config.keyHoldTime,
      autoRelease = this.config.autoRelease,
    } = options;

    // Resolve key code
    const keyCode = this._resolveKeyCode(key);
    if (keyCode === null) {
      throw new Error(`Unknown key: ${key}`);
    }

    // Calculate modifier bitmask
    const modifierMask = this._calculateModifierMask(modifiers);

    // Send key press
    await this.sendReport(modifierMask, [keyCode]);
    this._log(
      `Pressed key: ${key} (0x${keyCode.toString(
        16
      )}) with modifiers: ${modifiers.join("+")}`
    );

    // Hold for specified time
    if (holdTime > 0) {
      await this._delay(holdTime);
    }

    // Auto-release if enabled
    if (autoRelease) {
      await this.releaseAll();
      await this._delay(10); // Brief inter-key delay
    } else {
      // If not auto-releasing, update held state
      this.heldModifiers = modifierMask;
      this.heldKeys = [keyCode];
    }

    this.emit("keyPressed", { key, keyCode, modifiers, holdTime, autoRelease });
  }

  /**
   * Send a key combination (e.g., "ctrl+c", "alt+f4")
   * @param {string} combination - Key combination string
   * @param {Object} [options={}] - Press options
   * @returns {Promise<void>}
   */
  async sendKeyCombination(combination, options = {}) {
    const parts = combination
      .toLowerCase()
      .split("+")
      .map((part) => part.trim());

    if (parts.length < 2) {
      throw new Error(
        'Key combination must have at least 2 parts (e.g., "ctrl+c")'
      );
    }

    const modifiers = parts.slice(0, -1); // All but last are modifiers
    const key = parts[parts.length - 1]; // Last is the main key

    // Validate all modifiers
    for (const modifier of modifiers) {
      if (!(modifier in HIDKeyboard.MODIFIERS)) {
        throw new Error(`Unknown modifier: ${modifier}`);
      }
    }

    await this.pressKey(key, { ...options, modifiers });
    this._log(`Sent key combination: ${combination}`);
    this.emit("combinationSent", { combination, modifiers, key });
  }

  /**
   * Type a string of text
   * @param {string} text - Text to type
   * @param {Object} [options={}] - Typing options
   * @param {number} [options.delay] - Delay between characters (ms)
   * @param {boolean} [options.preserveCase=true] - Handle uppercase/special chars
   * @returns {Promise<void>}
   */
  async typeText(text, options = {}) {
    const { delay = this.config.defaultDelay, preserveCase = true } = options;

    this._log(`Typing text: "${text}"`);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      try {
        if (preserveCase && char in HIDKeyboard.SHIFT_CHARACTERS) {
          // Character requires shift
          const baseChar = HIDKeyboard.SHIFT_CHARACTERS[char];
          await this.pressKey(baseChar, { modifiers: ["shift"] });
        } else if (char === " ") {
          await this.pressKey("space");
        } else if (char.toLowerCase() in HIDKeyboard.KEY_CODES) {
          await this.pressKey(char.toLowerCase());
        } else {
          this._log(`Warning: Cannot type character '${char}' (skipping)`);
          this.emit("characterSkipped", { character: char, position: i });
          continue;
        }

        // Inter-character delay
        if (delay > 0 && i < text.length - 1) {
          await this._delay(delay);
        }
      } catch (error) {
        this._log(`Error typing character '${char}':`, error.message);
        this.emit("typingError", { character: char, position: i, error });
      }
    }

    this._log(`Finished typing text`);
    this.emit("textTyped", { text, length: text.length });
  }

  /**
   * Execute a sequence of keyboard actions
   * @param {Array} actions - Array of action objects
   * @returns {Promise<void>}
   *
   * @example
   * await keyboard.executeSequence([
   *   { type: 'key', key: 'ctrl+a' },
   *   { type: 'delay', duration: 100 },
   *   { type: 'text', text: 'Hello World' },
   *   { type: 'key', key: 'enter' }
   * ]);
   */
  async executeSequence(actions) {
    this._log(`Executing sequence of ${actions.length} actions`);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      try {
        switch (action.type) {
          case "key":
            if (action.key.includes("+")) {
              await this.sendKeyCombination(action.key, action.options);
            } else {
              await this.pressKey(action.key, action.options);
            }
            break;

          case "text":
            await this.typeText(action.text, action.options);
            break;

          case "delay":
            await this._delay(action.duration || 100);
            break;

          case "release":
            await this.releaseAll();
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        this.emit("actionExecuted", { action, index: i });
      } catch (error) {
        this._log(`Error executing action ${i}:`, error.message);
        this.emit("sequenceError", { action, index: i, error });
        throw error;
      }
    }

    this._log("Sequence execution completed");
    this.emit("sequenceCompleted", { actionCount: actions.length });
  }

  /**
   * Get list of available keys
   * @returns {Object} Object containing key categories
   */
  getAvailableKeys() {
    const keys = HIDKeyboard.KEY_CODES;

    return {
      letters: Object.keys(keys).filter((k) => /^[a-z]$/.test(k)),
      numbers: Object.keys(keys).filter((k) => /^[0-9]$/.test(k)),
      function: Object.keys(keys).filter((k) => /^f\d+$/.test(k)),
      navigation: [
        "up",
        "down",
        "left",
        "right",
        "home",
        "end",
        "pageup",
        "pagedown",
      ],
      modifiers: Object.keys(HIDKeyboard.MODIFIERS),
      special: Object.keys(keys).filter(
        (k) =>
          !(
            /^[a-z0-9]$/.test(k) ||
            /^f\d+$/.test(k) ||
            [
              "up",
              "down",
              "left",
              "right",
              "home",
              "end",
              "pageup",
              "pagedown",
            ].includes(k)
          )
      ),
    };
  }

  /**
   * Resolve key name to HID key code
   * @private
   * @param {string} key - Key name
   * @returns {number|null} HID key code or null if not found
   */
  _resolveKeyCode(key) {
    const normalizedKey = key.toLowerCase().trim();
    return HIDKeyboard.KEY_CODES[normalizedKey] || null;
  }

  /**
   * Calculate modifier bitmask from modifier names
   * @private
   * @param {string[]} modifiers - Array of modifier names
   * @returns {number} Modifier bitmask
   */
  _calculateModifierMask(modifiers) {
    if (!Array.isArray(modifiers)) {
      return 0;
    }

    return modifiers.reduce((mask, modifier) => {
      const normalizedModifier = modifier.toLowerCase().trim();
      const modifierValue = HIDKeyboard.MODIFIERS[normalizedModifier];

      if (modifierValue !== undefined) {
        return mask | modifierValue;
      } else {
        this._log(`Warning: Unknown modifier '${modifier}'`);
        return mask;
      }
    }, 0);
  }

  /**
   * Utility method for delays
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources and disconnect
   * @returns {Promise<void>}
   */
  async destroy() {
    await this.disconnect();
    this.removeAllListeners();
    this._log("HIDKeyboard destroyed");
  }
}

module.exports = { HIDKeyboard };
