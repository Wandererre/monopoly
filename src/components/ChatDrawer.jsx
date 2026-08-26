import React, { useState, useRef, useEffect } from "react";
import { X, Send, MessageSquare } from "lucide-react";

export default function ChatDrawer({ isOpen, onClose, chats = [], onSendChat, playerName }) {
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendChat(input.trim());
    setInput("");
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#1F2421] text-slate-100 border-l-2 border-black shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-sm text-white">Table Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        {chats.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500 italic">
            Say hi to your fellow players!
          </div>
        ) : (
          chats.map((c) => {
            const isMe = c.sender === playerName;
            return (
              <div key={c.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="text-[10px] text-slate-400 mb-0.5">
                  <span className="font-bold text-slate-200">{c.sender}</span> • {c.time}
                </div>
                <div
                  className={`px-3 py-2 rounded-xl text-xs max-w-[85%] break-words ${
                    isMe
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                  }`}
                >
                  {c.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          placeholder="Send a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
