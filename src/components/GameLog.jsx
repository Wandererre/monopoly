import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, ScrollText, Send } from "lucide-react";

export default function GameLog({ logs = [], chats = [], onSendChat, playerName }) {
  const [activeTab, setActiveTab] = useState("logs"); // "logs" or "chat"
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, chats, activeTab]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput("");
  };

  const getLogBadgeClass = (type) => {
    switch (type) {
      case "buy":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "rent":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "jail":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "trade":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "card":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "dice":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      default:
        return "text-slate-300 bg-slate-800/40 border-slate-700/30";
    }
  };

  return (
    <div className="luxury-card rounded-2xl border border-slate-800 flex flex-col h-72 sm:h-80 overflow-hidden shadow-xl">
      {/* Tab Header */}
      <div className="flex items-center bg-slate-950/80 border-b border-slate-800 px-2 pt-2">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition border-t border-x ${
            activeTab === "logs"
              ? "bg-slate-900 border-slate-700 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" /> Activity Log
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition border-t border-x relative ${
            activeTab === "chat"
              ? "bg-slate-900 border-slate-700 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Room Chat
          {chats.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {activeTab === "logs" ? (
          logs.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 italic">
              Game activities and rolls will appear here...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded-xl border text-[11px] leading-relaxed transition ${getLogBadgeClass(
                  log.type
                )}`}
              >
                <div className="flex items-center justify-between text-[9px] opacity-70 mb-0.5 font-mono">
                  <span>{log.time}</span>
                  <span className="uppercase font-bold">{log.type}</span>
                </div>
                <div>{log.message}</div>
              </div>
            ))
          )
        ) : chats.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 italic">
            Say hi to your friends! Type a message below.
          </div>
        ) : (
          chats.map((c) => {
            const isMe = c.sender === playerName;
            return (
              <div
                key={c.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                  <span className="font-bold text-slate-300">{c.sender}</span>
                  <span>{c.time}</span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-2xl text-xs max-w-[85%] break-words ${
                    isMe
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                  }`}
                >
                  {c.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Dock */}
      {activeTab === "chat" && (
        <form onSubmit={handleChatSubmit} className="p-2 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
