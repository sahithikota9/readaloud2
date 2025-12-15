// ✅ REQUIRED FOR PDF.js (THIS FIXES THE 404)
const pdfjsLib = window['pdfjs-dist/build/pdf'];

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// DOM
const input = document.getElementById("fileInput");
const display = document.getElementById("fileDisplay");
const pageInfo = document.getElementById("pageInfo");
const voiceInfo = document.getElementById("voiceInfo");

// PDF state
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;

// Speech
let words = [];
let currentWordIndex = 0;
let paused = false;

// ---------------- FILE UPLOAD ----------------
input.addEventListener("change", async (e) => {
  stopReading();
  display.innerHTML = "";

  const file = e.target.files[0];
  if (!file) return;

  if (file.type === "application/pdf") {
    loadPDF(file);
  } else {
    loadText(file);
  }
});

// ---------------- PDF ----------------
async function loadPDF(file) {
  const data = await file.arrayBuffer();
  pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  totalPages = pdfDoc.numPages;
  currentPage = 1;
  renderPage();
}

async function renderPage() {
  display.innerHTML = "";

  const page = await pdfDoc.getPage(currentPage);

  const containerWidth = display.clientWidth;
  const unscaled = page.getViewport({ scale: 1 });
  const scale = containerWidth / unscaled.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  display.appendChild(canvas);

  await page.render({ canvasContext: ctx, viewport }).promise;

  pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;
}

// ---------------- PAGE NAV ----------------
function nextPage() {
  if (!pdfDoc || currentPage >= totalPages) return;
  currentPage++;
  renderPage();
}

function prevPage() {
  if (!pdfDoc || currentPage <= 1) return;
  currentPage--;
  renderPage();
}

// ---------------- TEXT FILE ----------------
function loadText(file) {
  const reader = new FileReader();
  reader.onload = () => {
    display.innerText = reader.result;
    words = reader.result.split(/\s+/);
  };
  reader.readAsText(file);
}

// ---------------- VOICE ----------------
function getVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.name.includes("Samantha")) || voices[0];
}

function startReading() {
  if (!words.length) return;

  stopReading();
  paused = false;

  const voice = getVoice();
  voiceInfo.innerText = `🔊 Voice: ${voice.name}`;

  const text = words.join(" ");
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voice;
  utter.rate = 0.85;

  speechSynthesis.speak(utter);
}

function pauseReading() {
  paused = true;
  speechSynthesis.pause();
}

function resumeReading() {
  paused = false;
  speechSynthesis.resume();
}

function stopReading() {
  speechSynthesis.cancel();
}
