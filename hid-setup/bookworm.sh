#!/bin/bash
# USB HID Keyboard Gadget Setup Script for Raspberry Pi 4
# Raspberry Pi Foundation - Embedded Systems Architecture
# Compatible with Raspberry Pi OS (Debian 12/Bookworm and newer)

set -e  # Exit on any error

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

echo "=== Raspberry Pi USB HID Keyboard Gadget Setup ==="
echo "Setting up your Pi 4 to act as a USB HID keyboard..."

# Detect Raspberry Pi OS version and boot partition location
detect_boot_partition() {
    if [ -d "/boot/firmware" ] && [ -f "/boot/firmware/config.txt" ]; then
        echo "/boot/firmware"
    elif [ -d "/boot" ] && [ -f "/boot/config.txt" ]; then
        echo "/boot"
    else
        echo "ERROR: Cannot find boot partition with config.txt"
        exit 1
    fi
}

BOOT_PARTITION=$(detect_boot_partition)
CONFIG_FILE="$BOOT_PARTITION/config.txt"

echo "Detected boot partition: $BOOT_PARTITION"
echo "Using config file: $CONFIG_FILE"

# Step 1: Enable dwc2 overlay in boot config
echo "Step 1: Configuring boot parameters..."

# Backup original config
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Add dwc2 overlay if not already present
if ! grep -q "dtoverlay=dwc2" "$CONFIG_FILE"; then
    echo "dtoverlay=dwc2" >> "$CONFIG_FILE"
    echo "✓ Added dwc2 overlay to $CONFIG_FILE"
else
    echo "✓ dwc2 overlay already configured"
fi

# Ensure otg_mode is set for USB-C port (Bookworm requirement)
if ! grep -q "otg_mode=1" "$CONFIG_FILE"; then
    echo "otg_mode=1" >> "$CONFIG_FILE"
    echo "✓ Added otg_mode=1 to $CONFIG_FILE"
else
    echo "✓ otg_mode already configured"
fi

# Step 2: Configure kernel modules for Bookworm
echo "Step 2: Configuring kernel modules..."

# Create modules configuration directory if it doesn't exist
mkdir -p /etc/modules-load.d

# Modern Bookworm approach - single configuration file
cat > /etc/modules-load.d/usb-gadget.conf << EOF
# USB Gadget modules for HID keyboard
dwc2
libcomposite
EOF

# Also ensure modules are available in /etc/modules for compatibility
if ! grep -q "^dwc2$" /etc/modules 2>/dev/null; then
    echo "dwc2" >> /etc/modules
fi

if ! grep -q "^libcomposite$" /etc/modules 2>/dev/null; then
    echo "libcomposite" >> /etc/modules
fi

echo "✓ Configured modules for Bookworm compatibility"

# Step 3: Create the gadget configuration directory
echo "Step 3: Setting up USB gadget framework..."

GADGET_DIR="/sys/kernel/config/usb_gadget"
GADGET_NAME="pi_hid_keyboard"
GADGET_PATH="$GADGET_DIR/$GADGET_NAME"

# Create gadget setup script
cat > /usr/local/bin/setup_hid_keyboard.sh << 'EOF'
#!/bin/bash
# HID Keyboard Gadget Configuration Script for Bookworm
# Compatible with Raspberry Pi OS Debian 12+ and kernel 6.1+

GADGET_DIR="/sys/kernel/config/usb_gadget"
GADGET_NAME="pi_hid_keyboard"
GADGET_PATH="$GADGET_DIR/$GADGET_NAME"

# Function to check kernel version compatibility
check_kernel_version() {
    local kernel_version=$(uname -r | cut -d. -f1-2)
    local major=$(echo $kernel_version | cut -d. -f1)
    local minor=$(echo $kernel_version | cut -d. -f2)
    
    if [ "$major" -ge 6 ] || ([ "$major" -eq 5 ] && [ "$minor" -ge 15 ]); then
        echo "✓ Kernel $kernel_version is compatible"
        return 0
    else
        echo "⚠ Warning: Kernel $kernel_version may have limited gadget support"
        return 1
    fi
}

# Function to ensure configfs is mounted
ensure_configfs() {
    if ! mountpoint -q /sys/kernel/config; then
        echo "Mounting configfs..."
        mount -t configfs none /sys/kernel/config 2>/dev/null || {
            echo "Failed to mount configfs. Checking if already available..."
        }
    fi
    
    if [ -d "/sys/kernel/config/usb_gadget" ]; then
        echo "✓ USB gadget configfs available"
    else
        echo "Error: USB gadget configfs not available"
        return 1
    fi
}

