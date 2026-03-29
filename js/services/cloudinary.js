// Cloudinary signed upload service
import { cloudinaryToken } from './config.js';

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxWidth = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Komprimering feilet'));
        },
        'image/jpeg',
        0.7
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Kunne ikke lese bildet'));
    };
    img.src = objectUrl;
  });
}

async function sha1Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToCloudinary(file) {
  const parts = cloudinaryToken.value.split(':').map(s => s.trim());
  if (parts.length !== 3) {
    throw new Error('Cloudinary er ikke konfigurert');
  }
  const [cloudName, apiKey, apiSecret] = parts;
  console.log('Cloudinary upload debug:', { cloudName, apiKeyLength: apiKey.length, apiSecretLength: apiSecret.length });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1Hex(`timestamp=${timestamp}${apiSecret}`);

  const compressed = await compressImage(file);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', compressed, 'image.jpg');
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Cloudinary upload failed:', res.status, errorData);
    throw new Error('Bildeopplasting feilet: ' + (errorData.error?.message || res.status));
  }

  const data = await res.json();
  return data.secure_url;
}
