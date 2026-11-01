/**
 * Utility functions for image manipulation, SVG rendering, and downloads
 */

// Download image from data URL or blob
export function downloadImage(dataUrl: string, filename: string = 'somgpt-image.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Convert SVG string to high-res PNG data URL
export function convertSvgToPngDataUrl(svgString: string, width: number = 1024, height: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try {
          const pngUrl = canvas.toDataURL('image/png');
          resolve(pngUrl);
        } catch {
          resolve(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`);
      };

      img.src = url;
    } catch {
      resolve(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`);
    }
  });
}

// Apply visual enhancement filter (modern, 3d, cinematic, vintage, enhance) to an existing image
export function applyImageEnhancement(
  sourceDataUrl: string,
  filterType: 'enhance' | '3d' | 'modern' | 'cinematic' | 'warmth' | 'sharp'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 800;
      canvas.height = img.height || 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      // Configure CSS canvas filters
      switch (filterType) {
        case '3d':
          ctx.filter = 'contrast(125%) saturate(135%) brightness(105%)';
          break;
        case 'cinematic':
          ctx.filter = 'contrast(120%) saturate(115%) sepia(15%) brightness(98%)';
          break;
        case 'modern':
          ctx.filter = 'contrast(115%) saturate(125%) brightness(108%)';
          break;
        case 'warmth':
          ctx.filter = 'sepia(25%) saturate(120%) brightness(102%)';
          break;
        case 'sharp':
        case 'enhance':
        default:
          ctx.filter = 'contrast(118%) saturate(118%) brightness(104%)';
          break;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Subtle 3D vignette / lighting overlay for 3D and modern modes
      if (filterType === '3d' || filterType === 'modern') {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.2,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.75
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      try {
        const resultUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(resultUrl);
      } catch {
        resolve(sourceDataUrl);
      }
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}
