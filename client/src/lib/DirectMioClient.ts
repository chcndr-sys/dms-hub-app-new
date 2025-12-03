/**
 * 👻 GHOSTBUSTER CLIENT - Direct Link to Hetzner Backend
 * Created: 2025-12-03 07:50
 * 
 * This is a completely NEW client to bypass all possible caching issues.
 * Uses a unique function name and file name to avoid any conflicts.
 */

export interface DirectMioMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface DirectMioResponse {
  messages: DirectMioMessage[];
  conversationId: string;
}

/**
 * Send message directly to Hetzner backend
 * NO PROXY, NO CACHE, NO TRICKS - DIRECT CONNECTION!
 */
export const sendDirectMessageToHetzner = async (
  message: string,
  conversationId: string | null
): Promise<DirectMioResponse> => {
  const URL = "https://orchestratore.mio-hub.me/api/mihub/orchestrator";
  
  const payload: any = {
    message: message,
    mode: "auto"
  };
  
  if (conversationId) {
    payload.conversationId = conversationId;
  }
  
  console.log("👻 GHOSTBUSTER: Chiamata partita verso", URL);
  console.log("👻 GHOSTBUSTER: Payload:", payload);
  
  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    console.log("👻 GHOSTBUSTER: Response status:", response.status);
    
    if (!response.ok) {
      const txt = await response.text();
      console.error("👻 GHOSTBUSTER HTTP ERROR:", response.status, txt);
      throw new Error(`HTTP Error ${response.status}`);
    }
    
    const data = await response.json();
    console.log("👻 GHOSTBUSTER: Response data:", data);
    
    // Parse response
    const messages: DirectMioMessage[] = [];
    const returnedConversationId = data.conversationId ?? conversationId ?? "";
    
    if (data.message || data.reply) {
      const assistantMessage = data.message || data.reply;
      messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantMessage,
        createdAt: new Date().toISOString(),
      });
    }
    
    console.log("👻 GHOSTBUSTER: SUCCESS! Returning", messages.length, "messages");
    
    return {
      messages,
      conversationId: returnedConversationId
    };
    
  } catch (e) {
    console.error("👻 GHOSTBUSTER NETWORK ERROR:", e);
    throw e;
  }
};
