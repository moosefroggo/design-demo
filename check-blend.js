const fs = require('fs');
const buf = fs.readFileSync('test-blend-screenshot.png');
console.log('PNG magic:', buf.slice(0, 8).toString('hex'));
