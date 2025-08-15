#!/bin/bash

# Wait for the desktop to fully load
sleep 10

# Navigate to the project directory
cd /home/pi/helldivers-stratagem-pad

# Start the HID server in the background
npm start &

# Wait a moment for the server to start
sleep 5

# Launch Chromium in kiosk mode
DISPLAY=:0.0 chromium-browser http://localhost:3000 --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --start-maximized