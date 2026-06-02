"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

interface MessageDetail {
  id: string;
  sender_email: string;
  recipient_email: string;
  emotion: string;
  risk: string;
  encryption: string;
  timestamp: string;
  is_read: boolean;
  created_at: string;
}

interface Attachment {
  filename: string;
  content_type: string;
  file_size: number;
}

export default function MessagePage() {
  const params = useParams();
  const messageId = params.id as string;

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [plaintext, setPlaintext] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMessage();
  }, [messageId]);

  const loadMessage = async () => {
    try {
      setIsLoading(true);
      // Get inbox to find the message
      const inbox = await api.getInbox(1, 100);
      const sent = await api.getSent(1, 100);
      const allMessages = [...inbox, ...sent];
      const msg = allMessages.find((m) => m.id === messageId);

      if (msg) {
        setMessage(msg);
        // Load attachments
        try {
          const atts = await api.getAttachments(messageId);
          setAttachments(atts);
        } catch (err) {
          console.log("No attachments or failed to load");
        }
      } else {
        setError("Message not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrypt = async () => {
    setIsDecrypting(true);
    setError("");
    try {
      const result = await api.decryptMessage(messageId);
      setPlaintext(result.plaintext);
      // Mark as read
      await api.markMessageRead(messageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt message");
    } finally {
      setIsDecrypting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading message...</div>;
  }

  if (!message) {
    return (
      <div>
        <p className="text-red-600">{error || "Message not found"}</p>
        <Link href="/inbox" className="text-blue-600 hover:underline">
          Back to Inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/inbox" className="text-blue-600 hover:underline mb-6 block">
        ← Back to Inbox
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <p className="text-sm text-gray-600">From: {message.sender_email}</p>
          <p className="text-sm text-gray-600">To: {message.recipient_email}</p>
          <p className="text-sm text-gray-600">
            Date: {new Date(message.timestamp).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Emotion</p>
            <p className="font-semibold text-purple-600">{message.emotion}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Risk Level</p>
            <p className="font-semibold text-red-600">{message.risk}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Encryption</p>
            <p className="font-semibold text-blue-600">{message.encryption}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!plaintext ? (
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50 mb-6"
          >
            {isDecrypting ? "Decrypting..." : "Decrypt Message"}
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
            <p className="text-gray-900 whitespace-pre-wrap">{plaintext}</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-800 mb-3">Attachments</h3>
            <div className="space-y-2">
              {attachments.map((att, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                  <span className="text-sm text-gray-700">
                    {att.filename} ({(att.file_size / 1024).toFixed(1)} KB)
                  </span>
                  <span className="text-xs text-gray-500">{att.content_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
