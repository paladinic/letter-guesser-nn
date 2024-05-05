const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const clearBtn = document.getElementById('clearCanvas');
const modelInputCanvas = document.getElementById('modelInputCanvas');
const modelInputCtx = modelInputCanvas.getContext('2d');
const wrongBtn = document.getElementById('wrongBtn');
const correctAnswerInput = document.getElementById('correctAnswer');

let flattenedArray = [];
let lastPrediction = "";
let isDrawing = false;
ctx.lineWidth = 20;

// Model initialization
let model;
async function initializeModel() {
  model = await loadModel();
}
async function loadModel() {
  try {
    model = await tf.loadLayersModel('indexeddb://my-updated-model');
  } catch (error) {
    console.log("Error loading from IndexedDB:", error);
    model = await tf.loadLayersModel('https://paladinic.github.io/letter-guesser-nn/assets/model/model.json');
  }

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
  const classWeights = { [correctLabel.charCodeAt(0) - 65]: classWeight };

  const optimizer = tf.train.adam(learningRate);
  model.compile({
    optimizer: optimizer,
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  const tensor = tf.tensor4d(imageData, [1, 28, 28, 1], 'float32');
  const labelIndex = correctLabel.charCodeAt(0) - 65;
  const labelTensor = tf.oneHot([labelIndex], 26);

  await model.fit(tensor, labelTensor, { epochs: epochs, classWeight: classWeights });
  await model.save('indexeddb://my-updated-model');
  console.log("Saved updated model to IndexedDB");
}

async function updateProbabilities() {
  if (!model) return;

  const resizedData = getResizedImageData(canvas, 28, 28);
  flattenedArray = getFlattenedArray(resizedData);

  drawModelInputGrid(resizedData);

  const tensor = tf.tensor4d(flattenedArray, [1, 28, 28, 1], 'float32');
  const prediction = model.predict(tensor);
  const probabilities = (await prediction.array())[0];

  probabilityChart.data.datasets[0].data = probabilities;
  probabilityChart.update();

  const predIndex = probabilities.indexOf(Math.max(...probabilities));
  lastPrediction = String.fromCharCode(65 + predIndex);

  document.querySelector('span.pred').innerText = lastPrediction;
}

function drawModelInputGrid(imageData) {
  const gridSize = 28;
  const squareSize = modelInputCanvas.width / gridSize;
  modelInputCtx.clearRect(0, 0, modelInputCanvas.width, modelInputCanvas.height);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const index = (row * gridSize + col) * 4;
      const alpha = imageData.data[index + 3];
      const color = `rgb(${alpha}, ${alpha}, ${alpha})`;
      modelInputCtx.fillStyle = color;
      modelInputCtx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);
      modelInputCtx.strokeStyle = 'gray';
      modelInputCtx.strokeRect(col * squareSize, row * squareSize, squareSize, squareSize);
    }
  }
}

function getResizedImageData(srcCanvas, width, height) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, width, height);
  return tempCtx.getImageData(0, 0, width, height);
}

function getFlattenedArray(imageData) {
  const array = [];
  for (let i = 3; i < imageData.data.length; i += 4) {
    array.push(imageData.data[i]);
  }
  return array;
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
        display: false
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

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  modelInputCtx.clearRect(0, 0, modelInputCanvas.width, modelInputCanvas.height);
  probabilityChart.data.datasets[0].data = new Array(26).fill(0);
  probabilityChart.update();
  document.querySelector('span.pred').innerText = '_';
}

function getInputPos(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  if (event.touches) {
    return {
      x: event.touches[0].clientX - rect.left,
      y: event.touches[0].clientY - rect.top
    };
  }
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

let debounceTimeout;
function debounceUpdateProbabilities() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(updateProbabilities, 10);
}

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) {
    const pos = getInputPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    debounceUpdateProbabilities();
  }
});
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (isDrawing) {
    const pos = getInputPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    debounceUpdateProbabilities();
  }
});
canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const pos = getInputPos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  debounceUpdateProbabilities();
});
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  const pos = getInputPos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  debounceUpdateProbabilities();
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
