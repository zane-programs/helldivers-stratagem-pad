const { LightManager } = require('./src/lib/lights.js');

async function testLight() {
  console.log('Testing LightManager with IP: 192.168.1.222');
  
  const lightManager = new LightManager('192.168.1.222');
  
  try {
    console.log('Attempting to flash red...');
    await lightManager.flash('rgb(255, 0, 0)', 1000);
    console.log('Flash command sent successfully');
    
    setTimeout(async () => {
      console.log('Attempting to flash green...');
      await lightManager.flash('rgb(0, 255, 0)', 1000);
      console.log('Flash command sent successfully');
    }, 2000);
    
    setTimeout(async () => {
      console.log('Attempting to flash blue...');
      await lightManager.flash('rgb(0, 0, 255)', 1000);
      console.log('Flash command sent successfully');
    }, 4000);
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testLight();

setTimeout(() => {
  console.log('Test complete');
  process.exit(0);
}, 8000);