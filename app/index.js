import document from 'document';
import './widgets/canvas';

const myCanvasEl = document.getElementById('myCanvas');

// Speed test (fillPixel):
/*myCanvasEl.autoRedraw = false;
const PX_COUNT = 400
const tStart = Date.now()
for (let i=0; i<PX_COUNT; i++) myCanvasEl.fillPixel(Math.random()*300,Math.random()*200);
const tElapsed = (Date.now()-tStart)/1000
console.log(`t=${tElapsed} rate=${PX_COUNT/tElapsed} px/sec`)
myCanvasEl.redraw();*/

// Speed test (fillRect):
/*const RECT_COUNT = 5000
const tStart = Date.now()
for (let i=0; i<RECT_COUNT; i++) myCanvasEl.fillRect(Math.random()*1,Math.random()*1, 100, 20);
const tElapsed = (Date.now()-tStart)/1000
console.log(`t=${tElapsed} rate=${RECT_COUNT/tElapsed} rect/sec`)
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

//myCanvasEl.fillStyle = '#0000ff'; myCanvasEl.fillRect(1,1,298,198);
//myCanvasEl.globalAlpha = 0.5
myCanvasEl.strokeStyle = 'red';
myCanvasEl.fillStyle = 'green';
myCanvasEl.lineWidth = 2; myCanvasEl.strokeRect(10,10,10,20);
myCanvasEl.strokeRect(30,10,20,10);
/*myCanvasEl.lineWidth = 2; myCanvasEl.strokeRect(30,10,10,10);
myCanvasEl.lineWidth = 3; myCanvasEl.strokeRect(50,10,10,10);
myCanvasEl.lineWidth = 4; myCanvasEl.strokeRect(70,10,10,10);
myCanvasEl.lineWidth = 5; myCanvasEl.strokeRect(90,10,10,10);*/
//myCanvasEl.fillPixel(10,10);
myCanvasEl.fillRect(100,100,30,30);
myCanvasEl.redraw();

/*//Touch draw:
myCanvasEl.autoRedraw = true;
const touchEl = document.getElementById('touch');
touchEl.onmousemove = e => {myCanvasEl.fillPixel(e.screenX-touchEl.x, e.screenY-touchEl.y);}

document.getElementById('red').onclick = () => {myCanvasEl.fillStyle = 'red';}
document.getElementById('green').onclick = () => {myCanvasEl.fillStyle = 'green';}
document.getElementById('blue').onclick = () => {myCanvasEl.fillStyle = 'blue';}*/