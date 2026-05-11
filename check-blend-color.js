const fs = require('fs');
const buf = fs.readFileSync('test-punch.png');
console.log('PNG size:', buf.length);
