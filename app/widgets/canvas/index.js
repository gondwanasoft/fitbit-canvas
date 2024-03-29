import fs, { unlinkSync } from 'fs'
import * as config from './config';
import { constructWidgets } from './widget_utils';

// TXI file format constants from https://github.com/Fitbit/image-codec-txi/blob/master/src/encoder.ts
const TXI_HEADER_LENGTH = 40;
const textureBPP = 3;
// RLE constant from https://github.com/Fitbit/image-codec-txi/blob/master/src/RunLengthEncoder.ts
const MAX_SECTION_LENGTH = 127; // max nbr of px in one RLE run; +1 because of RLE run-length value
const RLE_FULL_RUN_DATA_LEN = MAX_SECTION_LENGTH * textureBPP + 1;  // byte length of a full RLE run

const listFiles = title => {   // TODO 4 del
  console.log(title)
  const dirList = fs.listDirSync('/private/data'); // opendir can fail after repeated attempts: handle not closed?
  let dirIter;
  while ((dirIter = dirList.next()) && !dirIter.done) {
    console.log('   '+dirIter.value);
  }
}

const constructDrawStyle = runBufferLength => {   // strokeStyle and fillStyle
  const buffers = {
    pixelBuffer: new ArrayBuffer(textureBPP),    // one px in ABGR6666
    pixelBytes: undefined,
    pixelRunBuffer: new ArrayBuffer(textureBPP * runBufferLength),    // one RLE run in ABGR6666
    pixelRunBytes: undefined,

    populateRunBuffer: () => {
      for (let i=0; i<runBufferLength; i++) buffers.pixelRunBytes.set(buffers.pixelBytes, i*textureBPP)
    },

    setStyle: (colour, alpha, el) => {
      el.style.fill = colour;   // lazy way of getting a colour string converted to #RRGGBB
      //console.log(`fill=${el.style.fill}`)
      colour = el.style.fill;

      const r = Number('0x'+colour.substring(1,3)) >> 2;
      const g = Number('0x'+colour.substring(3,5)) >> 2;
      const b = Number('0x'+colour.substring(5,7)) >> 2;

      buffers.pixelBytes[0] = 0xff & ((b << 6) | alpha);        // bbaaaaaa
      buffers.pixelBytes[1] = 0xff & ((g << 4) | (b >> 2));     // ggggBBBB
      buffers.pixelBytes[2] = (r << 2) + (g >> 4);              // rrrrrrGG
      //populatePixelRunBuffer(fillPixelRunBytes, fillPixelBytes);
      buffers.populateRunBuffer();
    }
  }

  buffers.pixelBytes = new Uint8Array(buffers.pixelBuffer)
  buffers.pixelRunBytes = new Uint8Array(buffers.pixelRunBuffer)

  Object.defineProperty(buffers, 'alpha', {
    set: function(newAlpha) {
      buffers.pixelBytes[0] = (buffers.pixelBytes[0] & 0xc0) | newAlpha;
      buffers.populateRunBuffer()
    }
  });

  return buffers
};

