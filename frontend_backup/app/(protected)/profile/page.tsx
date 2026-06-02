"use client";

import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getEmotionAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Account Created</p>
            <p className="font-semibold text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gmail Connected</p>
            <p className="font-semibold">
              {user.gmail_connected ? (
                <span className="text-green-600">✓ Connected</span>
              ) : (
                <span className="text-gray-500">Not Connected</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!isLoading && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Emotion Distribution
          </h2>
          {Object.keys(analytics).length === 0 ? (
            <p className="text-gray-500">No messages sent yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(analytics).map(([emotion, count]) => (
                <div key={emotion}>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700 font-semibold">{emotion}</span>
                    <span className="text-gray-600">{count} messages</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (count /
                            Math.max(...Object.values(analytics))) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
