const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const input = document.getElementById("fileInput");
const viewer = document.getElementById("viewer");
const voiceInfo = document.getElementById("voiceInfo");

let sentences = [];
let currentSentence = 0;
let speaking = false;

// ---------------- FILE UPLOAD ----------------
input.addEventListener("change", async (e) => {
  stopReading();
  viewer.innerHTML = "";
  sentences = [];
  currentSentence = 0;

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
    collectText(text.items.map(i => i.str).join(" "));
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
  renderSentences(result.value);
}

// ---------------- TEXT ----------------
function renderText(file) {
  const reader = new FileReader();
  reader.onload = () => renderSentences(reader.result);
  reader.readAsText(file);
}

// ---------------- TEXT PROCESSING ----------------
function collectText(text) {
  const parts = text.split(/(?<=[\.\,\!\?])/);
  renderSentences(parts.join(" "));
}

function renderSentences(text) {
  const parts = text.split(/(?<=[\.\!\?])/);
  parts.forEach(s => {
    if (!s.trim()) return;
    const span = document.createElement("span");
    span.className = "sentence";
    span.textContent = s;
    viewer.appendChild(span);
    sentences.push(span);
  });
}

// ---------------- SPEECH ----------------
function getVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.name.includes("Samantha")) || voices[0];
}

function startReading() {
  if (!sentences.length) return;
  speaking = true;
  speakNext();
}

function speakNext() {
  if (!speaking || currentSentence >= sentences.length) return;

  const span = sentences[currentSentence];
  highlight(span);

  const utter = new SpeechSynthesisUtterance(span.textContent);
  utter.voice = getVoice();
  utter.rate = 0.9;

  utter.onend = () => {
    currentSentence++;
    speakNext();
  };

  speechSynthesis.speak(utter);
}

function pauseReading() {
  speechSynthesis.pause();
}

function resumeReading() {
  speechSynthesis.resume();
}

function stopReading() {
  speechSynthesis.cancel();
  speaking = false;
  currentSentence = 0;
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
