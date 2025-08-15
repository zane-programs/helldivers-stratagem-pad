#!/bin/bash

echo "Installing Helldivers Stratagem Pad autostart configuration..."

# Make the kiosk script executable
chmod +x /home/pi/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh

# Create LXDE autostart directory if it doesn't exist
mkdir -p /home/pi/.config/autostart

# Copy desktop entry to LXDE autostart
cp /home/pi/helldivers-stratagem-pad/autostart/helldivers-kiosk.desktop /home/pi/.config/autostart/

# For Wayland/Wayfire, add to the wayfire config
if [ -f /home/pi/.config/wayfire.ini ]; then
    echo "Configuring for Wayfire (Wayland)..."
    if ! grep -q "helldivers-kiosk.sh" /home/pi/.config/wayfire.ini; then
        echo "" >> /home/pi/.config/wayfire.ini
        echo "[autostart]" >> /home/pi/.config/wayfire.ini
        echo "helldivers = /home/pi/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh" >> /home/pi/.config/wayfire.ini
    fi
fi

# For systemd-based autostart (alternative method)
if command -v systemctl &> /dev/null; then
    echo "Creating systemd user service as backup..."
    mkdir -p /home/pi/.config/systemd/user/
    
    cat > /home/pi/.config/systemd/user/helldivers-kiosk.service <<EOF
[Unit]
Description=Helldivers Stratagem Pad Kiosk Mode
After=graphical-session.target

[Service]
Type=simple
ExecStart=/home/pi/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh
Restart=on-failure
RestartSec=5
Environment="DISPLAY=:0"

[Install]
WantedBy=default.target
EOF
    
    systemctl --user daemon-reload
    systemctl --user enable helldivers-kiosk.service
fi

echo "Autostart installation complete!"
echo ""
echo "The application will automatically start on next boot."
echo "It will:"
echo "  1. Start the HID server (npm start)"
echo "  2. Open Chromium in kiosk mode at http://localhost:3000"
echo ""
echo "To test now without rebooting, run:"
echo "  /home/pi/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh"