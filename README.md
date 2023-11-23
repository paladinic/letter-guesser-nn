[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Letter Guesser Web App

## Overview

The Letter Guesser Web App is an open-source static web application that uses a TensorFlow.js model to predict letters drawn by users on a canvas. It's designed to be simple, user-friendly, and accessible to anyone interested in machine learning and web development.

## Features
- Drawing Canvas: Users can draw letters on a responsive canvas.
- Prediction: The TensorFlow.js model predicts the letter based on the drawing.
- Mobile-Friendly: Works on both desktop and mobile devices thanks to touch event handling.
- Easy to Reset: With a clear button, users can quickly erase their drawing and start over.


## How It Works
The web app utilizes a pre-trained TensorFlow.js neural network model to recognize hand-drawn letters. When a user draws a letter on the canvas and presses the "Predict" button, the app processes the image data, feeds it to the neural network, and displays the predicted letter.

## Getting Started
### Prerequisites
- Web browser with JavaScript support.
- Internet connection (for the first-time model download).
### Local Setup
- Clone the repository to your local machine.
- Navigate to the project directory.
- Open the index.html file in a web browser to start using the app.
```
git clone ...
cd ...
```

## Hosting
To host this application on GitHub Pages, follow these steps:
- Fork the repository to your GitHub account.
- Enable GitHub Pages in the repository settings.
- Your app will be live at https://<your-username>.github.io/letter-guesser-nn.

## Usage
- Use the mouse (or touch on mobile devices) to draw a letter on the canvas.
- Click the "Predict" button to see the app's guess.
- Use the "Clear Canvas" button to erase your drawing.

## Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

## Fork the Project
- Create your Feature Branch (git checkout -b feature/AmazingFeature)
- Commit your Changes (git commit -m 'Add some AmazingFeature')
- Push to the Branch (git push origin feature/AmazingFeature)
- Open a Pull Request

## License
Distributed under the MIT License. See LICENSE for more information.

## Contact
Your Name - info@linea-analytics.com

## Project Link 
https://github.com/your-username/letter-guesser-web-app

## Acknowledgements
- TensorFlow.js
