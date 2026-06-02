"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface AnalysisResult {
  emotion: string;
  risk: string;
  encryption: string;
}

export default function ComposePage() {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!message.trim()) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await api.analyzeMessage(message);
      setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!recipient.trim() || !message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      if (files.length > 0) {
        await api.sendMessageWithAttachments(recipient, message, files);
      } else {
        await api.sendMessage(recipient, message);
      }
      router.push("/sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Compose Message</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Recipient Email
          </label>
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              // Debounce analysis
              setTimeout(() => handleAnalyze(), 300);
            }}
            required
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Sentiment Analysis</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Emotion</p>
                <p className="font-semibold text-purple-600">{analysis.emotion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <p className="font-semibold text-red-600">{analysis.risk}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Encryption</p>
                <p className="font-semibold text-blue-600">{analysis.encryption}</p>
              </div>
            </div>
          </div>
        )}

        {/* File Attachments */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Attachments (Optional)
          </label>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition disabled:opacity-50"
            >
              Add Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAddFile}
              className="hidden"
              disabled={isLoading}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-100 p-2 rounded"
                >
                  <span className="text-sm text-gray-700">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="text-red-600 hover:text-red-800 font-semibold"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
