const fs = require('fs');
const { createCanvas, Image } = require('canvas');

const img = new Image();
img.src = fs.readFileSync('test-clip-anim.png');

const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);

// Sample center pixel (should be the hole)
const pCenter = ctx.getImageData(img.width / 2, img.height / 2, 1, 1).data;
console.log('Center pixel:', pCenter);

// Sample top-left pixel (should be background)
const pTopLeft = ctx.getImageData(10, 10, 1, 1).data;
console.log('Top-left pixel:', pTopLeft);
