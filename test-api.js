const TPLSmartDevice = require("tplink-lightbulb");

async function testAPI() {
  const device = new TPLSmartDevice('192.168.1.222');
  
  try {
    console.log('Getting device info...');
    const info = await device.info();
    console.log('Device info:', JSON.stringify(info, null, 2));
    
    console.log('\nAvailable methods on device:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(device)).filter(m => typeof device[m] === 'function'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();