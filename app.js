// ---------- PDF.js worker ----------
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ---------- DOM elements ----------
const fileInput = document.getElementById("fileInput");
const fileDisplay = document.getElementById("fileDisplay");
const voiceInfo = document.getElementById("voiceInfo");
const pageInfo = document.getElementById("pageInfo");

let words = [];
let currentWordIndex = 0;
let utteranceQueue = [];
let paused = false;

// PDF state
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let autoContinue = true; // read across pages

// ---------- VOICE SETUP ----------
function getBestVoice() {
  const voices = speechSynthesis.getVoices();
  const preferred = ["Samantha", "Daniel", "Karen"];
  for (let name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices[0];
}

function showVoiceInfo(voice) {
  voiceInfo.innerText = voice
    ? `🔊 Using voice: ${voice.name}`
    : `⚠️ No voice found`;
}

// ---------- FILE HANDLING ----------
fileInput.addEventListener("change", handleFile);

function handleFile(e) {
  stopReading();
  fileDisplay.innerHTML = "";
  words = [];
  currentPage = 1;

  const file = e.target.files[0];
  if (!file) return;

  if (file.type === "application/pdf") {
    loadPDF(file);
  } else {
    readTextFile(file);
  }
}

// ---------- PDF LOAD ----------
async function loadPDF(file) {
  const data = await file.arrayBuffer();
  pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  totalPages = pdfDoc.numPages;
  renderPDFPage(currentPage);
}

// ---------- PDF PAGE RENDER ----------
async function renderPDFPage(pageNumber) {
  stopReading(false); // keep currentWordIndex for autoContinue
  fileDisplay.innerHTML = "";
  words = [];
  currentWordIndex = 0;

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.1 });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  fileDisplay.appendChild(canvas);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const textContent = await page.getTextContent();
  const pageText = textContent.items.map(i => i.str).join(" ");
  createWordLayer(pageText);

  pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;

  if (autoContinue) startReading();
}

// ---------- PAGE NAVIGATION ----------
function nextPage() {
  if (!pdfDoc || currentPage >= totalPages) return;
  currentPage++;
  renderPDFPage(currentPage);
}

function prevPage() {
  if (!pdfDoc || currentPage <= 1) return;
  currentPage--;
  renderPDFPage(currentPage);
}

// ---------- TEXT FILES ----------
function readTextFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    createWordLayer(reader.result);
    pageInfo.innerText = "Text File";
  };
  reader.readAsText(file);
}

// ---------- WORD LAYER ----------
function createWordLayer(text) {
  fileDisplay.innerHTML += "<div id='textLayer'></div>";
  const layer = document.getElementById("textLayer");

  words = text.split(/\s+/);

  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "word";
    span.innerText = word + " ";
    span.onclick = () => {
      stopReading();
      currentWordIndex = i;
      startReading();
    };
    layer.appendChild(span);
  });
}

// ---------- SPEECH ----------
function startReading() {
  stopReading(false);
  paused = false;

  const voice = getBestVoice();
  showVoiceInfo(voice);

  utteranceQueue = [];

  for (let i = currentWordIndex; i < words.length; i += 6) {
    const chunk = words.slice(i, i + 6).join(" ");

    const u = new SpeechSynthesisUtterance(chunk);
    u.voice = voice;
    u.rate = 0.85;
    u.pitch = 1.0;

    u.onstart = () => highlightWords(i, i + 6);
    u.onend = () => {
      currentWordIndex = i + 6;
      if (currentWordIndex >= words.length && pdfDoc && currentPage < totalPages) {
        currentPage++;
        renderPDFPage(currentPage);
      }
    };

    utteranceQueue.push(u);
  }

  speakNext();
}

function speakNext() {
  if (paused || utteranceQueue.length === 0) return;
  speechSynthesis.speak(utteranceQueue.shift());
  setTimeout(speakNext, 200);
}

// ---------- CONTROLS ----------
function pauseReading() {
  paused = true;
  speechSynthesis.pause();
}

function resumeReading() {
  paused = false;
  speechSynthesis.resume();
}

function stopReading(resetIndex = true) {
  speechSynthesis.cancel();
  utteranceQueue = [];
  if (resetIndex) currentWordIndex = 0;
  clearHighlights();
}

// ---------- HIGHLIGHTING ----------
function highlightWords(start, end) {
  clearHighlights();
  const spans = document.querySelectorAll(".word");

  for (let i = start; i < end && i < spans.length; i++) {
    spans[i].classList.add("highlight");
    spans[i].scrollIntoView({ block: "center" });
  }
}

function clearHighlights() {
  document.querySelectorAll(".highlight")
    .forEach(el => el.classList.remove("highlight"));
}