import React, { useState } from 'react';
import { X, Copy, Check, Share2, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, title, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Site Opener Link',
          url,
        });
      } catch {
        // user dismissed
      }
    } else {
      handleCopy();
    }
  };

  // Quick reliable QR code via dynamic image or standard SVG API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-[#171a21] border border-[#262b36] p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Mobile Se Scan Karein</h3>
            <p className="text-xs text-slate-400">Phone ke camera se QR scan karke kholein</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-4 p-4 bg-white rounded-xl shadow-inner border border-slate-200">
          <img
            src={qrImageUrl}
            alt={`QR code for ${url}`}
            className="w-48 h-48 object-contain"
            loading="lazy"
          />
        </div>

        {/* URL Box */}
        <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono truncate mb-4 select-all">
          {url}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
          >
            <Share2 className="w-4 h-4" />
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
};
