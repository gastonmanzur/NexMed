import { useCallback, useEffect, useRef, type ReactElement } from 'react';

const DEMO_VIDEO_SRC = '/media/landing/comercial_horizontal.mp4';

type LandingVideoModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const LandingVideoModal = ({ isOpen, onClose }: LandingVideoModalProps): ReactElement | null => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopVideoPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    video.load();
  }, []);

  const handleClose = useCallback(() => {
    stopVideoPlayback();
    onClose();
  }, [onClose, stopVideoPlayback]);

  useEffect(() => {
    const video = videoRef.current;

    if (!isOpen || !video) return undefined;

    video.load();
    video.currentTime = 0;
    const playPromise = video.play();

    if (playPromise) {
      playPromise.catch(() => {
        // Keep native controls visible so browsers that block autoplay with audio still let users start playback manually.
      });
    }

    return () => stopVideoPlayback();
  }, [isOpen, stopVideoPlayback]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="nx-landing-video-modal" role="dialog" aria-modal="true" aria-labelledby="landing-video-title">
      <button
        type="button"
        className="nx-landing-video-modal__overlay"
        aria-label="Cerrar video publicitario"
        onClick={handleClose}
      />
      <div className="nx-landing-video-modal__panel">
        <div className="nx-landing-video-modal__header">
          <div>
            <p className="nx-landing-video-modal__eyebrow">Demo comercial NexMed</p>
            <h2 id="landing-video-title">Conocé NexMed en acción</h2>
          </div>
          <button type="button" className="nx-landing-video-modal__close" aria-label="Cerrar video" onClick={handleClose}>
            ×
          </button>
        </div>
        <div className="nx-landing-video-modal__frame nx-landing-video-modal__frame--horizontal">
          <video
            ref={videoRef}
            className="nx-landing-video-modal__video"
            controls
            playsInline
            preload="metadata"
            src={DEMO_VIDEO_SRC}
            aria-label="Video publicitario horizontal de NexMed"
          />
        </div>
      </div>
    </div>
  );
};
