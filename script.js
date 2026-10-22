
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const chatArea = document.getElementById("chatArea");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const voiceToggle = document.getElementById("voiceToggle");
const voiceToggleText = document.getElementById("voiceToggleText");
const newChatBtn = document.getElementById("newChat");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");

let history = [];
let isLoading = false;
let voiceEnabled = false;
let recognition = null;
let listening = false;
let speechLanguage = "en-US";
let toastTimer;

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function scrollToBottom() {
    if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

function createMessage(role, text) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "You" : "✦";

    const content = document.createElement("div");
    content.className = "message-content";

    // textContent keeps message text safe from HTML injection.
    content.textContent = text;

    wrapper.append(avatar, content);

    if (role === "assistant") {
        const actions = document.createElement("div");
        actions.className = "message-actions";

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.textContent = "Copy";
        copyBtn.setAttribute("aria-label", "Copy AI reply");

        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(text);
                showToast("Reply copied!");
            } catch {
                showToast("Copy nahi hua. Text select karke copy karo.");
            }
        });

        const speakBtn = document.createElement("button");
        speakBtn.type = "button";
        speakBtn.textContent = "🔊 Speak";
        speakBtn.setAttribute("aria-label", "Speak AI reply");

        speakBtn.addEventListener("click", () => {
            speakText(text);
        });

        actions.append(copyBtn, speakBtn);
        wrapper.appendChild(actions);
    }

    messages.appendChild(wrapper);
    scrollToBottom();

    return wrapper;
}

function showTyping() {
    const typing = document.createElement("div");
    typing.className = "message assistant typing-message";
    typing.id = "typingIndicator";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✦";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = "Apna AI is thinking...";

    typing.append(avatar, content);
    messages.appendChild(typing);
    scrollToBottom();
}

function hideTyping() {
    document.getElementById("typingIndicator")?.remove();
}

function speakText(text) {
    if (!("speechSynthesis" in window)) {
        showToast("Is browser mein voice replies supported nahi hain.");
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0600-\u06FF]/.test(text)
        ? "ur-PK"
        : speechLanguage;

    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();

    const matchingVoice = voices.find(voice =>
        utterance.lang === "ur-PK"
            ? voice.lang.toLowerCase().startsWith("ur")
            : voice.lang.toLowerCase().startsWith("en")
    );

    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
}

async function sendMessage(rawText) {
    const message = rawText.trim();

    if (!message || isLoading) return;

    if (welcome) welcome.style.display = "none";

    createMessage("user", message);
    messageInput.value = "";
    messageInput.style.height = "auto";

    isLoading = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;

    showTyping();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message,
                history: history.slice(-20)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "AI server se response nahi mila.");
        }

        const reply = data.reply;

        if (typeof reply !== "string" || !reply.trim()) {
            throw new Error("AI ne empty response diya. Dobara try karo.");
        }

        history.push(
            { role: "user", text: message },
            { role: "model", text: reply }
        );

        createMessage("assistant", reply);

        if (voiceEnabled) {
            speakText(reply);
        }
    } catch (error) {
        console.error("Apna AI error:", error);
        createMessage(
            "assistant",
            `Maaf karna bhai, response nahi mila. ${error.message || "Server check karo."}`
        );
    } finally {
        hideTyping();
        isLoading = false;
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
        scrollToBottom();
    }
}

chatForm?.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(messageInput.value);
});

messageInput?.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 160) + "px";
});

messageInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

document.querySelectorAll(".suggestion-card").forEach(card => {
    card.addEventListener("click", () => {
        const prompt = card.dataset.prompt;

        if (prompt) {
            messageInput.value = prompt;
            sendMessage(prompt);
        }
    });
});

voiceToggle?.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;

    voiceToggle.setAttribute("aria-pressed", String(voiceEnabled));

    if (voiceToggleText) {
        voiceToggleText.textContent = voiceEnabled ? "Voice On" : "Voice Off";
    }

    voiceToggle.classList.toggle("active", voiceEnabled);

    if (!voiceEnabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    showToast(
        voiceEnabled
            ? "Voice replies on ho gaye!"
            : "Voice replies off ho gaye."
    );
});

function setupSpeechRecognition() {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast("Microphone ke liye Chrome browser use karo.");
        return null;
    }

    const speech = new SpeechRecognition();
    speech.lang = speechLanguage;
    speech.continuous = false;
    speech.interimResults = true;
    speech.maxAlternatives = 1;

    speech.onstart = () => {
        listening = true;
        micBtn.classList.add("listening");
        micBtn.setAttribute("aria-label", "Stop recording");
        showToast(
            `Listening: ${speechLanguage === "ur-PK" ? "Urdu" : "English"}`
        );
    };

    speech.onresult = event => {
        let transcript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        messageInput.value = transcript;
        messageInput.dispatchEvent(new Event("input"));
    };

    speech.onerror = event => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
            showToast("Mic error: " + event.error);
        }
    };

    speech.onend = () => {
        listening = false;
        micBtn.classList.remove("listening");
        micBtn.setAttribute("aria-label", "Record voice");
    };

    return speech;
}

micBtn?.addEventListener("click", () => {
    if (listening && recognition) {
        recognition.stop();
        return;
    }

    // Har click par language change karne ke liye mic par right-click
    // ki zaroorat nahi: normal click English aur Urdu alternate karta hai.
    speechLanguage = speechLanguage === "en-US" ? "ur-PK" : "en-US";

    recognition = setupSpeechRecognition();

    if (recognition) {
        try {
            recognition.start();
        } catch {
            showToast("Mic dobara start karne se pehle ek second wait karo.");
        }
    }
});

newChatBtn?.addEventListener("click", () => {
    history = [];
    messages.replaceChildren();

    if (welcome) welcome.style.display = "";

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    messageInput.value = "";
    messageInput.style.height = "auto";

    sidebar?.classList.remove("open");
    showToast("New chat shuru ho gayi!");
});

menuBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
});

closeSidebarBtn?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
});

document.addEventListener("click", event => {
    if (
        window.innerWidth <= 768 &&
        sidebar?.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menuBtn?.contains(event.target)
    ) {
        sidebar.classList.remove("open");
    }
});

console.log("Apna AI 2.0 JavaScript loaded successfully!");
