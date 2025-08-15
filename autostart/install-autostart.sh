#!/bin/bash

echo "Installing Helldivers Stratagem Pad autostart configuration..."

# Find the non-root user and their home directory
USER_NAME=$(getent passwd | awk -F: '$3 >= 1000 && $3 < 65534 && $1 != "nobody" {print $1}' | head -n1)
USER_HOME=$(getent passwd | awk -F: '$3 >= 1000 && $3 < 65534 && $1 != "nobody" {print $6}' | head -n1)

if [ -z "$USER_HOME" ] || [ -z "$USER_NAME" ]; then
    echo "Error: Could not find non-root user"
    exit 1
fi

echo "Found user: $USER_NAME with home directory: $USER_HOME"

# Make the kiosk script executable
chmod +x "$USER_HOME/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh"

# Create LXDE autostart directory if it doesn't exist
mkdir -p "$USER_HOME/.config/autostart"

# Copy desktop entry to LXDE autostart
cp "$USER_HOME/helldivers-stratagem-pad/autostart/helldivers-kiosk.desktop" "$USER_HOME/.config/autostart/"

# For Wayland/Wayfire, add to the wayfire config
if [ -f "$USER_HOME/.config/wayfire.ini" ]; then
    echo "Configuring for Wayfire (Wayland)..."
    if ! grep -q "helldivers-kiosk.sh" "$USER_HOME/.config/wayfire.ini"; then
        echo "" >> "$USER_HOME/.config/wayfire.ini"
        echo "[autostart]" >> "$USER_HOME/.config/wayfire.ini"
        echo "helldivers = $USER_HOME/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh" >> "$USER_HOME/.config/wayfire.ini"
    fi
fi

# For systemd-based autostart (alternative method)
if command -v systemctl &> /dev/null; then
    echo "Creating systemd user service as backup..."
    mkdir -p "$USER_HOME/.config/systemd/user/"
    
    cat > "$USER_HOME/.config/systemd/user/helldivers-kiosk.service" <<EOF
[Unit]
Description=Helldivers Stratagem Pad Kiosk Mode
After=graphical-session.target

[Service]
Type=simple
ExecStart=$USER_HOME/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh
Restart=on-failure
RestartSec=5
Environment="DISPLAY=:0"

[Install]
WantedBy=default.target
EOF
    
    # Set correct ownership
    chown -R "$USER_NAME:$USER_NAME" "$USER_HOME/.config/autostart"
    chown -R "$USER_NAME:$USER_NAME" "$USER_HOME/.config/systemd/user"
    
    # Enable the service for the user
    su - "$USER_NAME" -c "systemctl --user daemon-reload"
    su - "$USER_NAME" -c "systemctl --user enable helldivers-kiosk.service"
fi

echo "Autostart installation complete!"
echo ""
echo "The application will automatically start on next boot."
echo "It will:"
echo "  1. Start the HID server (npm start)"
echo "  2. Open Chromium in kiosk mode at http://localhost:3000"
echo ""
echo "To test now without rebooting, run:"
echo "  $USER_HOME/helldivers-stratagem-pad/autostart/helldivers-kiosk.sh"