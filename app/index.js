import { me } from "appbit";
import document from 'document';
import './widgets/canvas'

const myCanvasEl = document.getElementById('myCanvas')
const touchEl = document.getElementById('touch')
touchEl.onmousemove = onMouseMove

function onMouseMove(e) {
  myCanvasEl.fillPixel(e.screenX-touchEl.x, e.screenY-touchEl.y)
}

me.onunload = () => {
  myCanvasEl.reset();   // this won't be necessary eventually
}

