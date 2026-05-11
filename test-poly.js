var vw = 1000, vh = 1000;
var originX = 500, originY = 500;
var steps = 120;
var noiseArr = [];
for (var i = 0; i < steps; i++) {
  noiseArr.push((Math.random() - 0.5) * 45);
}
function getPolygon(radii, w, h) {
  var pts = [];
  var cx = originX, cy = originY;
  var N = radii.length;
  for (var i = 0; i < steps; i++) {
    var angle = (i / steps) * Math.PI * 2;
    var exactIdx = (angle / (Math.PI * 2)) * N;
    var i0 = Math.floor(exactIdx) % N;
    var i1 = (i0 + 1) % N;
    var t = exactIdx - Math.floor(exactIdx);
    t = t * t * (3 - 2 * t);
    var r = radii[i0] + (radii[i1] - radii[i0]) * t;
    if (r > 15) r += noiseArr[i];
    var px = cx + Math.cos(angle) * r;
    var py = cy + Math.sin(angle) * r;
    var pcx = (px / w) * 100;
    var pcy = (py / h) * 100;
    pts.push(pcx.toFixed(2) + '% ' + pcy.toFixed(2) + '%');
  }
  return 'polygon(' + pts.join(', ') + ')';
}
var radii = [100, 100, 100, 100, 100, 100];
var poly = getPolygon(radii, vw, vh);
console.log(poly);
