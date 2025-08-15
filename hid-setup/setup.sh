#!/bin/bash
# USB HID Keyboard Gadget Setup Script for Raspberry Pi 4
# Raspberry Pi Foundation - Embedded Systems Architecture
# Compatible with Raspberry Pi OS Legacy (Debian 11/Bullseye)

set -e  # Exit on any error

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

echo "=== Raspberry Pi USB HID Keyboard Gadget Setup ==="
echo "Setting up your Pi 4 to act as a USB HID keyboard..."

# Step 1: Enable dwc2 overlay in boot config
echo "Step 1: Configuring boot parameters..."

# Backup original config
cp /boot/config.txt /boot/config.txt.backup.$(date +%Y%m%d_%H%M%S)

# Add dwc2 overlay if not already present
if ! grep -q "dtoverlay=dwc2" /boot/config.txt; then
    echo "dtoverlay=dwc2" >> /boot/config.txt
    echo "✓ Added dwc2 overlay to /boot/config.txt"
else
    echo "✓ dwc2 overlay already configured"
fi

# Step 2: Configure modules to load at boot
echo "Step 2: Configuring kernel modules..."

# Add modules to load at boot
echo "dwc2" > /etc/modules-load.d/dwc2.conf
echo "libcomposite" > /etc/modules-load.d/libcomposite.conf
echo "✓ Configured modules to load at boot"

# Step 3: Create the gadget configuration directory
echo "Step 3: Setting up USB gadget framework..."

GADGET_DIR="/sys/kernel/config/usb_gadget"
GADGET_NAME="pi_hid_keyboard"
GADGET_PATH="$GADGET_DIR/$GADGET_NAME"

# Create gadget setup script
cat > /usr/local/bin/setup_hid_keyboard.sh << 'EOF'
#!/bin/bash
# HID Keyboard Gadget Configuration Script

GADGET_DIR="/sys/kernel/config/usb_gadget"
GADGET_NAME="pi_hid_keyboard"
GADGET_PATH="$GADGET_DIR/$GADGET_NAME"

# Function to setup the gadget
setup_gadget() {
    echo "Setting up HID keyboard gadget..."
    
    # Create gadget directory
    mkdir -p "$GADGET_PATH"
    cd "$GADGET_PATH"
    
    # Set vendor and product IDs
    echo 0x1d6b > idVendor   # Linux Foundation
    echo 0x0104 > idProduct  # Multifunction Composite Gadget
    echo 0x0100 > bcdDevice  # Device version
    echo 0x0200 > bcdUSB     # USB 2.0
    
    # Set device class
    echo 0x00 > bDeviceClass
    echo 0x00 > bDeviceSubClass
    echo 0x00 > bDeviceProtocol
    
    # Create strings directory
    mkdir -p strings/0x409
    echo "0123456789abcdef" > strings/0x409/serialnumber
    echo "Raspberry Pi Foundation" > strings/0x409/manufacturer
    echo "Pi HID Keyboard" > strings/0x409/product
    
    # Create configuration
    mkdir -p configs/c.1
    mkdir -p configs/c.1/strings/0x409
    echo "HID Keyboard Configuration" > configs/c.1/strings/0x409/configuration
    echo 0x80 > configs/c.1/bmAttributes  # Bus powered
    echo 250 > configs/c.1/MaxPower       # 500mA
    
    # Create HID function
    mkdir -p functions/hid.keyboard
    cd functions/hid.keyboard
    
    # Set HID parameters
    echo 1 > protocol      # Keyboard protocol
    echo 1 > subclass      # Boot interface subclass
    echo 8 > report_length # 8 bytes for standard keyboard report
    
    # HID Report Descriptor for standard keyboard
    # This descriptor defines a standard USB keyboard with:
    # - 8 modifier keys (Ctrl, Shift, Alt, etc.)
    # - 6 regular key slots
    echo -ne \\x05\\x01\\x09\\x06\\xa1\\x01\\x05\\x07\\x19\\xe0\\x29\\xe7\\x15\\x00\\x25\\x01\\x75\\x01\\x95\\x08\\x81\\x02\\x95\\x01\\x75\\x08\\x81\\x03\\x95\\x06\\x75\\x08\\x15\\x00\\x25\\x65\\x05\\x07\\x19\\x00\\x29\\x65\\x81\\x00\\xc0 > report_desc
    
    # Link function to configuration
    cd "$GADGET_PATH"
    ln -sf functions/hid.keyboard configs/c.1/
    
    # Bind gadget to USB device controller
    UDC_DEVICE=$(ls /sys/class/udc/ | head -n1)
    echo "$UDC_DEVICE" > UDC
    
    echo "✓ HID keyboard gadget configured and enabled"
    echo "✓ Device file created at: /dev/hidg0"
}

# Function to cleanup gadget
cleanup_gadget() {
    echo "Cleaning up existing gadget..."
    
    if [ -d "$GADGET_PATH" ]; then
        cd "$GADGET_PATH"
        
        # Unbind from UDC
        echo "" > UDC 2>/dev/null || true
        
        # Remove configuration links
        rm -f configs/c.1/hid.keyboard 2>/dev/null || true
        
        # Remove directories
        rmdir functions/hid.keyboard 2>/dev/null || true
        rmdir configs/c.1/strings/0x409 2>/dev/null || true
        rmdir configs/c.1 2>/dev/null || true
        rmdir strings/0x409 2>/dev/null || true
        
        cd "$GADGET_DIR"
        rmdir "$GADGET_NAME" 2>/dev/null || true
    fi
}

# Main execution
case "$1" in
    start)
        # Load modules if not already loaded
        modprobe libcomposite 2>/dev/null || true
        modprobe dwc2 2>/dev/null || true
        
        # Cleanup any existing configuration
        cleanup_gadget
        
        # Setup new gadget
        setup_gadget
        ;;
    stop)
        cleanup_gadget
        echo "✓ HID keyboard gadget stopped"
        ;;
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/setup_hid_keyboard.sh
echo "✓ Created gadget configuration script"

# Step 4: Create systemd service
echo "Step 4: Creating systemd service..."

cat > /etc/systemd/system/hid-keyboard.service << EOF
[Unit]
Description=USB HID Keyboard Gadget
After=network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/setup_hid_keyboard.sh start
ExecStop=/usr/local/bin/setup_hid_keyboard.sh stop
TimeoutStartSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hid-keyboard.service
echo "✓ Created and enabled systemd service"

# Step 5: Set up permissions for hidg device
echo "Step 5: Configuring device permissions..."

cat > /etc/udev/rules.d/99-hidg.rules << EOF
# USB HID Gadget device permissions
KERNEL=="hidg*", MODE="0666", GROUP="input"
EOF

echo "✓ Configured device permissions"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Reboot your Raspberry Pi: sudo reboot"
echo "2. After reboot, connect Pi to host via USB-C data cable"
echo "3. Use the Python control script to send keystrokes"
echo ""
echo "The gadget will be available at: /dev/hidg0"
echo "Service status: systemctl status hid-keyboard"
echo ""
echo "⚠️  IMPORTANT: Use the USB-C port for data connection to host device"
echo ""