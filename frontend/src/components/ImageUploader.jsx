import { Camera, Trash2, Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

export default function ImageUploader({ images, setImages }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList)
        .filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024)
        .slice(0, Math.max(0, 5 - images.length));

      const prepared = await Promise.all(
        files.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
          file,
          preview: URL.createObjectURL(file),
          quality: await checkImageQuality(file)
        }))
      );
      setImages([...images, ...prepared]);
    },
    [images, setImages]
  );

  function removeImage(id) {
    const removed = images.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    setImages(images.filter((image) => image.id !== id));
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-ink p-6 text-center transition-all duration-200 ${
          isDragging ? 'border-gold shadow-gold' : 'border-line hover:border-gold'
        }`}
      >
        <div className="mb-4 rounded-full border border-line bg-surface p-4 text-gold">
          <Camera className="h-8 w-8" />
        </div>
        <p className="text-lg font-bold">Drag & drop or click to upload</p>
        <p className="mt-2 max-w-md text-sm text-textSecondary">Upload 1-5 photos. JPG or PNG. Max 10MB each.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-textSecondary">
          <Upload className="h-4 w-4" />
          Select images
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />

      <div className="rounded-xl border border-line border-l-gold bg-surface p-4 text-sm text-textSecondary">
        <span className="font-semibold text-gold">Pro tip:</span> Include a Rs. 1 coin (22mm) in at least one photo. This helps our AI estimate real-world size and improves weight accuracy.
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {images.map((image) => (
            <div key={image.id} className="group relative overflow-hidden rounded-xl border border-line bg-ink">
              <img src={image.preview} alt="Jewelry preview" className="h-56 w-full object-cover" />
              <div className="absolute left-3 top-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${image.quality.good ? 'bg-teal text-white' : 'bg-warning text-black'}`}>
                  {image.quality.good ? 'Good quality' : 'Low light'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute right-3 top-3 rounded-lg border border-line bg-ink/85 p-2 text-textSecondary transition-all duration-200 hover:border-danger hover:text-danger"
                aria-label="Remove image"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function checkImageQuality(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const { data } = ctx.getImageData(0, 0, 64, 64);
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    const avg = brightness / (data.length / 4);
    return { good: avg > 58, brightness: avg };
  } catch (error) {
    return { good: true, brightness: 100 };
  }
}
