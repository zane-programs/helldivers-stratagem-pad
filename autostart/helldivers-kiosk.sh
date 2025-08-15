#!/bin/bash

# Find the non-root user's home directory
USER_HOME=$(getent passwd | awk -F: '$3 >= 1000 && $3 < 65534 && $1 != "nobody" {print $6}' | head -n1)
if [ -z "$USER_HOME" ]; then
    echo "Error: Could not find non-root user home directory"
    exit 1
fi

# Wait for the desktop to fully load
sleep 10

# Navigate to the project directory
cd "$USER_HOME/helldivers-stratagem-pad"

# Start the HID server in the background
npm start &

# Wait a moment for the server to start
sleep 5

# Launch Chromium in kiosk mode
DISPLAY=:0.0 chromium-browser http://localhost:3000 --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --start-maximized