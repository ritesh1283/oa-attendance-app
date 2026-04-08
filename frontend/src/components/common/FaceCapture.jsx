import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FiCamera, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

const videoConstraints = {
  width: 480,
  height: 480,
  facingMode: 'user',
};

/**
 * FaceCapture component
 * Props:
 *   onCapture(blob) - called when user captures
 *   label - button label
 */
const FaceCapture = ({ onCapture, label = 'Capture Face', disabled = false }) => {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [permError, setPermError] = useState(false);

  const captureNow = useCallback(() => {
    if (disabled) return;
    const imgSrc = webcamRef.current?.getScreenshot();
    if (!imgSrc) return;
    setCaptured(imgSrc);

    // Convert base64 to blob
    fetch(imgSrc)
      .then(r => r.blob())
      .then(blob => onCapture(blob, imgSrc));
  }, [onCapture, disabled]);

  const retake = () => {
    setCaptured(null);
    onCapture(null, null);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative rounded-2xl overflow-hidden border-4 border-primary/20 w-full max-w-sm aspect-square bg-black shadow-lg">
        {!captured ? (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMediaError={() => setPermError(true)}
              className="w-full h-full object-cover"
              mirrored
            />
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 rounded-full border-4 border-white/50 border-dashed" />
            </div>
            {/* Single instruction overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-semibold mx-4 text-center shadow-lg">
                👀 Keep your eyes wide open and look into the camera
              </div>
            </div>
          </>
        ) : (
          <img src={captured} alt="Captured" className="w-full h-full object-cover" />
        )}
        {permError && (
          <div className="absolute inset-0 flex items-center justify-center bg-error/20 backdrop-blur-sm">
            <p className="text-error font-semibold text-center p-4">Camera permission denied. Please allow camera access.</p>
          </div>
        )}
      </div>

      {!captured ? (
        <button
          type="button"
          onClick={captureNow}
          disabled={disabled || permError}
          className="btn btn-gradient btn-wide gap-2 h-12"
        >
          <FiCamera size={18} />
          {label}
        </button>
      ) : (
        <div className="flex gap-3">
          <div className="badge badge-success gap-1 p-3 text-sm font-semibold">
            <FiCheckCircle size={14} /> Captured
          </div>
          <button type="button" onClick={retake} className="btn btn-ghost btn-sm gap-1">
            <FiRefreshCw size={14} /> Retake
          </button>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
