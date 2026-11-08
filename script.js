// State variables
let currentStream = null;
let captureTimer = 3; // 3, 5, or 10
let layoutMode = 'strip4'; // 'strip4', 'grid2x2', 'single'
let capturedPhotos = []; // Array of Image objects
let isCapturing = false;

// Color presets for Website Theme
const siteThemes = {
  pink: '#fff5f7',
  purple: '#fbf5ff',
  mint: '#f0fdf4',
  cream: '#fffbeb',
  blue: '#f0f9ff',
  dark: '#0f172a'
};

// Initialize Lucide Icons & Webcam on Load
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initWebcam();
  updateFrameCustomization();
});

// Start Web Camera
async function initWebcam() {
  const video = document.getElementById('webcam');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
      audio: false
    });
    video.srcObject = stream;
    currentStream = stream;
  } catch (err) {
    console.error("Gagal membuka kamera:", err);
    alert("Tidak dapat mengakses kamera. Pastikan memberikan izin akses kamera.");
  }
}

// Set Timer
function setTimer(seconds) {
  if (isCapturing) return;
  captureTimer = seconds;
  [3, 5, 10].forEach(s => {
    const btn = document.getElementById(`btnTimer${s}`);
    if (s === seconds) {
      btn.className = "px-2.5 py-1 text-xs rounded-xl font-bold bg-pink-500 text-white shadow-sm transition-all";
    } else {
      btn.className = "px-2.5 py-1 text-xs rounded-xl font-bold bg-white text-slate-600 hover:bg-slate-100 transition-all";
    }
  });
}

// Set Layout Mode
function setLayout(mode) {
  if (isCapturing) return;
  layoutMode = mode;
  const btnStrip = document.getElementById('btnLayoutStrip4');
  const btnGrid = document.getElementById('btnLayoutGrid');
  const btnSingle = document.getElementById('btnLayoutSingle');

  btnStrip.className = mode === 'strip4' ? "px-2.5 py-1 text-xs rounded-xl font-bold bg-pink-500 text-white shadow-sm transition-all" : "px-2.5 py-1 text-xs rounded-xl font-bold bg-white text-slate-600 hover:bg-slate-100 transition-all";
  btnGrid.className = mode === 'grid2x2' ? "px-2.5 py-1 text-xs rounded-xl font-bold bg-pink-500 text-white shadow-sm transition-all" : "px-2.5 py-1 text-xs rounded-xl font-bold bg-white text-slate-600 hover:bg-slate-100 transition-all";
  btnSingle.className = mode === 'single' ? "px-2.5 py-1 text-xs rounded-xl font-bold bg-pink-500 text-white shadow-sm transition-all" : "px-2.5 py-1 text-xs rounded-xl font-bold bg-white text-slate-600 hover:bg-slate-100 transition-all";

  // If photos exist, re-render frame layout
  if (capturedPhotos.length > 0) {
    renderFrameCanvas();
  }
}

// Site Theme Change Functions
function setSiteTheme(themeName) {
  if (siteThemes[themeName]) {
    document.documentElement.style.setProperty('--app-bg', siteThemes[themeName]);
  }
}

function setCustomSiteTheme(colorHex) {
  document.documentElement.style.setProperty('--app-bg', colorHex);
}

// Preset Frame Applicator
function applyPreset(preset) {
  const bgInput = document.getElementById('frameBgColor');
  const textInput = document.getElementById('frameTextColor');
  const filterInput = document.getElementById('photoFilter');

  if (preset === 'pinkLove') {
    bgInput.value = '#ffd1dc';
    textInput.value = '#db2777';
    filterInput.value = 'soft';
  } else if (preset === 'y2k') {
    bgInput.value = '#e9d5ff';
    textInput.value = '#7e22ce';
    filterInput.value = 'vibrant';
  } else if (preset === 'minty') {
    bgInput.value = '#a7f3d0';
    textInput.value = '#047857';
    filterInput.value = 'none';
  } else if (preset === 'classic') {
    bgInput.value = '#ffffff';
    textInput.value = '#334155';
    filterInput.value = 'none';
  } else if (preset === 'darkMood') {
    bgInput.value = '#1e293b';
    textInput.value = '#f8fafc';
    filterInput.value = 'bw';
  } else if (preset === 'retro') {
    bgInput.value = '#fef3c7';
    textInput.value = '#92400e';
    filterInput.value = 'sepia';
  }

  updateFrameCustomization();
}

// Audio Sound Effects (Web Audio API synthesized beep & shutter sound)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

function playShutterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// Trigger Camera Flash Effect
function triggerFlash() {
  const flash = document.getElementById('flash');
  flash.classList.add('flash-active');
  playShutterSound();
  setTimeout(() => flash.classList.remove('flash-active'), 200);
}

// Capture Sequence Logic
async function startPhotoSequence() {
  if (isCapturing) return;
  isCapturing = true;
  capturedPhotos = [];
  
  const captureBtn = document.getElementById('captureBtn');
  const badge = document.getElementById('photoCounterBadge');
  captureBtn.disabled = true;
  captureBtn.classList.add('opacity-50');

  const totalPhotos = (layoutMode === 'strip4' || layoutMode === 'grid2x2') ? 4 : 1;
  badge.classList.remove('hidden');

  for (let i = 1; i <= totalPhotos; i++) {
    badge.innerText = `Foto ${i} / ${totalPhotos}`;
    await runCountdown(captureTimer);
    triggerFlash();
    captureSinglePhoto();
    await new Promise(r => setTimeout(r, 600)); // Delay between photos
  }

  badge.classList.add('hidden');
  isCapturing = false;
  captureBtn.disabled = false;
  captureBtn.classList.remove('opacity-50');

  // Trigger confetti celebration & enable download
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  document.getElementById('downloadBtn').disabled = false;

  // Render final output strip
  renderFrameCanvas();
}

