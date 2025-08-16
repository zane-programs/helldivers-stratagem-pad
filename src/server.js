#!/usr/bin/env node

/**
 * Helldivers Stratagem Pad Server
 * Lightweight Node.js server connecting frontend to HID keyboard driver
 * 
 * @version 1.0.0
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { HIDKeyboard } = require('./lib/hid.js');

class StratagemServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || '127.0.0.1';
    this.publicDir = options.publicDir || path.join(__dirname, '../public');
    
    // Initialize Express app
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize WebSocket server
    this.wss = new WebSocketServer({ server: this.server });
    
    // Initialize HID keyboard
    this.keyboard = new HIDKeyboard({ enableLogging: true });
    
    this.setupExpress();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  setupExpress() {
    // Serve static files from public directory
    this.app.use(express.static(this.publicDir));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connected: this.keyboard.isConnected,
        timestamp: new Date().toISOString()
      });
    });
    
    // API endpoint to get keyboard status
    this.app.get('/api/status', (req, res) => {
      res.json({
        connected: this.keyboard.isConnected,
        availableKeys: this.keyboard.getAvailableKeys()
      });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('[Server] Client connected');
      
      // Send initial status
      this.sendToClient(ws, {
        type: 'status',
        connected: this.keyboard.isConnected
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('[Server] Error handling message:', error.message);
          this.sendError(ws, error.message);
        }
      });

      ws.on('close', () => {
        console.log('[Server] Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('[Server] WebSocket error:', error.message);
      });
    });
  }

  async handleMessage(ws, message) {
    const { type, ...payload } = message;
    
    switch (type) {
      case 'connect':
        await this.handleConnect(ws);
        break;
        
      case 'disconnect':
        await this.handleDisconnect(ws);
        break;
        
      case 'holdKey':
        await this.handleHoldKey(ws, payload);
        break;
        
      case 'releaseKey':
        await this.handleReleaseKey(ws, payload);
        break;
        
      case 'pressKey':
        await this.handlePressKey(ws, payload);
        break;
        
      case 'pressWithHeld':
        await this.handlePressWithHeld(ws, payload);
        break;
        
      case 'releaseAll':
        await this.handleReleaseAll(ws);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  async handleConnect(ws) {
    try {
      const success = await this.keyboard.connect();
      this.sendToClient(ws, {
        type: 'connected',
        success
      });
      console.log('[Server] HID keyboard connected');
    } catch (error) {
      this.sendError(ws, `Failed to connect: ${error.message}`);
    }
  }

  async handleDisconnect(ws) {
    try {
      await this.keyboard.disconnect();
      this.sendToClient(ws, {
        type: 'disconnected'
      });
      console.log('[Server] HID keyboard disconnected');
    } catch (error) {
      this.sendError(ws, `Failed to disconnect: ${error.message}`);
    }
  }

  async handleHoldKey(ws, { key }) {
    if (!key) throw new Error('Key is required');
    
    try {
      await this.keyboard.holdKey(key);
      this.sendToClient(ws, {
        type: 'keyHeld',
        key
      });
    } catch (error) {
      this.sendError(ws, `Failed to hold key: ${error.message}`);
    }
  }

  async handleReleaseKey(ws, { key }) {
    if (!key) throw new Error('Key is required');
    
    try {
      await this.keyboard.releaseKey(key);
      this.sendToClient(ws, {
        type: 'keyReleased',
        key
      });
    } catch (error) {
      this.sendError(ws, `Failed to release key: ${error.message}`);
    }
  }

  async handlePressKey(ws, { key, options = {} }) {
    if (!key) throw new Error('Key is required');
    
    try {
      await this.keyboard.pressKey(key, options);
      this.sendToClient(ws, {
        type: 'keyPressed',
        key,
        options
      });
    } catch (error) {
      this.sendError(ws, `Failed to press key: ${error.message}`);
    }
  }

  async handlePressWithHeld(ws, { key, options = {} }) {
    if (!key) throw new Error('Key is required');
    
    try {
      await this.keyboard.pressWithHeld(key, options);
      this.sendToClient(ws, {
        type: 'keyPressedWithHeld',
        key,
        options
      });
    } catch (error) {
      this.sendError(ws, `Failed to press key with held: ${error.message}`);
    }
  }

  async handleReleaseAll(ws) {
    try {
      await this.keyboard.releaseAll();
      this.sendToClient(ws, {
        type: 'allKeysReleased'
      });
    } catch (error) {
      this.sendError(ws, `Failed to release all keys: ${error.message}`);
    }
  }

  sendToClient(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.sendToClient(ws, {
      type: 'error',
      message: error
    });
  }

  setupErrorHandling() {
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[Server] Shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\n[Server] Shutting down gracefully...');
      this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[Server] Uncaught exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown(1);
    });
  }

  async shutdown(code = 0) {
    try {
      console.log('[Server] Disconnecting HID keyboard...');
      await this.keyboard.disconnect();
      
      console.log('[Server] Closing WebSocket server...');
      this.wss.close();
      
      console.log('[Server] Closing HTTP server...');
      this.server.close(() => {
        console.log('[Server] Server closed successfully');
        process.exit(code);
      });
      
      // Force exit after 5 seconds
      setTimeout(() => {
        console.log('[Server] Force exit');
        process.exit(code);
      }, 5000);
      
    } catch (error) {
      console.error('[Server] Error during shutdown:', error);
      process.exit(1);
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`[Server] Helldivers Stratagem Pad server running on http://${this.host}:${this.port}`);
          console.log(`[Server] Serving files from: ${this.publicDir}`);
          resolve();
        }
      });
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new StratagemServer();
  server.start().catch((error) => {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { StratagemServer };