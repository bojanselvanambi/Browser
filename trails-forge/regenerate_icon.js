const fs = require('fs');
const pngToIco = require('png-to-ico');
const path = require('path');

const src = path.join(__dirname, 'resources/icon.png');
const dest = path.join(__dirname, 'resources/icon.ico');

console.log('Regenerating icon from:', src);

pngToIco(src)
  .then(buf => {
    fs.writeFileSync(dest, buf);
    console.log('Successfully generated:', dest);
  })
  .catch(err => {
    console.error('Error generating icon:', err);
    process.exit(1);
  });
