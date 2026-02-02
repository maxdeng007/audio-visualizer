# Audio Visualizer
![LOGO](/public/logo_AV.png "Audio Visualizer")

A React-based audio visualization tool with beautiful, audio-reactive animations.

![Screenshot](/public/UI-screenshot.png "Audio Visualizer UI")

## Features

- **9 Visualization Types:**
  - Oscilloscope - Classic waveform display
  - Bars - Frequency spectrum bar chart
  - Circle - Radial frequency bars from center
  - Radial - Continuous frequency ring
  - Organic Sphere - Glowing orb with fluid animation
  - Nebula - Cosmic cloud with swirling particles
  - Aurora - Flowing wave bands like northern lights
  - Fireflies - Swarm of particles pulsing to the beat
  - Plasma - Morphing colorful blob layers

- **Customization Options:**
  - Wave/Bar colors with gradient support
  - Adjustable wave height and line width
  - Glow effects and particle systems
  - Background types and images
  - Mirror mode for symmetrical visuals

- **Export:**
  - Export visualizations as WebM video
  - Frame-accurate rendering
  - Custom resolution and frame rate

- **Responsive Design:**
  - Adapts to any screen size
  - Auto-fit to background image dimensions

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

## Usage

1. Upload your audio file
2. Choose a visualization type from the dropdown
3. Customize colors and effects in the settings panel
4. Optionally upload a background image
5. Play and preview the animation
6. Export the visualization as a video

## Visualization Types

### Traditional Visualizations
- **Oscilloscope**: Displays the audio waveform as a oscillating line
- **Bars**: Shows frequency spectrum as vertical bars
- **Circle**: Radial bars emanating from the center
- **Radial**: Continuous circular frequency display

### Organic Visualizations
- **Organic Sphere**: A beautiful glowing orb with fluid animation that pulses with bass
- **Nebula**: Cosmic clouds with swirling particles and distant stars
- **Aurora**: Flowing wave bands that ripple like northern lights
- **Fireflies**: A swarm of glowing particles that pulse and cluster to the beat
- **Plasma**: Morphing colorful blob layers with beat-reactive bubbles

## Technologies

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Web Audio API
- Canvas 2D API

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
