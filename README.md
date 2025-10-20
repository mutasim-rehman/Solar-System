# **Near-Earth Object (NEO) Visualization**

This project is an interactive 3D visualization of Near-Earth Objects (asteroids) as they pass by our planet. It fetches real-time data from the NASA API to plot the trajectories and provide information about asteroids approaching Earth. The application is built using Three.js for the 3D rendering and features a "mission control" style heads-up display (HUD) for a more immersive experience.

## **Features**

* **Real-time Data**: Utilizes the NASA NeoWs (Near Earth Object Web Service) API to fetch data on asteroids.  
* **Interactive 3D Globe**: A detailed 3D model of the Earth, complete with day/night cycles, clouds, and atmospheric glow.  
* **Asteroid Tracking**: Visualizes the trajectories of both potentially hazardous and safe asteroids.  
* **Dynamic HUD**: Displays key information such as the number of tracked objects, system time, and a threat assessment panel.  
* **Time Controls**: Allows the user to pause and resume the simulation time.  
* **Informative Tooltips**: Hovering over an asteroid reveals detailed information about it, including its name, size, velocity, and miss distance.  
* **Mini-Map**: Provides a 2D overhead view of the Earth and surrounding asteroids for better situational awareness.  
* **Customizable Data Range**: Users can select to view data for the next 7, 30, or 180 days.

## **Technologies Used**

* **Three.js**: The core 3D library used for rendering all objects and effects.  
* **HTML5 & CSS3**: For the structure and styling of the user interface and HUD elements.  
* **JavaScript (ES6 Modules)**: For the application logic, API interaction, and 3D scene management.  
* **NASA NeoWs API**: The source of the asteroid data.

## **Setup and Installation**

To run this project locally, you'll need a web server. You can use a simple one like the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for Visual Studio Code.

1. **Clone or Download the Repository**: Get the index.html and main.js files and place them in a directory.  
2. **Get a NASA API Key**:  
   * Visit the [NASA API website](https://api.nasa.gov/).  
   * Fill out the form to get your free API key.  
   * By default, the application uses DEMO\_KEY, which has strict rate limits. It is highly recommended to use your own key.  
3. **Run the project**:  
   * Open the index.html file with your local web server.  
   * The application will load, and you will be prompted to enter your NASA API key.

## **File Structure**

The project is contained within two main files:

* index.html: The main HTML file that contains the structure of the page, the CSS for the HUD, and the canvas element for the 3D scene. The JavaScript code is included as a module within this file.  
* main.js: This file contains all the JavaScript logic for the application. It has been embedded into the index.html file but can be kept separate for better organization.

## **Code Structure and Logic (main.js)**

The JavaScript is organized into logical sections using comments.

### **1\. Constants and Global State**

This section defines key constants for the simulation, such as the radii of the Earth and Moon, and initializes global variables that will be used throughout the application to manage its state.

// \========== CONSTANTS \==========  
const EARTH\_RADIUS \= 10;  
// ...

// \========== GLOBAL STATE \==========  
let nasaApiKey \= '';  
let allAsteroidData \= \[\];  
let simulationDate \= new Date();  
// ...

### **2\. THREE.js Setup**

This is where the fundamental Three.js components are initialized:

* **Scene**: The container for all 3D objects.  
* **Camera**: The perspective from which the scene is viewed.  
* **Renderer**: Renders the scene onto the HTML canvas. It's configured for anti-aliasing and shadow mapping.  
* **Label Renderer**: A separate renderer (CSS2DRenderer) is used to display HTML-based labels for the asteroids in the 3D space.

### **3\. Lighting**

The scene's lighting is set up to create a realistic look:

* **sunLight (DirectionalLight)**: Represents the sun, casting shadows and illuminating the scene. Its position is updated in the animation loop to simulate the day/night cycle.  
* **ambientLight**: Provides a soft, ambient light to the entire scene.

### **4\. 3D Objects**

* **Starfield**: A particle system creates a dense field of stars in the background for a sense of depth.  
* **Earth**: The Earth is a Group containing multiple meshes:  
  * earthMesh: The main sphere with detailed day, night, specular, and normal maps.  
  * cloudMesh: A slightly larger, transparent sphere with a cloud texture that rotates at a different speed.  
  * atmosphereMesh: Uses a custom shader to create a glowing atmospheric effect around the edge of the planet.  
* **Moon**: A textured sphere that orbits the Earth.  
* **Asteroids**: Each asteroid is represented by an IcosahedronGeometry and is added to a single asteroidGroup for easy management. Their trajectories are visualized with a Line object.

### **5\. NASA API Interaction (loadAsteroidData)**

This asynchronous function is responsible for fetching the asteroid data.

* It breaks down the requested date range into 7-day chunks (the maximum allowed by the API).  
* It iterates through these chunks, fetching data for each and updating a progress bar.  
* Once all data is loaded, it calls createAsteroidVisuals() to populate the scene.

### **6\. HUD and UI Updates**

A set of functions are dedicated to updating the various HUD elements:

* updateStatistics(): Populates the "Mission Control" and "Threat Assessment" panels.  
* updateSystemTime(): Updates the clock and simulation date.  
* updateMiniMap(): Draws the positions of asteroids on the 2D mini-map canvas.  
* updateTooltip(): Updates the content of the tooltip when hovering over an asteroid.

### **7\. User Interaction**

* **Mouse (handleMouseMove)**: Uses a Raycaster to detect when the mouse is hovering over an asteroid to show the tooltip.  
* **Keyboard**:  
  * Spacebar: Pauses/resumes the simulation.  
  * R: Resets the camera to its initial position.  
* **Buttons**: Event listeners are set up for the API key submission and the visibility toggle buttons.

### **8\. Animation Loop (animate)**

This is the heart of the application, where everything is updated and rendered on each frame.

* It advances the simulationDate based on the timeMultiplier.  
* It updates the rotation of the Earth, clouds, and Moon.  
* It updates the position of the sun to simulate the day/night cycle.  
* It iterates through each asteroid, updating its position along its pre-calculated trajectory based on the current simulation time.  
* It calls controls.update() for smooth camera movement.  
* Finally, it renders the scene using the EffectComposer (for the bloom effect) and the labelRenderer.

## **Future Improvements**

* **More Accurate Orbits**: The current orbits are simplified for visualization. They could be replaced with more accurate orbital mechanics calculations.  
* **Object Focusing**: Add the ability to click on an asteroid to focus the camera on it.  
* **Sound Effects**: Add ambient sound effects for a more immersive experience.  
* **Historical Data**: Allow users to view data from past dates.
