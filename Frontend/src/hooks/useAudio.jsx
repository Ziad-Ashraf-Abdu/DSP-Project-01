// src/hooks/useAudio.jsx
import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudio = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    // Initialize audio context on user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.connect(audioContextRef.current.destination);
          gainNodeRef.current.gain.value = 1;
        } catch (error) {
          console.error('Error initializing audio context:', error);
        }
      }
    };

    // Initialize on first user interaction
    const handleFirstInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);

    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playFrequency = useCallback((frequency) => {
    if (!audioContextRef.current || isMuted) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (!oscillatorRef.current) {
        oscillatorRef.current = audioContextRef.current.createOscillator();
        oscillatorRef.current.type = 'sine';
        oscillatorRef.current.connect(gainNodeRef.current);
        oscillatorRef.current.start();
      }

      oscillatorRef.current.frequency.setValueAtTime(
          frequency,
          audioContextRef.current.currentTime
      );
    } catch (error) {
      console.error('Error playing frequency:', error);
    }
  }, [isMuted]);

  const stopSound = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newMuted ? 0 : 1;
      }
      if (newMuted) {
        stopSound();
      }
      return newMuted;
    });
  }, [stopSound]);

  return {
    playFrequency,
    stopSound,
    toggleMute,
    isMuted
  };
};