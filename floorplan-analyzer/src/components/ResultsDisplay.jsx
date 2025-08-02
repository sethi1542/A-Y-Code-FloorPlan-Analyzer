import React from "react";
import { FileDown } from "lucide-react";

export default function ResultsDisplay({ results }) {
  return (
    <div className="mt-12 max-w-2xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Analysis Results
      </h2>

      {["elevation", "floorplan"].map((type) =>
        results[type] ? (
          <div
            key={type}
            className="p-5 border border-gray-800 rounded-xl bg-gray-900 text-white flex items-center justify-between shadow relative group"
          >
            <div>
              <p className="font-medium capitalize text-blue-300">
                {type} Result
              </p>
              <a
                href={results[type].url}
                download={`${type}_results.xlsx`}
                className="text-sm text-green-400 hover:underline"
              >
                Download Excel
              </a>
            </div>
            <FileDown className="w-5 h-5 text-green-400" />
          </div>
        ) : (
          <p
            key={type}
            className="text-gray-400 italic border border-gray-800 rounded-xl bg-gray-900 p-4 text-sm"
          >
            {type} not uploaded yet.
          </p>
        )
      )}
    </div>
  );
}
