# Photo Sphere Viewer Integration

## Overview
Photo Sphere Viewer has been successfully integrated into the MDRRMO Pio Duran Dashboard for viewing 360° panoramic images in the Maps module.

## Features

### 360° Panorama Viewing
- **Interactive Navigation**: Click and drag to look around the panorama
- **Zoom Controls**: Scroll to zoom in/out or use the zoom buttons
- **Keyboard Support**: Use arrow keys to navigate
- **Auto-Rotate**: Toggle automatic rotation of the panorama
- **Fullscreen Mode**: View panoramas in fullscreen for immersive experience

### User Interface
- Clean, dark-themed viewer interface
- Control buttons for:
  - Zoom In/Out
  - Auto Rotate
  - Fullscreen Toggle
  - Close Viewer
- Loading indicator while panorama loads
- Error handling with user-friendly messages
- Instructions displayed at the bottom

## How It Works

### File Structure
\`\`\`
/app/frontend/src/components/
├── MapsViewer.js           # Main maps component (updated)
└── PhotoSphereViewer.js    # New panorama viewer component
\`\`\`

### Integration Points

1. **MapsViewer Component** (`/apap/frontend/src/components/MapsViewer.js`)
   - Displays panorama images as clickable cards in the "Panorama" section
   - Opens PhotoSphereViewer modal when a panorama is clicked
   - Passes image URL and title to the viewer

2. **PhotoSphereViewer Component** (`/app/frontend/src/components/PhotoSphereViewer.js`)
   - Full-screen modal overlay for panorama viewing
   - Initializes the Photo Sphere Viewer library
   - Provides interactive controls
   - Handles loading states and errors

### Usage

1. Navigate to the **Maps** section from the dashboard
2. Select **Panorama** from the sidebar
3. Click on any panorama image card
4. The 360° viewer will open in fullscreen
5. Interact with the panorama:
   - **Click and drag** to look around
   - **Scroll** to zoom in/out
   - **Arrow keys** to pan
   - Use toolbar buttons for additional controls
6. Click the **X button** or press **ESC** to close

## Technical Details

### Library
- **Package**: `photo-sphere-viewer@4.8.1`
- **Dependencies**: 
  - `three@0.147.0` (3D rendering)
  - `uevent@2.2.0` (event handling)

### Configuration
\`\`\`javascript
{
  navbar: ['zoom', 'move', 'download', 'fullscreen'],
  defaultZoomLvl: 50,
  minFov: 30,
  maxFov: 90,
  mousewheel: true,
  mousemove: true,
  keyboard: 'always',
  touchmoveTwoFingers: false
}
\`\`\`

### Image Processing
- Images are loaded from Google Drive via thumbnail/webView links
- Converted to HD URLs using `convertToHDUrl()` utility function
- Supports various panoramic image formats (equirectangular projection)

## Best Practices

### Image Requirements
1. **Format**: Equirectangular projection (2:1 aspect ratio recommended)
2. **Resolution**: Higher resolution for better quality (4096x2048 or higher)
3. **File Size**: Balance between quality and loading time
4. **Supported Formats**: JPG, PNG

### Performance
- Lazy loading: Viewer only initializes when opened
- Proper cleanup: Viewer is destroyed when closed to free memory
- Error handling: Graceful fallback if image fails to load

## Troubleshooting

### Common Issues

1. **Panorama doesn't load**
   - Check if image URL is accessible
   - Verify image format is supported
   - Check browser console for errors

2. **Distorted view**
   - Ensure image is in equirectangular format
   - Check image aspect ratio (should be 2:1)

3. **Performance issues**
   - Reduce image resolution if too large
   - Close other heavy applications
   - Try in a different browser

## Future Enhancements

Potential improvements:
- Support for video panoramas
- Virtual tour with multiple linked panoramas
- Custom hotspots/markers in panoramas
- VR mode support
- Gyroscope support for mobile devices
- Thumbnail preview in viewer
- Multiple panorama comparison view

## Resources

- [Photo Sphere Viewer Documentation](https://photo-sphere-viewer.js.org/)
- [Migration Guide](https://photo-sphere-viewer.js.org/guide/migration.html)
- [Three.js Documentation](https://threejs.org/docs/)

## Version History

- **v1.0** (January 2026): Initial integration with basic features
  - 360° panorama viewing
  - Interactive controls
  - Fullscreen support
  - Auto-rotate feature
