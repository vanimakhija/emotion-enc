"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/inbox");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Emotion-Aware
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Send encrypted messages with sentiment-based security
        </p>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded text-center transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded text-center transition"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded text-sm text-gray-700">
          <p className="font-semibold mb-2">Features:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sentiment-based encryption strength</li>
            <li>Google OAuth integration</li>
            <li>File attachments support</li>
            <li>Email notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
