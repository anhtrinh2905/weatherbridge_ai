import { useCallback, useEffect, useRef, useState } from "react";
import { operationsApi } from "../operations/api";

export function useAlertAudio() {
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const play = useCallback(async (alertId: string) => {
    setError(null);
    setIsLoading(true);
    try {
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const audio = await operationsApi.alertAudio(alertId);
      const url = URL.createObjectURL(audio);
      audioUrlRef.current = url;
      const player = new Audio(url);
      audioRef.current = player;
      player.onended = () => setIsPlaying(false);
      player.onerror = () => {
        setIsPlaying(false);
        setError("Không phát được âm thanh.");
      };
      setIsPlaying(true);
      await player.play();
    } catch (exc) {
      setIsPlaying(false);
      setError(exc instanceof Error ? exc.message : "Không tải được âm thanh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { play, isLoading, isPlaying, error };
}
