# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Helldivers Stratagem Pad is a Node.js/Express application that provides a web interface for controlling USB HID keyboard functionality on Raspberry Pi 4. It allows users to input game stratagems through a virtual gamepad interface that sends keyboard combinations via USB HID.

## Architecture

### Backend Components
- **`src/server.js`**: Main Express server handling WebSocket connections, serving static files, and coordinating between frontend and HID keyboard
- **`src/lib/hid.js`**: USB HID keyboard controller class that interfaces with `/dev/hidg0` device, providing keyboard emulation functionality

### Frontend Components
- **`public/index.html`**: Single-page web interface with arrow controls and CTRL button for stratagem input
- **`public/stratagems.json`**: JSON database of all available stratagems with their input codes and icons

### Key Technologies
- Express 5.1.0 for HTTP server
- WebSocket (ws 8.18.3) for real-time communication
- Native Node.js fs module for HID device control
- Vanilla JavaScript frontend (no framework dependencies)

## Common Commands

```bash
# Start the server
npm start

# Run in development mode (same as start)
npm dev

# Install dependencies
npm install
```

## Development Notes

### WebSocket Protocol
The client-server communication uses WebSocket messages with the following types:
- `connect/disconnect`: HID device connection management
- `holdKey/releaseKey`: Individual key control
- `pressKey`: Press with optional modifiers
- `pressWithHeld`: Press while maintaining held keys
- `releaseAll`: Release all held keys

### HID Keyboard Interface
The HID keyboard controller (`src/lib/hid.js`) provides:
- Direct USB HID device control via `/dev/hidg0`
- Support for standard keys, modifiers, and combinations
- Event-driven architecture with EventEmitter
- Maximum 6 simultaneous non-modifier keys (USB HID limitation)

### Stratagem System
- Stratagems are defined in `public/stratagems.json`
- Input codes use WASD notation (W=up, A=left, S=down, D=right)
- Each stratagem has a category, color, icon, and input sequence
- Frontend validates input sequences against known stratagems

### Raspberry Pi Setup
The project includes setup scripts for Raspberry Pi:
- `hid-setup/`: Scripts for configuring USB HID gadget mode
- `autostart/`: Kiosk mode configuration for automatic startup

## Important Considerations

- The application requires USB HID gadget mode enabled on Raspberry Pi 4
- WebSocket reconnection is handled automatically with 2-second retry
- The frontend is designed for touchscreen/kiosk mode operation
- All keyboard operations require active WebSocket connection to server