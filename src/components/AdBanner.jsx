import React, { useEffect } from "react";

export default function AdBanner({
  slot = "0000000000",
  format = "auto",
  responsive = "true",
  className = ""
}) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT || "ca-pub-0000000000000000";
  const isDev = !import.meta.env.PROD || client === "ca-pub-0000000000000000";

  useEffect(() => {
    if (!isDev) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error("AdSense render error:", err);
      }
    }
  }, [isDev]);

  if (isDev) {
    return (
      <div className={`w-full p-2.5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-center flex flex-col items-center justify-center gap-1 ${className}`}>
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
          Advertisement Slot (AdSense Ready)
        </span>
        <span className="text-[10px] text-slate-600 font-mono">
          Slot: {slot} • Client: {client}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden flex justify-center items-center my-2 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
