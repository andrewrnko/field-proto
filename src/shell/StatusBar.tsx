/* Cosmetic iOS status bar — only drawn inside the desktop device frame.
   On a real phone the OS draws the real one and this is hidden by CSS. */
import { NOW } from "../data/clock";

export function StatusBar() {
  const t = NOW.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })
    .replace(/\s?(AM|PM)/, "");
  return (
    <>
      <div className="notch" aria-hidden />
      <div className="statusbar" aria-hidden>
        <span>{t}</span>
        <span className="sb-right">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".35"/></svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 10.6 6.2 8.8a2.6 2.6 0 0 1 3.6 0zM8 7a4.7 4.7 0 0 0-3.3 1.4L3.3 7A6.7 6.7 0 0 1 8 5c1.8 0 3.4.7 4.7 2l-1.4 1.4A4.7 4.7 0 0 0 8 7zM8 3.2c-2.4 0-4.6 1-6.2 2.5L.4 4.3A10.5 10.5 0 0 1 8 1.2c3 0 5.6 1.2 7.6 3.1l-1.4 1.4A8.7 8.7 0 0 0 8 3.2z"/></svg>
          <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".6" y=".6" width="21" height="10.8" rx="3.2" stroke="currentColor" strokeOpacity=".4"/><rect x="2.2" y="2.2" width="15" height="7.6" rx="2" fill="currentColor"/><path d="M23.5 4.2c1 .4 1 3.2 0 3.6z" fill="currentColor" fillOpacity=".5"/></svg>
        </span>
      </div>
    </>
  );
}
