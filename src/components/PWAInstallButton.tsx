import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="App Download / Install karein (PWA)"
        className={`flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 border ${
          compact
            ? 'h-10 w-10 bg-[#0f1115] hover:bg-[#262b36] text-[#4f8cff] border-[#262b36] flex-none'
            : 'px-3 py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white border-transparent'
        }`}
      >
        <Download className="w-4 h-4 animate-bounce" />
      </button>

      {/* Guide Modal for browsers where beforeinstallprompt isn't directly triggered or for iOS Safari */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#171a21] border border-[#262b36] p-6 shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  App Install / Download Karein
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </h3>
                <p className="text-xs text-slate-400">Ultra Superfast full-screen experience</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm">
                <p className="font-medium text-blue-400">iPhone / iPad (iOS Safari) Me Kaise Download Karein:</p>
                <div className="flex items-start gap-3 text-slate-300">
                  <div className="p-1.5 rounded bg-slate-800 text-cyan-400 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <span>1. Safari me niche <strong>Share</strong> icon par click karein.</span>
                </div>
                <div className="flex items-start gap-3 text-slate-300">
                  <div className="p-1.5 rounded bg-slate-800 text-emerald-400 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <span>2. Thoda scroll karke <strong>Add to Home Screen</strong> dabayein.</span>
                </div>
                <p className="text-xs text-slate-400 pt-1">
                  Ab ye app aapki home screen par seedha native app ki tarah khulega!
                </p>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm">
                <p className="font-medium text-blue-400">Android / Chrome / Edge Par Install Karein:</p>
                <p className="text-slate-300">
                  Browser ke address bar me <strong>Install</strong> icon ya 3-dots menu dabakar <strong>&apos;Install app&apos;</strong> ya <strong>&apos;Add to Home Screen&apos;</strong> chunein.
                </p>
                {isInstallable && (
                  <button
                    onClick={async () => {
                      const res = await install();
                      if (res) setShowModal(false);
                    }}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Seedha Install Prompt Dikhayein
                  </button>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
              >
                Theek Hai, Samajh Gaya
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
