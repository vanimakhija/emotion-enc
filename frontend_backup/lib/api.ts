/**
 * API Client Service
 * Communicates with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem("access_token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ───── AUTH ─────

  async register(email: string, password: string): Promise<any> {
    return this.request("/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<{ access_token: string }> {
    return this.request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile(): Promise<any> {
    return this.request("/me");
  }

  // ───── MESSAGES ─────

  async sendMessage(recipient: string, message: string): Promise<any> {
    return this.request("/send", {
      method: "POST",
      body: JSON.stringify({ recipient, message }),
    });
  }

  async sendMessageWithAttachments(
    recipient: string,
    message: string,
    files: File[]
  ): Promise<any> {
    const formData = new FormData();
    formData.append("recipient", recipient);
    formData.append("message", message);
    files.forEach((file) => formData.append("files", file));

    const token = localStorage.getItem("access_token");
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/send-with-attachments`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getInbox(page: number = 1, limit: number = 20): Promise<any[]> {
    return this.request(`/inbox?page=${page}&limit=${limit}`);
  }

  async getSent(page: number = 1, limit: number = 20): Promise<any[]> {
    return this.request(`/sent?page=${page}&limit=${limit}`);
  }

  async decryptMessage(messageId: string): Promise<{ plaintext: string }> {
    return this.request("/decrypt", {
      method: "POST",
      body: JSON.stringify({ message_id: messageId }),
    });
  }

  async markMessageRead(messageId: string): Promise<any> {
    return this.request(`/messages/${messageId}/read`, {
      method: "PATCH",
    });
  }

  async getAttachments(messageId: string): Promise<any[]> {
    return this.request(`/messages/${messageId}/attachments`);
  }

  // ───── ANALYSIS ─────

  async analyzeMessage(message: string): Promise<any> {
    return this.request("/analyze", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async getEmotionAnalytics(): Promise<Record<string, number>> {
    return this.request("/analytics/emotions");
  }

  // ───── GMAIL ─────

  async getGmailInbox(): Promise<any> {
    return this.request("/gmail/inbox");
  }
}

export const api = new ApiClient();
