const potrace = require('potrace');
const fs = require('fs');
const [,, input, output, color] = process.argv;
potrace.trace(input, { threshold: 185, turdSize: 20, optTolerance: 0.3, color: color || '#B39A72', background: 'transparent' }, (err, svg) => {
  if (err) throw err;
  fs.writeFileSync(output, svg);
  console.log('ok', svg.length);
});
