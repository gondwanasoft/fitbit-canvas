import fs from 'fs'
import * as config from './config';
import { constructWidgets } from './widget_utils';

// TXI file format constants from https://github.com/Fitbit/image-codec-txi/blob/master/src/encoder.ts
const TXI_HEADER_LENGTH = 40;
const textureBPP = 3;

export const constructCanvas = el => {
  const imageEl = el.getElementById('image');
  const imageFilenamePrefix = '/private/data/canvas';   // TODO 3.2 needs to change for every instance of canvas
  let filenameCounter = 0;
  let imageFilename = imageFilenamePrefix + filenameCounter + '.png';
  let imageFilenameTxi = imageFilename + '.txi';

  el.class = el.class;    // bring forward (ie, trigger) application of CSS styles

  el.fillPixel = (x, y) => {
    // TODO 0 range-check x and y
    // TODO 3.1 use colour

    // Rename image file so it can be redisplayed:
    const oldFilenameTxi = imageFilenameTxi;
    imageFilename = imageFilenamePrefix + ++filenameCounter + '.png';
    imageFilenameTxi = imageFilename + '.txi';
    fs.renameSync(oldFilenameTxi, imageFilenameTxi);    // rename image file so it can be redisplayed

    const file = fs.openSync(imageFilenameTxi, "r+");   // TODO 3.5 for efficiency, only open and close file once for every batch of primitives
    const buffer = new ArrayBuffer(textureBPP);
    const bytes = new Uint8Array(buffer);
    bytes[0] = 255;
    bytes[1] = 255;
    bytes[2] = 255;
    const position = (x + y * el.width) * textureBPP + TXI_HEADER_LENGTH;
    console.log(`fillPixel(${x},${y}) index=${filenameCounter}`);
    fs.writeSync(file, buffer, 0, textureBPP, position);
    fs.closeSync(file);

    //imageEl.href = 'widgets/canvas/null.png';         // change filename so that imageEl is redrawn
    imageEl.href = imageFilename;      // .txi is appended automatically
  }

  el.reset = () => {  // change filename back to initial
    if (filenameCounter) {
      const oldFilenameTxi = imageFilenameTxi;
      imageFilename = imageFilenamePrefix + '0.png';
      imageFilenameTxi = imageFilename + '.txi';
      fs.renameSync(oldFilenameTxi, imageFilenameTxi);
    }
  }
}

export const constructCanvases = parentEl => {
  // Constructs all canvas widgets within parentEl ElementSearch.
  constructWidgets('canvas', constructCanvas);
}

if (config.autoConstruct) constructCanvases();

// TODO 3.5 async processing via queue
// TODO 3.2 dir location of canvas?
// TODO 3.0 canvas file creation
// TODO 3.4 delete previous .txi on startup