# Function to setup the gadget
setup_gadget() {
    echo "Setting up HID keyboard gadget for Bookworm..."
    
    # Check prerequisites
    check_kernel_version
    ensure_configfs
    
    # Create gadget directory
    mkdir -p "$GADGET_PATH"
    cd "$GADGET_PATH"
    
    # Set vendor and product IDs (updated for newer kernel compatibility)
    echo 0x1d6b > idVendor   # Linux Foundation
    echo 0x0104 > idProduct  # Multifunction Composite Gadget
    echo 0x0100 > bcdDevice  # Device version
    echo 0x0200 > bcdUSB     # USB 2.0
    
    # Device class configuration (updated for Bookworm)
    echo 0x00 > bDeviceClass
    echo 0x00 > bDeviceSubClass
    echo 0x00 > bDeviceProtocol
    echo 0x08 > bMaxPacketSize0  # Max packet size for endpoint 0
    
    # Create strings directory
    mkdir -p strings/0x409
    echo "$(cat /proc/sys/kernel/random/uuid | tr -d '-')" > strings/0x409/serialnumber
    echo "Raspberry Pi Foundation" > strings/0x409/manufacturer
    echo "Pi HID Keyboard (Bookworm)" > strings/0x409/product
    
    # Create configuration
    mkdir -p configs/c.1
    mkdir -p configs/c.1/strings/0x409
    echo "HID Keyboard Configuration" > configs/c.1/strings/0x409/configuration
    echo 0x80 > configs/c.1/bmAttributes  # Bus powered
    echo 250 > configs/c.1/MaxPower       # 500mA
    
    # Create HID function
    mkdir -p functions/hid.keyboard
    cd functions/hid.keyboard
    
    # Set HID parameters (updated for kernel 6.1+)
    echo 1 > protocol      # Keyboard protocol
    echo 1 > subclass      # Boot interface subclass
    echo 8 > report_length # 8 bytes for standard keyboard report
    
    # Enhanced HID Report Descriptor for Bookworm compatibility
    # This descriptor is optimized for newer kernels and includes better compatibility
    echo -ne \\x05\\x01\\x09\\x06\\xa1\\x01\\x05\\x07\\x19\\xe0\\x29\\xe7\\x15\\x00\\x25\\x01\\x75\\x01\\x95\\x08\\x81\\x02\\x95\\x01\\x75\\x08\\x81\\x03\\x95\\x06\\x75\\x08\\x15\\x00\\x25\\x65\\x05\\x07\\x19\\x00\\x29\\x65\\x81\\x00\\xc0 > report_desc
    
    # Link function to configuration
    cd "$GADGET_PATH"
    ln -sf functions/hid.keyboard configs/c.1/
    
    # Find and bind to USB device controller (improved detection for Pi 4)
    local udc_device=""
    for udc in /sys/class/udc/*; do
        if [ -e "$udc" ]; then
            udc_device=$(basename "$udc")
            break
        fi
    done
    
    if [ -z "$udc_device" ]; then
        echo "Error: No UDC device found. Ensure dwc2 module is loaded."
        return 1
    fi
    
    echo "Using UDC device: $udc_device"
    echo "$udc_device" > UDC
    
    # Wait a moment for device to initialize
    sleep 1
    
    # Verify the gadget is active
    if [ -c "/dev/hidg0" ]; then
        echo "✓ HID keyboard gadget configured and enabled"
        echo "✓ Device file created at: /dev/hidg0"
        
        # Set appropriate permissions for the device
        chmod 666 /dev/hidg0
        chgrp input /dev/hidg0 2>/dev/null || true
        
        return 0
    else
        echo "Error: Failed to create /dev/hidg0 device"
        return 1
    fi
}

# Function to cleanup gadget (improved for Bookworm)
cleanup_gadget() {
    echo "Cleaning up existing gadget..."
    
    if [ -d "$GADGET_PATH" ]; then
        cd "$GADGET_PATH"
        
        # Unbind from UDC (with error handling)
        if [ -f "UDC" ]; then
            echo "" > UDC 2>/dev/null || true
        fi
        
        # Wait for unbind to complete
        sleep 0.5
        
        # Remove configuration links
        rm -f configs/c.1/hid.keyboard 2>/dev/null || true
        
        # Remove directories in reverse order
        rmdir functions/hid.keyboard 2>/dev/null || true
        rmdir configs/c.1/strings/0x409 2>/dev/null || true
        rmdir configs/c.1 2>/dev/null || true
        rmdir strings/0x409 2>/dev/null || true
        
        cd "$GADGET_DIR"
        rmdir "$GADGET_NAME" 2>/dev/null || true
        
        echo "✓ Gadget cleanup completed"
    fi
}

# Function to check gadget status
status_gadget() {
    echo "=== USB HID Gadget Status ==="
    echo "Kernel version: $(uname -r)"
    echo "Modules loaded:"
    lsmod | grep -E "(dwc2|libcomposite)" || echo "  No gadget modules loaded"
    
    echo "USB controllers:"
    ls -1 /sys/class/udc/ 2>/dev/null || echo "  No UDC devices found"
    
    if [ -d "$GADGET_PATH" ]; then
        echo "Gadget configured: YES"
        echo "Gadget path: $GADGET_PATH"
        if [ -f "$GADGET_PATH/UDC" ]; then
            local udc_content=$(cat "$GADGET_PATH/UDC" 2>/dev/null)
            if [ -n "$udc_content" ]; then
                echo "UDC bound: $udc_content"
            else
                echo "UDC bound: NO"
            fi
        fi
    else
        echo "Gadget configured: NO"
    fi
    
    if [ -c "/dev/hidg0" ]; then
        echo "HID device: /dev/hidg0 ($(ls -l /dev/hidg0))"
    else
        echo "HID device: NOT FOUND"
    fi
}

# Main execution
case "$1" in
    start)
        # Load modules if not already loaded
        modprobe libcomposite 2>/dev/null || {
            echo "Warning: Failed to load libcomposite module"
        }
        modprobe dwc2 2>/dev/null || {
            echo "Warning: Failed to load dwc2 module"
        }
        
        # Cleanup any existing configuration
        cleanup_gadget
        
        # Setup new gadget
        if setup_gadget; then
            echo "✓ HID keyboard gadget started successfully"
        else
            echo "✗ Failed to start HID keyboard gadget"
            exit 1
        fi
        ;;
    stop)
        cleanup_gadget
        echo "✓ HID keyboard gadget stopped"
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        status_gadget
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo "  start   - Start the HID keyboard gadget"
        echo "  stop    - Stop and cleanup the gadget"
        echo "  restart - Restart the gadget"
        echo "  status  - Show current gadget status"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/setup_hid_keyboard.sh
echo "✓ Created gadget configuration script"

# Step 4: Create enhanced systemd service for Bookworm
echo "Step 4: Creating systemd service..."

cat > /etc/systemd/system/hid-keyboard.service << EOF
[Unit]
Description=USB HID Keyboard Gadget
Documentation=man:systemd.service(5)
After=multi-user.target network.target
Wants=multi-user.target
ConditionPathExists=/sys/kernel/config
RequiresMountsFor=/sys/kernel/config

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/setup_hid_keyboard.sh start
ExecStop=/usr/local/bin/setup_hid_keyboard.sh stop
ExecReload=/usr/local/bin/setup_hid_keyboard.sh restart
TimeoutStartSec=60
TimeoutStopSec=30
Restart=no

# Security settings for Bookworm
PrivateNetwork=false
PrivateDevices=false
ProtectSystem=false
ProtectHome=false
NoNewPrivileges=false

# Required capabilities
AmbientCapabilities=CAP_SYS_ADMIN

[Install]
WantedBy=multi-user.target
EOF

# Create a helper service to ensure configfs is mounted
cat > /etc/systemd/system/configfs-mount.service << EOF
[Unit]
Description=Mount configfs filesystem
DefaultDependencies=no
Before=hid-keyboard.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/mount -t configfs none /sys/kernel/config
ExecStartPost=/bin/chmod 755 /sys/kernel/config
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable configfs-mount.service
systemctl enable hid-keyboard.service
echo "✓ Created and enabled systemd services for Bookworm"

# Step 5: Set up enhanced permissions and udev rules for Bookworm
echo "Step 5: Configuring device permissions..."

cat > /etc/udev/rules.d/99-hidg.rules << EOF
# USB HID Gadget device permissions for Bookworm
KERNEL=="hidg*", MODE="0666", GROUP="input", TAG+="uaccess"
SUBSYSTEM=="usb", ATTR{idVendor}=="1d6b", ATTR{idProduct}=="0104", MODE="0664", GROUP="plugdev"

# Additional rules for USB gadget framework
SUBSYSTEM=="configfs", MODE="0755"
SUBSYSTEM=="usb", ACTION=="add", ATTR{bConfigurationValue}=="1", RUN+="/bin/chmod 666 /dev/hidg*"
EOF

# Reload udev rules
udevadm control --reload-rules
udevadm trigger

echo "✓ Configured enhanced device permissions for Bookworm"

# Step 6: Create a diagnostic script
echo "Step 6: Creating diagnostic tools..."

cat > /usr/local/bin/hid-keyboard-diag.sh << 'EOF'
#!/bin/bash
# HID Keyboard Diagnostic Script for Bookworm

echo "=== Raspberry Pi HID Keyboard Diagnostics ==="
echo "Date: $(date)"
echo "Kernel: $(uname -r)"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo

echo "=== Boot Configuration ==="
BOOT_PARTITION=""
if [ -f "/boot/firmware/config.txt" ]; then
    BOOT_PARTITION="/boot/firmware"
elif [ -f "/boot/config.txt" ]; then
    BOOT_PARTITION="/boot"
fi

if [ -n "$BOOT_PARTITION" ]; then
    echo "Boot partition: $BOOT_PARTITION"
    echo "dwc2 overlay: $(grep -c 'dtoverlay=dwc2' $BOOT_PARTITION/config.txt) entries"
    echo "otg_mode: $(grep -c 'otg_mode=1' $BOOT_PARTITION/config.txt) entries"
else
    echo "ERROR: Boot partition not found"
fi

echo
echo "=== Module Status ==="
lsmod | grep -E "(dwc2|libcomposite|udc_core)" || echo "No USB gadget modules loaded"

echo
echo "=== USB Controllers ==="
ls -la /sys/class/udc/ 2>/dev/null || echo "No UDC devices found"

echo
echo "=== Service Status ==="
systemctl is-enabled hid-keyboard.service 2>/dev/null || echo "Service not enabled"
systemctl is-active hid-keyboard.service 2>/dev/null || echo "Service not active"

echo
echo "=== HID Device Status ==="
if [ -c "/dev/hidg0" ]; then
    ls -la /dev/hidg0
    echo "Device permissions: OK"
else
    echo "HID device /dev/hidg0 not found"
fi

echo
echo "=== USB Gadget Configuration ==="
if [ -d "/sys/kernel/config/usb_gadget/pi_hid_keyboard" ]; then
    echo "Gadget directory exists: YES"
    cd /sys/kernel/config/usb_gadget/pi_hid_keyboard
    echo "UDC binding: $(cat UDC 2>/dev/null || echo 'Not bound')"
    echo "Vendor ID: 0x$(cat idVendor 2>/dev/null || echo 'Not set')"
    echo "Product ID: 0x$(cat idProduct 2>/dev/null || echo 'Not set')"
else
    echo "Gadget directory exists: NO"
fi

echo
echo "=== Recent System Logs ==="
journalctl -u hid-keyboard.service --no-pager --lines=10 2>/dev/null || echo "No service logs available"

echo
echo "=== Hardware Detection ==="
lsusb | grep -i "1d6b:0104" && echo "HID gadget detected on USB bus" || echo "HID gadget not detected on USB bus"

echo
echo "=== Troubleshooting Suggestions ==="
if ! systemctl is-active hid-keyboard.service >/dev/null 2>&1; then
    echo "- Start the service: sudo systemctl start hid-keyboard.service"
fi

if [ ! -c "/dev/hidg0" ]; then
    echo "- Check if modules are loaded: sudo modprobe dwc2 libcomposite"
    echo "- Restart the service: sudo systemctl restart hid-keyboard.service"
fi

if [ ! -d "/sys/kernel/config/usb_gadget" ]; then
    echo "- Mount configfs: sudo mount -t configfs none /sys/kernel/config"
fi
EOF

chmod +x /usr/local/bin/hid-keyboard-diag.sh
echo "✓ Created diagnostic script: /usr/local/bin/hid-keyboard-diag.sh"

echo ""
echo "=== Setup Complete for Bookworm ==="
echo ""
echo "Your Raspberry Pi 4 is now configured for USB HID keyboard mode."
echo "This setup is optimized for Raspberry Pi OS (Debian 12/Bookworm) and newer."
echo ""
echo "Next steps:"
echo "1. Reboot your Raspberry Pi: sudo reboot"
echo "2. After reboot, connect Pi to host via USB-C data cable"
echo "3. Use the Python control script to send keystrokes"
echo "4. Run diagnostics if needed: sudo /usr/local/bin/hid-keyboard-diag.sh"
echo ""
echo "Service management:"
echo "- Check status: sudo systemctl status hid-keyboard"
echo "- Manual control: sudo /usr/local/bin/setup_hid_keyboard.sh {start|stop|restart|status}"
echo ""
echo "⚠️  IMPORTANT: Use the USB-C port for data connection to host device"
echo "⚠️  Ensure you have a proper USB-C data cable (not power-only)"
echo ""