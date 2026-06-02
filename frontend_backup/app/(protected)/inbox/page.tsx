"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

interface Message {
  id: string;
  sender_email: string;
  emotion: string;
  risk: string;
  encryption: string;
  timestamp: string;
  is_read: boolean;
  created_at: string;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      setIsLoading(true);
      const data = await api.getInbox();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Inbox</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No messages yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  From
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Emotion
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Encryption
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className={`border-t ${msg.is_read ? "" : "bg-blue-50"}`}
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {msg.sender_email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                      {msg.emotion}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {msg.encryption}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(msg.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/message/${msg.id}`}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Read
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
