const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const clearBtn = document.getElementById('clearCanvas');
const modelInputCanvas = document.getElementById('modelInputCanvas');
const modelInputCtx = modelInputCanvas.getContext('2d');

let flattenedArray = [];
let lastPrediction = "";
let isDrawing = false;
ctx.lineWidth = 20;

const wrongBtn = document.getElementById('wrongBtn');
const correctAnswerInput = document.getElementById('correctAnswer');

// model
let model;
async function initializeModel() {
  model = await loadModel();
}
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
  const exponent = parseInt(document.getElementById('learnRate').value, 10);
  const classWeight = parseInt(document.getElementById('classWeight').value, 10);
  
  const learningRate = Math.pow(10, exponent); // Convert exponent to actual learning rate
  const epochs = parseInt(document.getElementById('epochs').value, 10);
  const classWeights = { [correctLabel.charCodeAt(0) - 65]: classWeight };  // Weight of 10 for the misclassified class

  // Load the model
  model = await loadModel();

  // Adjust learning rate specifically for retraining
  const optimizer = tf.train.adam(learningRate);
  model.compile({
      optimizer: optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
  });

  // Prepare the tensor for training
  const tensor = tf.tensor4d(imageData, [1, 28, 28, 1], 'float32');

  // Create a single label tensor
  const labelIndex = correctLabel.charCodeAt(0) - 65;
  const labelTensor = tf.oneHot([labelIndex], 26);

  // Retrain the model with N epochs
  await model.fit(tensor, labelTensor, { epochs: epochs, classWeight: classWeights });

  // Save the updated model to IndexedDB
  await model.save('indexeddb://my-updated-model');
  console.log("Saved updated model to IndexedDB");
}
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

  // Draw the grid to represent the model input
  drawModelInputGrid(resizedData);

  // Convert the flattened array into a tensor using TensorFlow.js
  const tensor = tf.tensor4d(flattenedArray, [1, 28, 28, 1], 'float32');

  // Make prediction and get probabilities
  const prediction = model.predict(tensor);
  const probabilities = (await prediction.array())[0];

  // Update the chart with probabilities
  probabilityChart.data.datasets[0].data = probabilities;
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

function drawModelInputGrid(imageData) {
  const gridSize = 28;
  const squareSize = modelInputCanvas.width / gridSize;

  // Clear the previous grid
  modelInputCtx.clearRect(0, 0, modelInputCanvas.width, modelInputCanvas.height);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const index = (row * gridSize + col) * 4;
      const alpha = imageData.data[index + 3]; // Get the alpha value (grayscale intensity)

      // Determine the grayscale color based on the alpha value
      const color = `rgb(${alpha}, ${alpha}, ${alpha})`;
      modelInputCtx.fillStyle = color;

      // Draw the square on the grid
      modelInputCtx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);

      // Optional: Draw grid lines
      modelInputCtx.strokeStyle = 'gray';
      modelInputCtx.strokeRect(col * squareSize, row * squareSize, squareSize, squareSize);
    }
  }
}


wrongBtn.addEventListener('click', async () => {
  const correctLabel = correctAnswerInput.value.toUpperCase();
  if (correctLabel.length === 1 && /[A-Z]/.test(correctLabel)) {
    await retrainModel(correctLabel, flattenedArray);
    await updateProbabilities();
    alert("Model retrained with new input");
  } else {
    alert("Please enter a valid single letter A-Z");
  }
});

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
      borderColor: 'black',
      borderWidth: 2
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
        display:false
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
  }
});

// canvas
function clearCanvas() {
  // Clear the main drawing canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Clear the 28x28 model input canvas
  modelInputCtx.clearRect(0, 0, modelInputCanvas.width, modelInputCanvas.height);

  // Clear the probability chart data
  probabilityChart.data.datasets[0].data = new Array(26).fill(0);
  probabilityChart.update();

  // Reset the prediction text
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

clearBtn.addEventListener('click', clearCanvas);
initializeModel();