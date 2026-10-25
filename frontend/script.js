document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements - Sidebar & Upload
    const dropZone = document.querySelector("#drop-zone");
    const fileInput = document.querySelector("#pdf-file-input");
    const stagedFilesList = document.querySelector("#staged-files");
    const indexBtn = document.querySelector("#index-btn");
    const processingPipeline = document.querySelector("#processing-pipeline");
    const progressBar = document.querySelector("#pipeline-progress-bar");
    const statusBanner = document.querySelector("#status-banner");

    // DOM Elements - Active Document Section
    const activeDocCard = document.querySelector("#active-doc-card");
    const clearIndexBtn = document.querySelector("#clear-index-btn");

    // DOM Elements - Header & Status
    const liveStatusDot = document.querySelector("#live-status-dot");
    const liveStatusText = document.querySelector("#live-status-text");
    const resetChatBtn = document.querySelector("#reset-chat-btn");

    // DOM Elements - Chat
    const chatForm = document.querySelector("#chat-form");
    const queryInput = document.querySelector("#user-query");
    const sendBtn = document.querySelector("#send-btn");
    const messagesContainer = document.querySelector("#messages-container");

    let currentFiles = [];

    // -------------------------------------------------------------------------
    // 1. Initial State & Live Status Polling
    // -------------------------------------------------------------------------
    async function checkIndexStatus() {
        try {
            const res = await fetch("/status");
            if (!res.ok) throw new Error("Status check failed");
            const data = await res.json();

            updateLiveStatusUI(data);
        } catch (err) {
            setLiveStatus("error", "Backend Offline");
        }
    }

    function setLiveStatus(type, message) {
        liveStatusDot.className = "status-dot";
        if (type === "ready") {
            liveStatusDot.classList.add("dot-ready");
        } else if (type === "busy") {
            liveStatusDot.classList.add("dot-busy");
        } else if (type === "idle") {
            liveStatusDot.classList.add("dot-idle");
        } else {
            liveStatusDot.classList.add("dot-error");
        }
        liveStatusText.innerText = message;
    }

    function updateLiveStatusUI(data) {
        if (data.is_indexed && data.files.length > 0) {
            const fileLabel = data.files.length === 1 ? data.files[0] : `${data.files.length} PDFs`;
            setLiveStatus("ready", `Ready • ${fileLabel}`);
            renderActiveDocumentCard(data.files, data.total_chunks);
            clearIndexBtn.classList.remove("hidden");
        } else {
            setLiveStatus("idle", "No Document Indexed");
            renderEmptyActiveDocumentCard();
            clearIndexBtn.classList.add("hidden");
        }
    }

    function renderActiveDocumentCard(files, totalChunks) {
        const fileListHtml = files.map(name => `
            <div class="doc-main-row">
                <div class="pdf-icon-wrapper">PDF</div>
                <div class="doc-details">
                    <span class="doc-filename" title="${name}">${name}</span>
                    <span class="doc-meta-stats">${totalChunks} indexed chunks</span>
                </div>
            </div>
        `).join("");

        activeDocCard.className = "active-doc-card-filled";
        activeDocCard.innerHTML = `
            <div class="doc-badge-row">
                <span class="doc-status-badge">
                    <span class="doc-pulse"></span> Active in Context
                </span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${files.length} file(s)</span>
            </div>
            ${fileListHtml}
        `;
    }

    function renderEmptyActiveDocumentCard() {
        activeDocCard.className = "active-doc-empty";
        activeDocCard.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>No document loaded. Upload a PDF from above to start chatting.</span>
        `;
    }

    // Initial check on load
    checkIndexStatus();

    // -------------------------------------------------------------------------
    // 2. Drag & Drop and File Selection Handlers
    // -------------------------------------------------------------------------
    dropZone.addEventListener("click", () => fileInput.click());

    ["dragenter", "dragover"].forEach(evtName => {
        dropZone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(evtName => {
        dropZone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("dragover");
        });
    });

    dropZone.addEventListener("drop", (e) => {
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
        if (files.length === 0) {
            showStatusBanner("error", "Please drop valid .pdf file(s).");
            return;
        }
        handleSelectedFiles(files);
    });

    fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files);
        if (files.length > 0) {
            handleSelectedFiles(files);
        }
    });

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        const kb = bytes / 1024;
        if (kb < 1024) return kb.toFixed(1) + " KB";
        return (kb / 1024).toFixed(1) + " MB";
    }

    function handleSelectedFiles(files) {
        currentFiles = files;
        stagedFilesList.innerHTML = "";

        if (files.length === 0) {
            stagedFilesList.classList.add("hidden");
            indexBtn.disabled = true;
            return;
        }

        stagedFilesList.classList.remove("hidden");
        files.forEach((file) => {
            const item = document.createElement("div");
            item.className = "staged-file-item";
            item.innerHTML = `
                <div class="file-info-group">
                    <span style="color: #ef4444; font-weight: 700; font-size: 0.72rem;">PDF</span>
                    <span class="file-name-text" title="${file.name}">${file.name}</span>
                </div>
                <span class="file-size-tag">${formatFileSize(file.size)}</span>
            `;
            stagedFilesList.appendChild(item);
        });

        indexBtn.disabled = false;
        statusBanner.classList.add("hidden");
    }

    // -------------------------------------------------------------------------
    // 3. Document Processing Pipeline Animation & Upload
    // -------------------------------------------------------------------------
    function resetPipelineUI() {
        const steps = ["step-upload", "step-chunk", "step-embed", "step-rerank"];
        steps.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.className = "step-item";
        });
        progressBar.style.width = "10%";
    }

    function setStepState(stepId, state) {
        const el = document.getElementById(stepId);
        if (!el) return;
        el.className = `step-item ${state}`;
    }

    indexBtn.addEventListener("click", async () => {
        if (!currentFiles || currentFiles.length === 0) {
            showStatusBanner("error", "Please select at least one PDF file first.");
            return;
        }

        // Lock button & start animation
        indexBtn.disabled = true;
        statusBanner.classList.add("hidden");
        processingPipeline.classList.remove("hidden");
        resetPipelineUI();
        setLiveStatus("busy", "Indexing in Progress...");

        // Step 1: Uploading
        setStepState("step-upload", "active");
        progressBar.style.width = "25%";

        const formData = new FormData();
        for (let i = 0; i < currentFiles.length; i++) {
            formData.append("files", currentFiles[i]);
        }

        // Simulated progressive visual steps while server processes
        const stepTimer1 = setTimeout(() => {
            setStepState("step-upload", "completed");
            setStepState("step-chunk", "active");
            progressBar.style.width = "50%";
        }, 600);

        const stepTimer2 = setTimeout(() => {
            setStepState("step-chunk", "completed");
            setStepState("step-embed", "active");
            progressBar.style.width = "75%";
        }, 1500);

        try {
            const res = await fetch("/upload", {
                method: "POST",
                body: formData
            });

            clearTimeout(stepTimer1);
            clearTimeout(stepTimer2);

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Upload failed");
            }

            // Step 3 & 4: Completed
            setStepState("step-upload", "completed");
            setStepState("step-chunk", "completed");
            setStepState("step-embed", "completed");
            setStepState("step-rerank", "active");
            progressBar.style.width = "90%";

            setTimeout(() => {
                setStepState("step-rerank", "completed");
                progressBar.style.width = "100%";

                setTimeout(() => {
                    processingPipeline.classList.add("hidden");
                    showStatusBanner("success", `Success! Indexed ${data.total_files} file(s) into ${data.total_chunks} chunks.`);
                    checkIndexStatus();

                    // Clear staged input
                    currentFiles = [];
                    stagedFilesList.innerHTML = "";
                    stagedFilesList.classList.add("hidden");
                    fileInput.value = "";
                }, 700);
            }, 600);

        } catch (error) {
            clearTimeout(stepTimer1);
            clearTimeout(stepTimer2);
            processingPipeline.classList.add("hidden");
            showStatusBanner("error", error.message || "Failed to process and index PDF documents.");
            setLiveStatus("error", "Indexing Failed");
        } finally {
            indexBtn.disabled = false;
        }
    });

    function showStatusBanner(type, message) {
        statusBanner.className = `status-banner ${type}`;
        statusBanner.innerText = message;
        statusBanner.classList.remove("hidden");
    }

    // Clear Index Handler
    clearIndexBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to clear the active index and remove loaded documents?")) {
            return;
        }

        try {
            const res = await fetch("/clear", { method: "POST" });
            if (res.ok) {
                checkIndexStatus();
                showStatusBanner("info", "Active document index cleared.");
            }
        } catch (err) {
            alert("Failed to clear index.");
        }
    });

    // -------------------------------------------------------------------------
    // 4. Chat Query & Real-Time SSE Token Streaming
    // -------------------------------------------------------------------------
    function appendMessage(sender, initialText = "", isThinking = false) {
        const group = document.createElement("div");
        group.className = `message-group ${sender}`;

        const avatar = document.createElement("div");
        avatar.className = `avatar ${sender === "user" ? "avatar-user" : "avatar-bot"}`;
        avatar.innerHTML = sender === "user"
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`;

        const content = document.createElement("div");
        content.className = "message-content";

        const meta = document.createElement("div");
        meta.className = "message-meta";
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        meta.innerHTML = `<span class="sender-name">${sender === "user" ? "You" : "InsightPDF Assistant"}</span><span class="message-time">${timeStr}</span>`;

        const bubble = document.createElement("div");
        bubble.className = "bubble";

        if (isThinking) {
            bubble.innerHTML = `
                <div class="thinking-widget">
                    <div class="thinking-dots"><span></span><span></span><span></span></div>
                    <span class="thinking-text">Searching indexed document & formulating response...</span>
                </div>
            `;
        } else if (initialText) {
            bubble.innerText = initialText;
        }

        content.appendChild(meta);
        content.appendChild(bubble);
        group.appendChild(avatar);
        group.appendChild(content);

        messagesContainer.appendChild(group);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return { group, bubble, content };
    }

    async function sendQuery(query) {
        query = query.trim();
        if (!query) return;

        // Render user query
        appendMessage("user", query);
        queryInput.value = "";
        queryInput.style.height = "auto";
        sendBtn.disabled = true;

        // Set status to generating
        setLiveStatus("busy", "Generating Response...");

        // Render assistant bubble with THINKING animation
        const { group, bubble, content } = appendMessage("assistant", "", true);
        let retrievedSources = [];

        try {
            const response = await fetch("/chat-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server returned error ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let hasReceivedFirstToken = false;
            let fullAnswer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;

                    const rawJson = trimmed.replace("data:", "").trim();
                    try {
                        const parsed = JSON.parse(rawJson);

                        if (parsed.error) {
                            bubble.innerHTML = `<p style="color: #f87171;">${parsed.error}</p>`;
                            return;
                        }

                        if (parsed.sources && Array.isArray(parsed.sources)) {
                            retrievedSources = parsed.sources;
                            continue;
                        }

                        if (parsed.status === "thinking") {
                            const thinkingText = bubble.querySelector(".thinking-text");
                            if (thinkingText && parsed.message) {
                                thinkingText.innerText = parsed.message;
                            }
                            continue;
                        }

                        if (parsed.token) {
                            if (!hasReceivedFirstToken) {
                                // Transition from thinking widget to streaming text
                                hasReceivedFirstToken = true;
                                bubble.innerHTML = "";
                                bubble.classList.add("streaming-cursor");
                            }

                            fullAnswer += parsed.token;
                            bubble.innerText = fullAnswer;
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }

                        if (parsed.done) {
                            break;
                        }

                    } catch (parseErr) {
                        console.error("SSE parse error:", parseErr, rawJson);
                    }
                }
            }

            // Streaming finished
            bubble.classList.remove("streaming-cursor");

            // Add copy button
            if (fullAnswer.trim().length > 0) {
                const actionsRow = document.createElement("div");
                actionsRow.className = "bubble-actions";
                actionsRow.innerHTML = `
                    <button type="button" class="copy-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copy</span>
                    </button>
                `;
                actionsRow.querySelector(".copy-btn").addEventListener("click", () => {
                    navigator.clipboard.writeText(fullAnswer);
                    const span = actionsRow.querySelector(".copy-btn span");
                    span.innerText = "Copied!";
                    setTimeout(() => { span.innerText = "Copy"; }, 2000);
                });
                bubble.appendChild(actionsRow);
            }

            if (retrievedSources && retrievedSources.length > 0) {
                renderRetrievedSources(content, retrievedSources);
            }

        } catch (error) {
            bubble.innerHTML = `<p style="color: #f87171;">Error: ${error.message || "Failed to communicate with the server."}</p>`;
        } finally {
            bubble.classList.remove("streaming-cursor");
            sendBtn.disabled = false;
            checkIndexStatus();
        }
    }

    // Submit form handler
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        sendQuery(queryInput.value);
    });

    // Auto-expand textarea and enter-to-send
    queryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendQuery(queryInput.value);
        }
    });

    queryInput.addEventListener("input", () => {
        queryInput.style.height = "auto";
        queryInput.style.height = Math.min(queryInput.scrollHeight, 140) + "px";
    });

    // Reset Chat Viewport
    resetChatBtn.addEventListener("click", () => {
        if (!confirm("Clear current conversation history?")) return;
        messagesContainer.innerHTML = `
            <div class="message-group assistant">
                <div class="avatar avatar-bot">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
                </div>
                <div class="message-content">
                    <div class="message-meta"><span class="sender-name">InsightPDF Assistant</span><span class="message-time">System</span></div>
                    <div class="bubble"><p>Conversation cleared. Ask any new question about your indexed documents.</p></div>
                </div>
            </div>
        `;
    });

    function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.innerText = text;
        return div.innerHTML;
    }

    function renderRetrievedSources(contentDiv, sources) {
        if (!sources || sources.length === 0) return;

        const sourcesWrapper = document.createElement("div");
        sourcesWrapper.className = "retrieved-sources-wrapper";

        const header = document.createElement("div");
        header.className = "sources-accordion-header";
        header.innerHTML = `
            <div class="sources-title-group">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span class="sources-count">${sources.length} Retrieved Context Chunks</span>
                <span class="reranked-badge">Cross-Encoder Reranked</span>
            </div>
            <button type="button" class="sources-toggle-btn">
                <span>View Sources</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-icon">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
        `;

        const body = document.createElement("div");
        body.className = "sources-accordion-body hidden";

        sources.forEach(src => {
            const card = document.createElement("div");
            card.className = "source-chunk-card";

            const pageLabel = src.page ? `<span class="chunk-page">Page ${src.page}</span>` : "";

            card.innerHTML = `
                <div class="chunk-card-meta">
                    <div class="chunk-meta-left">
                        <span class="chunk-rank-badge">#${src.rank}</span>
                        <span class="chunk-filename" title="${escapeHtml(src.filename)}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            ${escapeHtml(src.filename)}
                        </span>
                        ${pageLabel}
                    </div>
                </div>
                <div class="chunk-card-snippet">${escapeHtml(src.content)}</div>
            `;
            body.appendChild(card);
        });

        const toggleBtn = header.querySelector(".sources-toggle-btn");
        toggleBtn.addEventListener("click", () => {
            const isHidden = body.classList.contains("hidden");
            if (isHidden) {
                body.classList.remove("hidden");
                toggleBtn.querySelector("span").innerText = "Hide Sources";
                toggleBtn.querySelector(".chevron-icon").style.transform = "rotate(180deg)";
            } else {
                body.classList.add("hidden");
                toggleBtn.querySelector("span").innerText = "View Sources";
                toggleBtn.querySelector(".chevron-icon").style.transform = "rotate(0deg)";
            }
        });

        sourcesWrapper.appendChild(header);
        sourcesWrapper.appendChild(body);
        contentDiv.appendChild(sourcesWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});
