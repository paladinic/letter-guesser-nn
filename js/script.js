import * as tf from '@tensorflow/tfjs';

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const clearBtn = document.getElementById('clearCanvas');
const predictCanvasBtn = document.getElementById('predictCanvas');

let isDrawing = false;

ctx.lineWidth = 40; // Set the stroke width

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pred_span = document.querySelector('span.pred');
  pred_span.innerText = '_';
}

async function predictCanvas() {

  const isCanvasBlank = isCanvasEmpty(canvas);
  if (isCanvasBlank) {
    console.log("Canvas is blank");
    return;
  }

  // Get the original image data from the main canvas
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Create a temporary canvas to resize the image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 28;
  tempCanvas.height = 28;
  const tempCtx = tempCanvas.getContext('2d');

  // Draw the image onto the temporary canvas, resizing it
  tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 28, 28);

  // Get the resized image data
  const resizedData = tempCtx.getImageData(0, 0, 28, 28);

  // Convert flatten array
  const flattenedArray = [];
  for (let i = 3; i < resizedData.data.length; i += 4) {
    flattenedArray.push(resizedData.data[i]);
  }

  // Load the model
  const model = await tf.loadLayersModel('./assets/model/model.json');

  // Convert the flattened array into a tensor using TensorFlow.js
  const tensor = tf.tensor4d(flattenedArray, [1, 28, 28, 1], 'float32');


  // Log tensor data to check if it is all zeros
  tensor.data().then(data => {

    // Make prediction
    const prediction = model.predict(tensor);
    const predIndex = prediction.argMax(1).dataSync()[0];

    // Map the index to a letter
    const predLetter = String.fromCharCode(65 + predIndex);

    // Print prediction

    const pred_span = document.querySelector('span.pred');
    pred_span.innerText = predLetter;
  });
}

function isCanvasEmpty(canvas) {
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;

  return canvas.toDataURL() === blank.toDataURL();
}
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function getTouchPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX - rect.left,
    y: evt.touches[0].clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const pos = getMousePos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) {
    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
});

canvas.addEventListener('mouseup', () => {
  isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
  isDrawing = false;
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevents scrolling on touch
  isDrawing = true;
  const pos = getTouchPos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault(); // Prevents scrolling on touch
  if (isDrawing) {
    const pos = getTouchPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
});

canvas.addEventListener('touchend', () => {
  isDrawing = false;
});

clearBtn.addEventListener('click', clearCanvas);
predictCanvasBtn.addEventListener('click', predictCanvas);
