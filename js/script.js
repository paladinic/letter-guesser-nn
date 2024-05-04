const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const clearBtn = document.getElementById('clearCanvas');
const predictCanvasBtn = document.getElementById('predictCanvas');

let flattenedArray = [];
let lastPrediction = "";
let isDrawing = false;
ctx.lineWidth = 40;

const wrongBtn = document.getElementById('wrongBtn');
const correctAnswerInput = document.getElementById('correctAnswer');


// model
let model;
async function initializeModel() {
  model = await loadModel();
}
initializeModel();

async function loadModel() {
  let model;
  try {
    model = await tf.loadLayersModel('indexeddb://my-updated-model');
  } catch (error) {
    console.log("Error loading from IndexedDB:", error);
    model = await tf.loadLayersModel('https://paladinic.github.io/letter-guesser-nn/assets/model/model.json');
  }

  // Compile the model
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}
async function retrainModel(correctLabel, imageData) {
  const n = parseInt(document.getElementById('retrainTimes').value, 10);
  const model = await loadModel();

  // Prepare the tensor for training
  const tensor = tf.tensor4d(imageData, [1, 28, 28, 1], 'float32');

  // Create a batch of N duplicated examples
  const expandedTensor = tensor.tile([n, 1, 1, 1]);

  // Create label tensors repeated N times
  const labelIndex = correctLabel.charCodeAt(0) - 65;
  const labelTensor = tf.oneHot([labelIndex], 26);
  const expandedLabels = labelTensor.tile([n, 1]);

  // Retrain the model
  await model.fit(expandedTensor, expandedLabels, { epochs: 1 });

  // Save the updated model to IndexedDB
  await model.save('indexeddb://my-updated-model');
}


wrongBtn.addEventListener('click', async () => {
  const correctLabel = correctAnswerInput.value.toUpperCase();
  if (correctLabel.length === 1 && /[A-Z]/.test(correctLabel)) {
    await retrainModel(correctLabel, flattenedArray);
    alert("Model retrained with new input");
  } else {
    alert("Please enter a valid single letter A-Z");
  }
});
async function predictCanvas() {
  const isCanvasBlank = isCanvasEmpty(canvas);
  if (isCanvasBlank) {
    alert("Canvas is blank");
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

  // Clear and rebuild flattenedArray
  flattenedArray = [];
  for (let i = 3; i < resizedData.data.length; i += 4) {
    flattenedArray.push(resizedData.data[i]);
  }

  // Load the model
  const model = await loadModel();

  // Convert the flattened array into a tensor using TensorFlow.js
  const tensor = tf.tensor4d(flattenedArray, [1, 28, 28, 1], 'float32');

  // Make prediction and get probabilities
  const prediction = model.predict(tensor);
  const probabilities = await prediction.data();

  // Update the chart with probabilities
  probabilityChart.data.datasets[0].data = Array.from(probabilities);
  probabilityChart.update();

  // Determine the index of the highest probability
  const predIndex = probabilities.indexOf(Math.max(...probabilities));

  // Map the index to a letter
  const predLetter = String.fromCharCode(65 + predIndex);
  lastPrediction = predLetter;  // Store the last prediction

  // Print prediction
  const pred_span = document.querySelector('span.pred');
  pred_span.innerText = predLetter;
}

// bar chart
const chartCtx = document.getElementById('probabilityChart').getContext('2d');
let probabilityChart = new Chart(chartCtx, {
  type: 'bar',
  data: {
    labels: [...Array(26).keys()].map(i => String.fromCharCode(65 + i)),
    datasets: [{
      label: 'Probability',
      data: new Array(26).fill(0),
      backgroundColor: 'white',
      borderColor: 'white',
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "white"
        }
      },
      x: {
        ticks: {
          color: "white"
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  }});

// canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pred_span = document.querySelector('span.pred');
  pred_span.innerText = '_';
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


async function updateProbabilities() {
  // Only update if model is loaded
  if (!model) {
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

  // Clear and rebuild flattenedArray
  flattenedArray = [];
  for (let i = 3; i < resizedData.data.length; i += 4) {
    flattenedArray.push(resizedData.data[i]);
  }

  // Convert the flattened array into a tensor using TensorFlow.js
  const tensor = tf.tensor4d(flattenedArray, [1, 28, 28, 1], 'float32');

  // Make prediction and get probabilities
  const prediction = model.predict(tensor);
  const probabilities = (await prediction.array())[0];

  // Update the chart with probabilities
  probabilityChart.data.datasets[0].data = probabilities;
  probabilityChart.update();
}

let debounceTimeout;
function debounceUpdateProbabilities() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(updateProbabilities, 10);
}

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) {
    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    debounceUpdateProbabilities();
  }
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault(); // Prevents scrolling on touch
  if (isDrawing) {
    const pos = getTouchPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    debounceUpdateProbabilities();
  }
});

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const pos = getMousePos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  debounceUpdateProbabilities();  // Update immediately when the user starts drawing
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevents scrolling on touch
  isDrawing = true;
  const pos = getTouchPos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  debounceUpdateProbabilities();  // Update immediately when the user starts drawing
});


canvas.addEventListener('mouseup', () => {
  isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
  isDrawing = false;
});

canvas.addEventListener('touchend', () => {
  isDrawing = false;
});

predictCanvasBtn.addEventListener('click', predictCanvas);
clearBtn.addEventListener('click', clearCanvas);