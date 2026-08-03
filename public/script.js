const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const resetButton = document.getElementById("reset-chat");
const sessionStorageKey = "travel-chat-session-id";

// Menyimpan seluruh riwayat percakapan
let conversationHistory = [];
let sessionId = sessionStorage.getItem(sessionStorageKey) || null;

chatBox.setAttribute("aria-live", "polite");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = input.value.trim();

  if (!userMessage) return;

  // Tampilkan pesan user
  appendMessage("user", userMessage);

  input.value = "";

  // Simpan ke history
  conversationHistory.push({
    role: "user",
    text: userMessage,
  });

  // Placeholder
  const thinkingElement = appendMessage("bot", "Thinking...");

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        sessionId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Server Error");
    }

    if (data.reply) {
      thinkingElement.textContent = data.reply;

      if (data.sessionId) {
        sessionId = data.sessionId;
        sessionStorage.setItem(sessionStorageKey, sessionId);
      }

      // Simpan jawaban AI agar context tetap ada
      conversationHistory.push({
        role: "model",
        text: data.reply,
      });
    } else {
      thinkingElement.textContent = "No response.";
    }
  } catch (err) {
    console.error(err);
    thinkingElement.textContent = "Failed to connect to server.";
  }
});

resetButton?.addEventListener("click", () => {
  conversationHistory = [];
  sessionId = null;
  sessionStorage.removeItem(sessionStorageKey);
  chatBox.innerHTML = "";
  input.focus();
});

function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;

  const wrapper = document.createElement("div");
  wrapper.style.clear = "both";

  chatBox.appendChild(msg);
  chatBox.appendChild(wrapper);

  chatBox.scrollTop = chatBox.scrollHeight;

  return msg;
}
