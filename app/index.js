import document from 'document';
import './widgets/canvas';

const myCanvasEl = document.getElementById('myCanvas');
myCanvasEl.fillPixel(150,100);

const touchEl = document.getElementById('touch');
touchEl.onmousemove = e => {myCanvasEl.fillPixel(e.screenX-touchEl.x, e.screenY-touchEl.y);}

document.getElementById('red').onclick = () => {myCanvasEl.fillStyle = 'red';}
document.getElementById('green').onclick = () => {myCanvasEl.fillStyle = 'green';}
document.getElementById('blue').onclick = () => {myCanvasEl.fillStyle = 'blue';}