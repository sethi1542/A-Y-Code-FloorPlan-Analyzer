import React, { useState, useContext } from "react";
import axios from "axios";
import { Upload, Download, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";

export default function UploadForm({ setLoading: setParentLoading, setResults }) {
  const [file, setFile] = useState(null);
  const [drawingType, setDrawingType] = useState("elevation");
  const [mode, setMode] = useState("accurate");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadData, setDownloadData] = useState(null);
  const [progress, setProgress] = useState(0);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) return setError("Please select a PDF file.");
    if (!user) return navigate("/login");

    setLoading(true);
    setParentLoading?.(true);
    setError("");
    setProgress(0);
    setDownloadData(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", drawingType);
    formData.append("mode", mode);

    try {
      const response = await axios.post("/api/upload/", formData, {
        responseType: "blob",
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `${drawingType}_results_${mode}_${timestamp}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([response.data]));

      setDownloadData({
        url,
        fileName,
        type: drawingType,
        mode,
        timestamp: new Date().toLocaleString(),
      });

      try {
        await axios.get("/api/dashboard/");
      } catch (e) {
        console.log("Dashboard refresh failed:", e);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        navigate("/login");
      } else {
        setError(err.response?.data?.error || "Upload failed. Please try again.");
      }
    } finally {
      setLoading(false);
      setParentLoading?.(false);
      setProgress(0);
    }
  };

  const handleNewUpload = () => {
    setFile(null);
    setDownloadData(null);
    setError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative group mt-8 max-w-2xl mx-auto"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-200"></div>

      <div className="relative bg-gray-900 rounded-xl p-6 sm:p-8 border border-gray-800 text-white space-y-6">
        <div className="flex items-center gap-2 text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          <Upload className="w-6 h-6" />
          Upload Drawing
        </div>

        {error && (
          <div className="bg-red-900/40 text-red-300 border border-red-600 p-3 rounded-lg">
            {error}
          </div>
        )}

        {!downloadData ? (
          <>
            {/* File Input */}
            <div className="space-y-4">
              <label className="block text-sm text-gray-300">
                Choose PDF File
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    setFile(e.target.files[0]);
                    setError("");
                  }}
                  className="block w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg p-2 file:bg-blue-600 file:text-white file:border-0 file:py-1 file:px-3"
                />
              </label>

              {/* Drawing Type */}
              <label className="block text-sm text-gray-300">
                Drawing Type
                <select
                  value={drawingType}
                  onChange={(e) => setDrawingType(e.target.value)}
                  className="block w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                >
                  <option value="elevation">Elevation</option>
                  <option value="floorplan">Floor Plan</option>
                </select>
              </label>

              {/* Mode */}
              <label className="block text-sm text-gray-300">
                Accuracy Mode
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="block w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                >
                  <option value="fast">Fast (6×6 tiles)</option>
                  <option value="accurate">Accurate (10×10 tiles)</option>
                  <option value="windows_only">Windows Only</option>
                </select>
              </label>
            </div>

            {/* Upload Button */}
            <motion.button
              onClick={handleUpload}
              disabled={!file || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                loading
                  ? "bg-blue-700 cursor-wait"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
              }`}
            >
              {loading ? `Processing... ${progress}%` : "Analyze PDF"}
            </motion.button>

            {/* Progress Bar */}
            {loading && (
              <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden mt-2">
                <div
                  className="bg-blue-500 h-2.5 transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <h3 className="text-lg font-medium text-white mt-2">Analysis Complete!</h3>
              <p className="text-sm text-gray-400">
                {downloadData.type} - {downloadData.mode} mode
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={downloadData.url}
                download={downloadData.fileName}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Excel
              </a>

              <button
                onClick={handleNewUpload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Analyze Another
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
