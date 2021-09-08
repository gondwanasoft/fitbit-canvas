import document from 'document';
import './widgets/canvas';

const myCanvasEl = document.getElementById('myCanvas');

/*// Speed test:
myCanvasEl.autoRedraw = false;
const PX_COUNT = 10000
const tStart = Date.now()
for (let i=0; i<PX_COUNT; i++) {
  myCanvasEl.fillPixel(Math.random()*300,Math.random()*200);
}
console.log(`px/sec = ${PX_COUNT/(Date.now()-tStart)*1000}`)
myCanvasEl.redraw();*/

/*myCanvasEl.autoRedraw = false;
myCanvasEl.fillStyle = 'red';
myCanvasEl.fillPixel(12,9);
myCanvasEl.fillPixel(1,0);
myCanvasEl.fillPixel(2,0);
myCanvasEl.fillPixel(3,0);
myCanvasEl.fillStyle = '#00FF00';
myCanvasEl.fillPixel(0,1);
myCanvasEl.fillPixel(1,1);
myCanvasEl.fillPixel(2,1);
myCanvasEl.fillPixel(3,1);
myCanvasEl.fillStyle = '#0000FF';
myCanvasEl.globalAlpha = 0.5;
myCanvasEl.fillPixel(0,2);
myCanvasEl.fillPixel(1,2);
myCanvasEl.fillPixel(2,2);
myCanvasEl.fillPixel(3,2);
myCanvasEl.redraw()*/

myCanvasEl.autoRedraw = true;
const touchEl = document.getElementById('touch');
touchEl.onmousemove = e => {myCanvasEl.fillPixel(e.screenX-touchEl.x, e.screenY-touchEl.y);}

document.getElementById('red').onclick = () => {myCanvasEl.fillStyle = 'red';}
document.getElementById('green').onclick = () => {myCanvasEl.fillStyle = 'green';}
document.getElementById('blue').onclick = () => {myCanvasEl.fillStyle = 'blue';}

/*const myCanvas2El = document.getElementById('myCanvas2');
myCanvas2El.fillStyle = 'white';
myCanvas2El.fillPixel(50,20);
myCanvas2El.redraw();*/