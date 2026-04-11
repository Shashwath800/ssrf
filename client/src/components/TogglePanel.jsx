import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * TogglePanel Component
 * 
 * Replaced the old simple toggle with a link to the new full DNS Resolver interface.
 */

export default function TogglePanel() {
  return (
    <motion.div
      layout
      transition={{ duration: 0.4 }}
      className="rounded-xl p-4 border transition-all duration-500 bg-indigo-500/10 border-indigo-500/20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: -30, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500/20"
          >
            <span className="text-xl">🌐</span>
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-white">Advanced DNS Control</h3>
            <p className="text-xs text-indigo-400">
              Live IP mutation, rebinding, and query logs.
            </p>
          </div>
        </div>

        <Link to="/dns-resolver">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }} 
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            Open Control Room ⚡
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
