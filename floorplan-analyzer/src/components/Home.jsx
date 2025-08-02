import React from 'react';
import UploadForm from './UploadForm';
import ResultsDisplay from './ResultsDisplay';
import LoadingSpinner from './LoadingSpinner';
import FeedbackForm from './FeedbackForm';
import { motion } from 'framer-motion';

export default function Home({ loading, results, setLoading, setResults }) {
  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 pt-24 px-4 pb-12">
      <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Window & Door Analyzer
          </h1>
          <p className="text-gray-400 mt-2">Upload your drawings to get precise results.</p>
        </div>

        <UploadForm setLoading={setLoading} setResults={setResults} />

        {loading ? <LoadingSpinner /> : <ResultsDisplay results={results} />}

        {/* Feedback Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold text-center text-white bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 mb-4">
            💬 Suggest a Feature
          </h2>
          <FeedbackForm />
        </div>
      </motion.div>
    </div>
  );
}
