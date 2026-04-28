const fs = require('fs');

const DIST = './dist';
const UI = '/ui.html';
const SOURCE = '/ui.js';

const ENCODING = 'utf8';
const REFERENCE = '<script defer src="/ui.js"></script>';
const REFERENCE_ALT = '<script defer="defer" src="/ui.js"></script>';

let html = fs.readFileSync(DIST + UI, {encoding: ENCODING, flag: 'r'});
let src = fs.readFileSync(DIST + SOURCE, {encoding: ENCODING, flag: 'r'});

// Check for both reference formats
const referenceToUse = html.indexOf(REFERENCE) !== -1 ? REFERENCE : REFERENCE_ALT;

if (html && src && html.indexOf(referenceToUse) !== -1) {
    src = src.replaceAll(/\<script\>/gi, '_script_'); // ... the script tag will break the parser, even if it is in a comment
    html = html.slice(0, html.indexOf(referenceToUse)) + '<script defer>\n' + src + '\n</script>' + html.slice(html.indexOf(referenceToUse) + referenceToUse.length);
    fs.writeFileSync(DIST + UI, html, {encoding: ENCODING, flag: 'w'});
    fs.unlinkSync(DIST + SOURCE);
    console.log('INLINED: ' + SOURCE + ' => ' + UI);
}
