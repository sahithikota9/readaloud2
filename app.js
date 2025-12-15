const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const input = document.getElementById("fileInput");
const viewer = document.getElementById("viewer");
const voiceInfo = document.getElementById("voiceInfo");

let sentenceElements = [];
let currentSentenceIndex = 0;
let speaking = false;

// ---------------- FILE UPLOAD ----------------
input.addEventListener("change", async (e) => {
  stopReading();
  viewer.innerHTML = "";
  sentenceElements = [];
  currentSentenceIndex = 0;

  const file = e.target.files[0];
  if (!file) return;

  if (file.type === "application/pdf") {
    renderPDF(file);
  } else if (file.type.startsWith("image")) {
    renderImage(file);
  } else if (file.name.endsWith(".docx")) {
    renderDocx(file);
  } else {
    renderText(file);
  }
});

// ---------------- PDF ----------------
async function renderPDF(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    viewer.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const text = await page.getTextContent();
    processText(text.items.map(i => i.str).join(" "));
  }
}

// ---------------- IMAGE ----------------
function renderImage(file) {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  viewer.appendChild(img);
}

// ---------------- DOCX ----------------
async function renderDocx(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  processText(result.value);
}

// ---------------- TEXT ----------------
function renderText(file) {
  const reader = new FileReader();
  reader.onload = () => processText(reader.result);
  reader.readAsText(file);
}

// ---------------- TEXT PROCESSING ----------------
function processText(text) {
  const sentences = text.split(/(?<=[\.\!\?])/);

  sentences.forEach(sentence => {
    if (!sentence.trim()) return;

    const sentenceSpan = document.createElement("span");
    sentenceSpan.className = "sentence";

    const words = sentence.split(/\s+/);
    words.forEach((word, index) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "word";
      wordSpan.textContent = word + " ";

      wordSpan.onclick = () => {
        stopReading();
        currentSentenceIndex = sentenceElements.indexOf(sentenceSpan);
        startReading();
      };

      sentenceSpan.appendChild(wordSpan);
    });

    viewer.appendChild(sentenceSpan);
    sentenceElements.push(sentenceSpan);
  });
}

// ---------------- VOICE ----------------
function getVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.name.includes("Samantha")) || voices[0];
}

function startReading() {
  if (!sentenceElements.length) return;

  speaking = true;
  const voice = getVoice();
  voiceInfo.innerText = `🔊 Voice: ${voice.name}`;

  speakNext();
}

function speakNext() {
  if (!speaking || currentSentenceIndex >= sentenceElements.length) return;

  const el = sentenceElements[currentSentenceIndex];
  highlight(el);

  const utter = new SpeechSynthesisUtterance(el.innerText);

  utter.voice = getVoice();
  utter.rate = 0.75;   // 🎧 audiobook-like speed
  utter.pitch = 1.0;

  utter.onend = () => {
    currentSentenceIndex++;
    speakNext();
  };

  speechSynthesis.speak(utter);
}

// ---------------- CONTROLS ----------------
function pauseReading() {
  speechSynthesis.pause();
}

function resumeReading() {
  speechSynthesis.resume();
}

function stopReading() {
  speechSynthesis.cancel();
  speaking = false;
  currentSentenceIndex = 0;
  clearHighlights();
}

// ---------------- HIGHLIGHT ----------------
function highlight(el) {
  clearHighlights();
  el.classList.add("highlight");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearHighlights() {
  document.querySelectorAll(".highlight")
    .forEach(e => e.classList.remove("highlight"));
}
