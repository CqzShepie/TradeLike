const BASE_URL = "http://localhost:5001/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? "GET";
  const fullUrl = `${BASE_URL}${url}`;

  console.log(`➡️ ${method} ${fullUrl}`);

  const res = await fetch(fullUrl, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  console.log(`⬅️ ${method} ${fullUrl} - ${res.status}`);

  if (!res.ok) {
    const errorText = await res.text();

    console.error("❌ API Error");
    console.error("URL:", fullUrl);
    console.error("Method:", method);
    console.error("Status:", res.status);
    console.error("Response:", errorText);

    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();

  console.log("✅ Response:", data);

  return data as T;
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),

  post: <T>(url: string, body: unknown) =>
    request<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(url: string, body: unknown) =>
    request<T>(url, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T>(url: string) =>
    request<T>(url, {
      method: "DELETE",
    }),
};