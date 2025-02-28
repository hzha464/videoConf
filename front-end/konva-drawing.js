import Konva from "konva";
import { io } from 'socket.io-client'
import config from './config.js'

// const width = window.innerWidth;
// const height = window.innerHeight - 25;

// const stage = new Konva.Stage({
//   container: "drawer",
//   width: width,
//   height: height,
// });

let address = 'http://'+config.ip+':3031'
const socket = io(address);
const container = document.getElementById("drawer");


const sendDrawingData = (points, mode) => {
    socket.emit("draw", { points, mode });
  };


const getContainerSize = () => {
    return {
      width: container.clientWidth,
      height: container.clientHeight,
    };
  };
  
  // Initialize the Konva stage with container size

let { width, height } = getContainerSize();
console.log(width, height);

const stage = new Konva.Stage({
container: "drawer", // Ensure this ID matches your div in HTML
width: width,
height: height,
})

const layer = new Konva.Layer();
stage.add(layer);

let isPaint = false;
let mode = "brush";
let lastLine;

stage.on("mousedown touchstart", (e) => {
  isPaint = true;
  const pos = stage.getPointerPosition();
  lastLine = new Konva.Line({
    stroke: "#df4b26",
    strokeWidth: 5,
    globalCompositeOperation:
      mode === "brush" ? "source-over" : "destination-out",
    lineCap: "round",
    lineJoin: "round",
    points: [pos.x, pos.y, pos.x, pos.y],
  });
  layer.add(lastLine);
});

stage.on("mouseup touchend", () => {
  isPaint = false;
});

stage.on("mousemove touchmove", (e) => {
    
  if (!isPaint) {
    return;
  }

  e.evt.preventDefault(); // Prevent scrolling on touch devices

  const pos = stage.getPointerPosition();
  const newPoints = lastLine.points().concat([pos.x, pos.y]);
  lastLine.points(newPoints);


  sendDrawingData(newPoints, mode);
});


socket.on("draw", (data) => {
    const newLine = new Konva.Line({
      stroke: "#df4b26",
      strokeWidth: 5,
      globalCompositeOperation:
        data.mode === "brush" ? "source-over" : "destination-out",
      lineCap: "round",
      lineJoin: "round",
      points: data.points,
    });
    layer.add(newLine);
  });

document.getElementById("tool").addEventListener("change", (event) => {
  mode = event.target.value;
});
