import React from 'react';
import { motion } from 'framer-motion';

export default function QuickQuestion({ icon, question, onClick, delay = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="bg-white hover:bg-blue-50 border border-gray-200 rounded-xl p-4 text-left transition-all hover:shadow-md hover:border-blue-300 group"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
        {question}
      </div>
    </motion.button>
  );
}