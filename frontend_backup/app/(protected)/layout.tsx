"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/inbox" className="font-bold text-xl text-blue-600">
                Emotion-Aware
              </Link>
              <div className="flex space-x-4">
                <Link
                  href="/inbox"
                  className="text-gray-600 hover:text-blue-600 font-semibold"
                >
                  Inbox
                </Link>
                <Link
                  href="/sent"
                  className="text-gray-600 hover:text-blue-600 font-semibold"
                >
                  Sent
                </Link>
                <Link
                  href="/compose"
                  className="text-gray-600 hover:text-blue-600 font-semibold"
                >
                  Compose
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-blue-600 font-semibold"
                >
                  Profile
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.email}</span>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
