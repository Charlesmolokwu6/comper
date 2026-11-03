/**
 * Spoken directions with the phone's own speech engine (Web Speech API): free, offline on
 * most phones, nothing sent anywhere. Prefers a Nigerian English voice when there is one.
 */
const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

function voice() {
  const all = window.speechSynthesis.getVoices();
  return (
    all.find(v => /en[-_]NG/i.test(v.lang)) ??
    all.find(v => /en[-_]GB/i.test(v.lang)) ??
    all.find(v => /^en/i.test(v.lang)) ??
    null
  );
}

export const voiceAvailable = canSpeak;

export function speak(text: string) {
  if (!canSpeak()) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = voice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-GB";
  u.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** "300 metres", "1.2 kilometres": how distances are said aloud. */
export function sayDistance(metres: number) {
  if (metres >= 1000) {
    const km = Math.round(metres / 100) / 10;
    return `${km} kilometre${km === 1 ? "" : "s"}`;
  }
  const m =
    metres >= 100 ? Math.round(metres / 50) * 50 : Math.round(metres / 10) * 10;
  return `${Math.max(10, m)} metres`;
}
