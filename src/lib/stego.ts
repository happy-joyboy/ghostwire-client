/**
 * GHOSTWIRE STEGANOGRAPHY MODULE (MOCK)
 * Uses the Canvas API to resize/compress the image to safely fit over WebSockets,
 * then simulates steganography by appending the ciphertext.
 */

const DELIMITER = "___GHOST_PAYLOAD___";

export const hideTextInImage = (ciphertext: string, file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      // Create an HTML Image object to read the dimensions
      const img = new Image();
      
      img.onload = () => {
        // Create a canvas to draw and resize the image
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500; // Force a smaller width to prevent WebSocket crashing
        
        let width = img.width;
        let height = img.height;

        // Calculate the new dimensions keeping aspect ratio
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the image onto the canvas at the new size
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Export it as a highly compressed JPEG
        const base64Image = canvas.toDataURL('image/jpeg', 0.6);
        
        // Mock Stego: Append the ciphertext to the end of the base64 string
        const stegoImage = `${base64Image}${DELIMITER}${ciphertext}`;
        
        resolve(stegoImage);
      };

      img.onerror = () => reject(new Error("STEGO_ERROR: Invalid image file"));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("STEGO_ERROR: Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
};

export const extractTextFromImage = async (stegoImage: string): Promise<string> => {
  // Simulate the heavy computational time of scanning pixels
  await new Promise(resolve => setTimeout(resolve, 600));

  if (stegoImage.includes(DELIMITER)) {
    const parts = stegoImage.split(DELIMITER);
    const ciphertext = parts[1];
    return ciphertext;
  }
  
  throw new Error("STEGO_ERROR: NO_PAYLOAD_FOUND");
};