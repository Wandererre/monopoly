import React, { useState } from "react";
import { X, Shield, FileText, Mail, Info } from "lucide-react";

export default function LegalModal({ isOpen, onClose, initialTab = "privacy" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] text-slate-900 w-full max-w-2xl max-h-[85vh] rounded-3xl border-4 border-black shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-black tracking-wide text-sm sm:text-base font-['Outfit'] uppercase">
              Business: Legal Information
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-black bg-slate-100 text-xs font-black">
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-r border-slate-300 transition cursor-pointer ${
              activeTab === "privacy" ? "bg-white text-slate-950 border-b-2 border-b-black" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-r border-slate-300 transition cursor-pointer ${
              activeTab === "terms" ? "bg-white text-slate-950 border-b-2 border-b-black" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === "contact" ? "bg-white text-slate-950 border-b-2 border-b-black" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Contact & About</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-slate-900">Privacy Policy</h2>
              <p className="text-xs text-slate-500">Last updated: September 2026</p>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">1. Information We Collect</h3>
                <p>
                  <strong>Business: Property Board Game</strong> does not require user account registration. We store player preferences (e.g., chosen player nickname, selected avatar token) locally on your device via browser LocalStorage.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">2. Cookies & Third-Party Advertising (Google AdSense)</h3>
                <p>
                  We partner with third-party advertising networks, such as <strong>Google AdSense</strong>, to serve advertisements when you visit our website.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Google and other third-party vendors use cookies to serve ads based on your prior visits to our website or other websites on the internet.</li>
                  <li>Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to our site and/or other sites on the Internet.</li>
                  <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Ads Settings</a> or through <a href="https://www.aboutads.info" target="_blank" rel="noreferrer" className="text-blue-600 underline">AboutAds.info</a>.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">3. Voice Chat & Real-Time Data</h3>
                <p>
                  Voice chat functionality uses WebRTC peer-to-peer audio transmission. Audio streams are encrypted and transmitted directly between players in the room; no audio recordings are captured, processed, or saved on our servers.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">4. Contact Us</h3>
                <p>
                  If you have questions regarding this Privacy Policy, you may contact us via our contact page.
                </p>
              </section>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-slate-900">Terms of Service</h2>
              <p className="text-xs text-slate-500">Last updated: September 2026</p>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">1. Acceptance of Terms</h3>
                <p>
                  By accessing or playing <strong>Business: Property Board Game</strong>, you agree to comply with and be bound by these Terms of Service.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">2. Virtual Game Currency Disclaimer (No Real Money)</h3>
                <p>
                  All in-game cash, currency, properties, rents, and funds are <strong>strictly virtual entertainment tokens</strong>. There is no real-money gambling, cash wagering, or monetary value associated with any game asset.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">3. Code of Conduct</h3>
                <p>
                  Players agree to use respectful language in usernames, in-game chat, and voice communications. Any harassment, abusive conduct, or automated exploitation may result in room expulsion or temporary IP access restrictions.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900">4. Intellectual Property Disclaimer</h3>
                <p>
                  <strong>Business: Property Board Game</strong> is an independent digital simulation inspired by classic property trading board game mechanics. It is <strong>not affiliated with, endorsed by, or sponsored by Hasbro, Inc.</strong> or Parker Brothers.
                </p>
              </section>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-slate-900">About & Contact Information</h2>

              <section className="space-y-2">
                <p>
                  <strong>Business: Property Board Game</strong> is a free-to-play, web-based multiplayer board game built with modern web technologies including React, Three.js 3D WebGL, Node.js, and WebRTC.
                </p>
                <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Inquiries & Support:</span>
                  </div>
                  <p className="text-xs text-slate-600 pl-6">
                    For feedback, bug reports, or partnership inquiries, contact us at: <br />
                    <span className="font-mono text-slate-900 font-bold">support@businessgame.online</span> (or via GitHub repository issues).
                  </p>
                </div>
              </section>

              <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs space-y-1 text-amber-950">
                <div className="flex items-center gap-1.5 font-black text-amber-900">
                  <Info className="w-4 h-4" />
                  <span>Fair Play & Community</span>
                </div>
                <p>
                  Thank you for playing Business! Have fun trading properties, building houses, and bankrupting your opponents.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t-2 border-black bg-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl border border-black shadow transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
