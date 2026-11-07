/**
 * Helper for 100% offline Web Speech API (speechSynthesis) narration.
 * Prioritizes Indonesian language ('id-ID') and strips markdown markers for natural reading.
 */

export function playIndonesianSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return () => {};
  }

  // Cancel any active speech immediately to prevent audio overlap
  window.speechSynthesis.cancel();

  // Strip markdown codeblocks, bold, italics, headers for clean audio narration
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();

  if (!cleanText) {
    onEnd?.();
    return () => {};
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID';
  utterance.rate = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(
    (v) => v.lang.includes('id') || v.lang.includes('ID') || v.name.toLowerCase().includes('indonesian')
  );
  if (idVoice) {
    utterance.voice = idVoice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
    onEnd?.();
  };
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
