import React, { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";

export default function CookieBanner({ onOpenPrivacy }) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("business_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("business_cookie_consent", "accepted");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-slate-900/95 text-white border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-800 text-amber-400 shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="font-black text-white text-xs">We value your privacy</div>
          <p className="leading-snug">
            We use cookies to personalize advertisements via Google AdSense and store your gameplay settings.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs rounded-xl transition cursor-pointer shadow-md"
            >
              Got it
            </button>
            <button
              onClick={onOpenPrivacy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Learn More
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
