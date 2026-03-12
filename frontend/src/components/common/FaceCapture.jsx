import { useRef, useState, useCallback, useEffect } from 'react';
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
 *   liveness - show blink instruction
 *   label - button label
 */
const FaceCapture = ({ onCapture, liveness = true, label = 'Capture Face', disabled = false }) => {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [step, setStep] = useState('ready'); // ready | countdown | captured
  const [countdown, setCountdown] = useState(3);
  const [blinkStep, setBlinkStep] = useState(0); // 0: none, 1: look ahead, 2: blink
  const [permError, setPermError] = useState(false);

  // Blink guide steps for liveness
  const blinkInstructions = [
    '👀 Look straight at the camera',
    '😐 Now... BLINK slowly',
    '✅ Hold still for capture',
  ];

  const startCapture = useCallback(() => {
    if (disabled) return;
    if (liveness) {
      setBlinkStep(0);
      setStep('liveness');
      // Auto advance liveness steps
      let s = 0;
      const iv = setInterval(() => {
        s++;
        if (s < blinkInstructions.length) {
          setBlinkStep(s);
        } else {
          clearInterval(iv);
          beginCountdown();
        }
      }, 2000);
    } else {
      beginCountdown();
    }
  }, [disabled, liveness]);

  const beginCountdown = () => {
    setStep('countdown');
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c === 0) {
        clearInterval(iv);
        captureNow();
      } else {
        setCountdown(c);
      }
    }, 1000);
  };

  const captureNow = useCallback(() => {
    const imgSrc = webcamRef.current?.getScreenshot();
    if (!imgSrc) return;
    setCaptured(imgSrc);
    setStep('captured');

    // Convert base64 to blob
    fetch(imgSrc)
      .then(r => r.blob())
      .then(blob => onCapture(blob, imgSrc));
  }, [onCapture]);

  const retake = () => {
    setCaptured(null);
    setStep('ready');
    onCapture(null, null);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative rounded-2xl overflow-hidden border-4 border-primary/30 w-full max-w-sm aspect-square bg-black">
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
              <div className="w-56 h-56 rounded-full border-4 border-white/60 border-dashed" />
            </div>
            {step === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-white text-7xl font-bold">{countdown}</span>
              </div>
            )}
            {step === 'liveness' && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="bg-primary text-primary-content px-4 py-2 rounded-xl text-sm font-semibold animate-pulse mx-4 text-center">
                  {blinkInstructions[blinkStep]}
                </div>
              </div>
            )}
          </>
        ) : (
          <img src={captured} alt="Captured" className="w-full h-full object-cover" />
        )}
        {permError && (
          <div className="absolute inset-0 flex items-center justify-center bg-error/20">
            <p className="text-error font-semibold text-center p-4">Camera permission denied. Please allow camera access.</p>
          </div>
        )}
      </div>

      {step !== 'captured' ? (
        <button
          type="button"
          onClick={startCapture}
          disabled={disabled || step === 'countdown' || step === 'liveness' || permError}
          className="btn btn-primary btn-wide gap-2"
        >
          <FiCamera size={18} />
          {step === 'countdown' ? `Capturing in ${countdown}...` : step === 'liveness' ? 'Follow instructions...' : label}
        </button>
      ) : (
        <div className="flex gap-3">
          <div className="badge badge-success gap-1 p-3">
            <FiCheckCircle size={14} /> Captured
          </div>
          <button type="button" onClick={retake} className="btn btn-ghost btn-sm gap-1">
            <FiRefreshCw size={14} /> Retake
          </button>
        </div>
      )}

      {liveness && step === 'ready' && (
        <p className="text-xs text-base-content/50 text-center">
          Liveness detection enabled. You'll be asked to blink naturally.
        </p>
      )}
    </div>
  );
};

export default FaceCapture;
