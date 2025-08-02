import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

export default function FeedbackForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    try {
      await axios.post("/api/feature-request/", { email, message });
      setStatus("✅ Thank you! Message sent.");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("❌ Failed to send message.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative group max-w-2xl mx-auto mt-8"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-200"></div>

      <div className="relative bg-gray-900 rounded-xl p-6 sm:p-8 border border-gray-800 text-white space-y-6">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          💬 Suggest a Feature
        </h2>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400"
        />
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your feature request..."
          className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400"
        />
        <button
          onClick={handleSubmit}
          className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
        >
          Send Feedback
        </button>

        {status && <p className="text-sm text-green-400">{status}</p>}
      </div>
    </motion.div>
  );
}
