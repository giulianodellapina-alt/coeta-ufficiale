import React from 'react';
import { motion } from 'motion/react';
import { EkoclubLogo } from './EkoclubLogo';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a] p-4 border-2 border-yellow-400 shadow-[inset_0_0_20px_rgba(250,204,21,0.15)]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        onClick={onComplete}
        className="relative flex items-center justify-center cursor-pointer group"
      >
        {/* Pulsing Background Glow (Optimized with radial-gradient, no heavy CSS blur) */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-[radial-gradient(circle,rgba(234,179,8,0.2)_0%,transparent_70%)]"
        />

        {/* Central Logo: EKOCLUB Logo */}
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 flex flex-col items-center justify-center"
        >
          <EkoclubLogo className="w-[50vmin] h-[50vmin] max-w-[450px] max-h-[450px]" />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-yellow-400 text-base font-normal animate-pulse uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"
      >
        Tocca per iniziare
      </motion.p>
    </div>
  );
};
