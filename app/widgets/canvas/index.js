import fs, { unlinkSync } from 'fs'
import * as config from './config';
import { constructWidgets } from './widget_utils';

// TXI file format constants from https://github.com/Fitbit/image-codec-txi/blob/master/src/encoder.ts
const TXI_HEADER_LENGTH = 40;
const textureBPP = 3;

export const constructCanvas = el => {
  const imageEl = el.getElementById('image');
  const imageFilenamePrefix = '/private/data/cw!canvas';   // TODO 3.2 needs to change for every instance of canvas
  let filenameCounter = 0;
  let imageFilename = imageFilenamePrefix + filenameCounter + '.png';
  let imageFilenameTxi = imageFilename + '.txi';
  let alpha = 0xfc;   // 1.0 as six most-significant bits
  const pixelBuffer = new ArrayBuffer(textureBPP);    // one pixel in ABGR6666
  const pixelBytes = new Uint8Array(pixelBuffer);

  el.class = el.class;    // bring forward (ie, trigger) application of CSS styles

  // Create empty canvas image file:
  const imageDataLen = el.width * el.height * textureBPP;   // bytes of image data
  const header = new Uint32Array([0x0A697874, 0x20000028, imageDataLen, 0, 0x02186666, 0, el.width, el.height, imageDataLen, 0xDEADBEEF]);
  const finalDataByte = new Uint8Array([0]);
  //console.log(`header=${header}`)
  const file = fs.openSync(imageFilenameTxi, 'w');   // TODO 3.5 for efficiency, only open and close file once for every batch of primitives
  fs.writeSync(file, header);
  fs.writeSync(file, finalDataByte, 0, 1, TXI_HEADER_LENGTH + imageDataLen - 1);  // final 0; writeSync will put 0s up to here
  fs.closeSync(file);

  pixelBytes[2] = alpha; // Set default fillStyle to opaque black

  Object.defineProperty(el, 'fillStyle', {
    set: function(colour) {
      el.style.fill = colour;   // lazy way of getting a colour string converted to #RRGGBB
      //console.log(`fill=${el.style.fill}`)
      colour = el.style.fill;
      const r = Number('0x'+colour.substring(1,3)) >> 2;
      const g = Number('0x'+colour.substring(3,5)) >> 2;
      const b = Number('0x'+colour.substring(5,7)) >> 2;
      //console.log(`${r},${g},${b}`)
      // adapted from https://github.com/Fitbit/image-codec-txi/blob/master/src/encoder.ts
      //pixelBytes[0] = 0xff & ((b << 6) | alpha);    // bbaaaaaa
      //pixelBytes[1] = 0xff & ((g << 4) | (b >> 2)); // ggggbbbb
      //pixelBytes[2] = 0xff & ((r << 2) | (g >> 4)); // rrrrrrgg
      pixelBytes[0] = 0xff & ((g << 6) | r);         // ggrrrrrr
      pixelBytes[1] = 0xff & ((b << 4) | (g >> 2));   // bbbbGGGG
      pixelBytes[2] = alpha | (b >> 4);                // aaaaaaBB
      //console.log(`${r},${g},${b} pixelBytes=${pixelBytes}`)
    }
  });

  Object.defineProperty(el, 'globalAlpha', {
    set: function(newAlpha) {
      alpha = (newAlpha * 0x3f) << 2;
      pixelBytes[2] = (pixelBytes[2] & 0x3) | alpha;
    }
  });

  el.fillPixel = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= el.width || y < 0 || y >= el.height) return;    // range-check x and y

    // Rename image file so it can be redisplayed:
    const oldFilenameTxi = imageFilenameTxi;
    imageFilename = imageFilenamePrefix + ++filenameCounter + '.png';
    imageFilenameTxi = imageFilename + '.txi';
    fs.renameSync(oldFilenameTxi, imageFilenameTxi);    // rename image file so it can be redisplayed

    const file = fs.openSync(imageFilenameTxi, 'r+');   // TODO 3.5 for efficiency, only open and close file once for every batch of primitives
    const position = (x + y * el.width) * textureBPP + TXI_HEADER_LENGTH;
    //console.log(`fillPixel(${x},${y}) index=${filenameCounter}`);
    fs.writeSync(file, pixelBuffer, 0, textureBPP, position);
    fs.closeSync(file);

    imageEl.href = imageFilename;      // .txi is appended automatically  // TODO 0 glue error and no such file on phys watch (imageFilenameTxi works)
    //console.log(`pixelBytes=${pixelBytes}`)
  }
}

export const constructCanvases = parentEl => {
  // Constructs all canvas widgets within parentEl ElementSearch.
  constructWidgets('canvas', constructCanvas);
}

;(function() {    // initialisation IIFE: runs once at startup, rather than per widget instance
  // Delete ALL previous canvas widget .txi files on startup
  const dirList = fs.listDirSync('/private/data/');
  let dirIter;
  while ((dirIter = dirList.next()) && !dirIter.done) {
    if (dirIter.value.substring(0,3) === 'cw!') fs.unlinkSync(dirIter.value);
  }

  if (config.autoConstruct) constructCanvases();
})()

// TODO 3.3 measure fill rate
// TODO 3.0 test colours on phys watch
// TODO 3.4 line drawing: https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
// TODO 3.5 async processing via queue