export const constructCanvas = el => {
  const imageEl = el.getElementById('image');
  //console.log(`constructCanvas() id=${el.id}`)
  const imageFilenamePrefix = '/private/data/cw!' + el.id + '!';   // needs to change for every instance of canvas
  let filenameCounter = 0;
  let imageFilename = imageFilenamePrefix + filenameCounter + '.png';
  let imageFilenameTxi = imageFilename + '.txi';
  let file;
  let auto = false;  // autoRedraw(): redisplay image after every change
  let lineWid = 2;    // lineWidth (px)
  let alpha = 0x3f;   // 1.0 as six least-significant bits
  const runBufferLength = Math.min(MAX_SECTION_LENGTH, el.width);               // px in a pixelRunBuffer
  //const strokePixelBuffer = new ArrayBuffer(textureBPP);    // one px in ABGR6666
  //const strokePixelBytes = new Uint8Array(strokePixelBuffer);
  //const strokePixelRunBuffer = new ArrayBuffer(textureBPP * runBufferLength);    // one RLE run in ABGR6666
  //const strokePixelRunBytes = new Uint8Array(strokePixelRunBuffer);
  //const fillPixelBuffer = new ArrayBuffer(textureBPP);    // one px in ABGR6666
  //const fillPixelBytes = new Uint8Array(fillPixelBuffer);
  //const fillPixelRunBuffer = new ArrayBuffer(textureBPP * runBufferLength);    // one RLE run in ABGR6666
  //const fillPixelRunBytes = new Uint8Array(fillPixelRunBuffer);
  const strokeStyle = constructDrawStyle(runBufferLength)
  const fillStyle = constructDrawStyle(runBufferLength)

  /*const populatePixelRunBuffer = (pixelRunBytes, pixelBytes) => { // copy a pixelBuffer to all px in a pixelRunBuffer
    // pixelRunBytes: Uint8Array that holds a RLE run of px
    // pixelBytes: Unit8Array that holds a single px
    for (let i=0; i<runBufferLength; i++) pixelRunBytes.set(pixelBytes, i*textureBPP);
  }*/

  strokeStyle.alpha = fillStyle.alpha = alpha   // Set default fillStyles to opaque black

  el.class = el.class;    // bring forward (ie, trigger) application of CSS styles

  const constructFile = () => {   // create empty canvas image file
    //const rowDataLen = ((el.width + 1) * textureBPP + 3) & ~3;    // +1 because final pixel is duplicated, and round up to multiple of 4 bytes
    const pixelCount = el.width * el.height;
    const rleFullRunCount = Math.floor(pixelCount / MAX_SECTION_LENGTH);
    const rleFinalRunLen = pixelCount % MAX_SECTION_LENGTH;
    const imageDataLen = pixelCount * textureBPP + rleFullRunCount + (rleFinalRunLen? 1 : 0);
    //console.log(`rle full runs: ${rleFullRunCount}; final run len: ${rleFinalRunLen}; imageDataLen=${imageDataLen}`)
    const header = new Uint32Array([0x0A697874, 0x20000028, imageDataLen, 0, 0x12186666, 0, el.width, el.height, imageDataLen, 0xDEADBEEF]);
    //console.log(`header=${header}`)
    file = fs.openSync(imageFilenameTxi, 'w');
    fs.writeSync(file, header);

    /*const rleRunLength = new Uint8Array([120]);
    fs.writeSync(file, rleRunLength, 0, 1, TXI_HEADER_LENGTH);

    // Write image data:
    const rowDataLen = el.width * textureBPP;
    const rowDataBytes = new Uint8Array(rowDataLen);
    let position = TXI_HEADER_LENGTH + 1;   // RLE: not nec +1; may need to write this in RLE sequences
    for (let row=0; row<el.height; row++) {
      fs.writeSync(file, rowDataBytes, 0, rowDataLen, position);
      position += rowDataLen;
    }*/

    // Write empty image data:
    let position = TXI_HEADER_LENGTH;
    if (rleFullRunCount) {    // Write RLE full runs
      //const rowDataLen = MAX_SECTION_LENGTH * textureBPP + 1;   // +1 because of RLE run-length value
      const rowDataBytes = new Uint8Array(RLE_FULL_RUN_DATA_LEN);
      rowDataBytes[0] = MAX_SECTION_LENGTH;
      for (let run=0; run<rleFullRunCount; run++) {
        fs.writeSync(file, rowDataBytes, 0, RLE_FULL_RUN_DATA_LEN, position);
        position += RLE_FULL_RUN_DATA_LEN;
      }
    }
    if (rleFinalRunLen) {     // Write final (non-full) RLE run
      const rowDataLen = rleFinalRunLen * textureBPP + 1;   // +1 because of RLE run-length value
      const rowDataBytes = new Uint8Array(rowDataLen);
      rowDataBytes[0] = rleFinalRunLen;
      fs.writeSync(file, rowDataBytes, 0, rowDataLen, position);
    }

    //fs.closeSync(file);
    //listFiles('After create')
    //dump(imageFilenameTxi);
  }

  const drawRect = (left, top, width, height, style) => {
    // Private function called by strokeRect and fillRect.
    // Doesn't do any arg validation: caller is responsible for that.
    // style: strokeStyle or fillStyle.

    let y = top, pixelIndex, rleRunIndex, rleRunOffset, position, pixelCount, byteCount, pxRemainingInWidth, pxRemainingInRun;
    for (let row=0; row<height; row++) {
      pixelIndex = y * el.width + left;
      rleRunIndex = Math.floor(pixelIndex / MAX_SECTION_LENGTH);    // which RLE run contains this px
      rleRunOffset = pixelIndex % MAX_SECTION_LENGTH;               // how many px into the RLE run this px is
      pxRemainingInWidth = width;
      pxRemainingInRun = MAX_SECTION_LENGTH - rleRunOffset;     // how many pixels are in this run from rleRunOffset (assuming run is full)
      position = rleRunIndex * RLE_FULL_RUN_DATA_LEN + rleRunOffset * textureBPP + TXI_HEADER_LENGTH + 1;    // +1 because of RLE run len value at start of this run
      while (pxRemainingInWidth) {                                   // write px to a RLE run, until rect width all done
        pixelCount = Math.min(pxRemainingInWidth, pxRemainingInRun);   // how many px to write in this run
        byteCount = pixelCount * textureBPP;
        //console.log(`fillRect() x=${x} pixelCount=${pixelCount}`);
        //fs.writeSync(file, fillPixelRunBuffer, 0, byteCount, position);
        fs.writeSync(file, style.pixelRunBuffer, 0, byteCount, position);
        position += byteCount + 1;                                   // +1 to skip run length value
        pxRemainingInWidth -= pixelCount;
        pxRemainingInRun = MAX_SECTION_LENGTH;  // assume next run is a full run: restriction on width should prevent writing beyond end of final run
      }
      y++;
    }
  }

  constructFile();

  // PUBLIC API:

  Object.defineProperty(el, 'autoRedraw', {
    set: function(newAutoRedraw) {
      auto = newAutoRedraw;
    }
  });

  /*Object.defineProperty(el, 'strokeStyle', {  // TODO 3.5 strokeStyle gradient
    set: function(colour) {
      el.style.fill = colour;   // lazy way of getting a colour string converted to #RRGGBB
      //console.log(`fill=${el.style.fill}`)
      colour = el.style.fill;
      const r = Number('0x'+colour.substring(1,3)) >> 2;
      const g = Number('0x'+colour.substring(3,5)) >> 2;
      const b = Number('0x'+colour.substring(5,7)) >> 2;

      // bbaaaaaa ggggBBBB rrrrrrGG
      strokeStyle.pixelBytes[0] = 0xff & ((b << 6) | alpha);        // bbaaaaaa
      strokeStyle.pixelBytes[1] = 0xff & ((g << 4) | (b >> 2));     // ggggBBBB
      strokeStyle.pixelBytes[2] = (r << 2) + (g >> 4);              // rrrrrrGG

      //populatePixelRunBuffer(strokePixelRunBytes, strokePixelBytes);
      strokeStyle.populateRunBuffer()
    }
  });*/

  Object.defineProperty(el, 'strokeStyle', {  // TODO 3.5 strokeStyle gradient
    set: function(colour) {
      strokeStyle.setStyle(colour, alpha, el)
    }
  });

  /*Object.defineProperty(el, 'fillStyle', {
    set: function(colour) {
      el.style.fill = colour;   // lazy way of getting a colour string converted to #RRGGBB
      //console.log(`fill=${el.style.fill}`)
      colour = el.style.fill;
      const r = Number('0x'+colour.substring(1,3)) >> 2;
      const g = Number('0x'+colour.substring(3,5)) >> 2;
      const b = Number('0x'+colour.substring(5,7)) >> 2;
      //console.log(`${r},${g},${b}`)
      // adapted from https://github.com/Fitbit/image-codec-txi/blob/master/src/encoder.ts
      //fillPixelBytes[0] = 0xff & ((b << 6) | alpha);    // bbaaaaaa
      //fillPixelBytes[1] = 0xff & ((g << 4) | (b >> 2)); // ggggbbbb
      //fillPixelBytes[2] = 0xff & ((r << 2) | (g >> 4)); // rrrrrrgg

      //fillPixelBytes[0] = 0xff & ((g << 6) | r);         // ggrrrrrr
      //fillPixelBytes[1] = 0xff & ((b << 4) | (g >> 2));   // bbbbGGGG
      //fillPixelBytes[2] = alpha | (b >> 4);                // aaaaaaBB

      // bbaaaaaa ggggBBBB rrrrrrGG
      //fillPixelBytes[0] = 0xff & ((b << 6) | alpha);        // bbaaaaaa
      //fillPixelBytes[1] = 0xff & ((g << 4) | (b >> 2));     // ggggBBBB
      //fillPixelBytes[2] = (r << 2) + (g >> 4);              // rrrrrrGG
      //console.log(`${r},${g},${b} fillPixelBytes=${fillPixelBytes}`)
      fillStyle.pixelBytes[0] = 0xff & ((b << 6) | alpha);        // bbaaaaaa
      fillStyle.pixelBytes[1] = 0xff & ((g << 4) | (b >> 2));     // ggggBBBB
      fillStyle.pixelBytes[2] = (r << 2) + (g >> 4);              // rrrrrrGG
      //populatePixelRunBuffer(fillPixelRunBytes, fillPixelBytes);
      fillStyle.populateRunBuffer();
    }
  });*/

  Object.defineProperty(el, 'fillStyle', {  // TODO 3.5 fillStyle gradient
    set: function(colour) {
      fillStyle.setStyle(colour, alpha, el)
    }
  });

  Object.defineProperty(el, 'globalAlpha', {
    set: function(newAlpha) {   // TODO 1 alpha is incorrectly implemented: it doesn't consider previously-written pixels
      alpha = Math.round(newAlpha * 0x3f);
      //fillPixelBytes[0] = (fillPixelBytes[0] & 0xc0) | alpha;
      //fillStyle.pixelBytes[0] = (fillStyle.pixelBytes[0] & 0xc0) | alpha;
      //strokeStyle.pixelBytes[0] = (strokeStyle.pixelBytes[0] & 0xc0) | alpha;
      //populatePixelRunBuffer(fillPixelRunBytes, fillPixelBytes);
      //fillStyle.populateRunBuffer()
      //strokeStyle.populateRunBuffer()
      fillStyle.alpha = strokeStyle.alpha = alpha
    }
  });

  Object.defineProperty(el, 'lineWidth', {
    set: function(newWidth) {
      lineWid = newWidth;
    }
  });

  el.fillPixel = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= el.width || y < 0 || y >= el.height) return;    // range-check x and y

    if (file === undefined) file = fs.openSync(imageFilenameTxi, 'r+');
    //const position = (x + y * el.width) * textureBPP + TXI_HEADER_LENGTH;
    //const position = y * el.width*textureBPP + x * textureBPP + TXI_HEADER_LENGTH + 1;
    const pixelIndex = y * el.width + x;
    const rleRunIndex = Math.floor(pixelIndex / MAX_SECTION_LENGTH);    // which RLE run contains this px
    const rleRunOffset = pixelIndex % MAX_SECTION_LENGTH;               // how many px into the RLE run this px is
    const position = rleRunIndex * RLE_FULL_RUN_DATA_LEN + rleRunOffset * textureBPP + TXI_HEADER_LENGTH + 1;    // +1 because of RLE run len value at start of this run
    //console.log(`fillPixel(${x},${y}) rleRunIndex=${rleRunIndex} rleRunOffset=${rleRunOffset} position=${position}`);
    //fs.writeSync(file, fillPixelBuffer, 0, textureBPP, position);
    fs.writeSync(file, fillStyle.pixelBuffer, 0, textureBPP, position);
    //fs.closeSync(file);

    if (auto) el.redraw();
  }

  el.fillRect = (left, top, width, height) => {
    left = Math.round(left); top = Math.round(top); width = Math.round(width); height = Math.round(height);
    // range-checks:
    if (left < 0 || left >= el.width || top < 0 || top >= el.height || width <= 0 || height <= 0) return; // ideally allow width and height < 0
    width = Math.min(width, el.width - left); height = Math.min(height, el.height - top);

    if (file === undefined) file = fs.openSync(imageFilenameTxi, 'r+');

    drawRect(left, top, width, height, fillStyle)

    if (auto) el.redraw();
  }

  el.strokeRect = (left, top, width, height) => {
    // left, top, width, height: integers
    // Unlike HTML canvas, left and top indicate left top pixel co-ordinate, and width and height indicate overall outer size (including all side lines).
    left = Math.round(left); top = Math.round(top); width = Math.round(width); height = Math.round(height);
    // range-checks:
    if (left < 0 || left >= el.width || top < 0 || top >= el.height || width <= 0 || height <= 0) return; // ideally allow width and height < 0
    width = Math.min(width, el.width - left); height = Math.min(height, el.height - top);

    if (file === undefined) file = fs.openSync(imageFilenameTxi, 'r+');

    const sideWidth = Math.min(lineWid, Math.min(width,height))

    // top:
    //let y = top - (lineWid-1 >> 1)
    drawRect(left, top, width, sideWidth, strokeStyle);

    // bottom:
    drawRect(left, top+height-sideWidth, width, sideWidth, strokeStyle)

    // left:
    const sideTop = top + sideWidth
    const sideHeight = height - sideWidth - sideWidth
    drawRect(left, sideTop, sideWidth, sideHeight, strokeStyle)

    // right:
    drawRect(left+width-sideWidth, sideTop, sideWidth, sideHeight, strokeStyle)

    if (auto) el.redraw();
  }

  el.redraw = () => {
    if (file !== undefined) {   // close the file to flush unwritten data
      fs.closeSync(file);
      file = undefined;
    }

    // Rename image file so it can be redisplayed:
    //listFiles('Before redraw')
    const oldFilenameTxi = imageFilenameTxi;
    imageFilename = imageFilenamePrefix + ++filenameCounter + '.png';
    imageFilenameTxi = imageFilename + '.txi';
    fs.renameSync(oldFilenameTxi, imageFilenameTxi);    // rename image file so it can be redisplayed
    //listFiles('After redraw')
    //dump(imageFilenameTxi);

    imageEl.href = imageFilename;      // .txi is appended automatically
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

// hex dump
function dump(filename) { // TODO 4 del
  const stats = fs.statSync(filename);
  console.log(`${filename} size=${stats.size}`)
  const len = Math.min(512, stats.size);
  const buffer = new ArrayBuffer(len);
  const byteArray = new Uint8Array(buffer);
  const file = fs.openSync(filename, 'r');
  fs.readSync(file, buffer, 0, len, 0);
  fs.closeSync(file);
  let row = 0;
  let col = 0;
  let line = "";
  for (let i=0; i<len; i++) {
    line += toHex(byteArray[i]) + ' ';
    if (++col === 16) {
      console.log(line)
      line = "";
      col = 0;
    }
  }
  if (line !== '') console.log(line)
}

function toHex(x) { // TODO 4 del
  const hex_alphabets = "0123456789abcdef";
  let int1, int2;
  int1 = x / 16;
  int2 = x % 16;
  let hex = hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
  return(hex);
}

// TODO 3.4 line drawing: https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm, https://stackoverflow.com/questions/1222713/how-do-i-create-a-line-of-arbitrary-thickness-using-bresenham#:~:text=A%20line%20with%20thickness%20is%20a%20rectangle.%20The,line%20at%20each%20step%20of%20the%20outer%20loop.
// TODO 3.6 async processing via queue