// Countdown Async Function
function runCountdown(seconds) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('countdown');
    const numEl = document.getElementById('countdownNumber');
    overlay.classList.remove('hidden');
    let count = seconds;
    numEl.innerText = count;
    playBeep();

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.innerText = count;
        playBeep();
      } else {
        clearInterval(interval);
        overlay.classList.add('hidden');
        resolve();
      }
    }, 1000);
  });
}

// Grab frame from video stream (MIRRORED FLIPPED OUTPUT)
function captureSinglePhoto() {
  const video = document.getElementById('webcam');
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = video.videoWidth || 640;
  tempCanvas.height = video.videoHeight || 480;
  const ctx = tempCanvas.getContext('2d');

  // Mirror flip horizontally so output matches front-facing selfie
  ctx.translate(tempCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  const img = new Image();
  img.src = tempCanvas.toDataURL('image/png');
  capturedPhotos.push(img);
}

// Update text display hex & live redraw canvas
function updateFrameCustomization() {
  const bgVal = document.getElementById('frameBgColor').value;
  const textVal = document.getElementById('frameTextColor').value;
  document.getElementById('frameBgHex').innerText = bgVal;
  document.getElementById('frameTextHex').innerText = textVal;

  if (capturedPhotos.length > 0) {
    renderFrameCanvas();
  }
}

// Render Photos into Frame Canvas
function renderFrameCanvas() {
  if (capturedPhotos.length === 0) return;

  const canvas = document.getElementById('photoCanvas');
  const ctx = canvas.getContext('2d');

  const bgColor = document.getElementById('frameBgColor').value;
  const textColor = document.getElementById('frameTextColor').value;
  const filterStyle = document.getElementById('photoFilter').value;
  const footerText = document.getElementById('frameTextInput').value || 'by: shypix.id';

  // Ukuran slot foto agar proporsional (tidak gepeng)
  const slotW = 540;
  const slotH = 405; 
  const margin = 35;
  const headerSpace = 25;
  const footerSpace = 90;

  let canvasW, canvasH;

  if (layoutMode === 'strip4') {
    canvasW = slotW + (margin * 2);
    canvasH = headerSpace + (slotH * 4) + (margin * 5) + footerSpace;
  } else if (layoutMode === 'grid2x2') {
    canvasW = (slotW * 2) + (margin * 3);
    canvasH = headerSpace + (slotH * 2) + (margin * 3) + footerSpace;
  } else { // single
    canvasW = slotW + (margin * 2);
    canvasH = headerSpace + slotH + (margin * 2) + footerSpace;
  }

  canvas.width = canvasW;
  canvas.height = canvasH;

  // 1. Gambar Background Frame
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Gambar Foto dengan teknik cropping proporsional
  ctx.save();
  applyCanvasFilter(ctx, filterStyle);

  if (layoutMode === 'strip4') {
    for (let i = 0; i < 4; i++) {
      const img = capturedPhotos[i] || capturedPhotos[0];
      const y = headerSpace + margin + i * (slotH + margin);
      drawCoverImage(ctx, img, margin, y, slotW, slotH);
    }
  } else if (layoutMode === 'grid2x2') {
    const coords = [
      { x: margin, y: headerSpace + margin },
      { x: margin * 2 + slotW, y: headerSpace + margin },
      { x: margin, y: headerSpace + margin * 2 + slotH },
      { x: margin * 2 + slotW, y: headerSpace + margin * 2 + slotH }
    ];
    for (let i = 0; i < 4; i++) {
      const img = capturedPhotos[i] || capturedPhotos[0];
      drawCoverImage(ctx, img, coords[i].x, coords[i].y, slotW, slotH);
    }
  } else { // single
    const img = capturedPhotos[0];
    drawCoverImage(ctx, img, margin, headerSpace + margin, slotW, slotH);
  }
  ctx.restore();

  // 3. Gambar Teks Footer
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(footerText, canvasW / 2, canvasH - 35);

  // Update preview gambar
  const resultImg = document.getElementById('resultImage');
  resultImg.src = canvas.toDataURL('image/png');
}

// Fungsi bantu agar gambar pas di kotak tanpa gepeng (Object-fit: cover)
function drawCoverImage(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let renderW = w;
  let renderH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > targetRatio) {
    renderW = h * imgRatio;
    offsetX = (w - renderW) / 2;
  } else {
    renderH = w / imgRatio;
    offsetY = (h - renderH) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
  ctx.restore();
}

// Photo Filter Effect Canvas Applier
function applyCanvasFilter(ctx, filter) {
  if (filter === 'bw') {
    ctx.filter = 'grayscale(100%) contrast(110%)';
  } else if (filter === 'sepia') {
    ctx.filter = 'sepia(80%) warm(10%)';
  } else if (filter === 'soft') {
    ctx.filter = 'brightness(105%) contrast(95%) saturate(110%)';
  } else if (filter === 'warm') {
    ctx.filter = 'sepia(25%) brightness(105%) saturate(120%)';
  } else if (filter === 'vibrant') {
    ctx.filter = 'saturate(160%) contrast(105%)';
  } else {
    ctx.filter = 'none';
  }
}

// Download final image as PNG
function downloadPhoto() {
  const canvas = document.getElementById('photoCanvas');
  const link = document.createElement('a');
  link.download = `shypix-photobooth-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}