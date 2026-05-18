// app.js - Subtitle Converter App

const PRO_SECRET = 'SUBTITLE-CONVERTER-PRO-2024'.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
const MAX_FREE_ENTRIES = 10;
let isPro = false;
let currentData = null;
let currentFilename = 'subtitles';

document.addEventListener('DOMContentLoaded', () => {

  // ─── DOM refs ──────────────────────────────────────────
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadCard = document.getElementById('upload-card');
  const resultsCard = document.getElementById('results-card');
  const entryList = document.getElementById('entry-list');
  const fileInfo = document.getElementById('file-info');
  const detailCount = document.getElementById('detail-count');
  const freeHint = document.getElementById('free-hint');
  const proModal = document.getElementById('pro-modal');
  const proKeyInput = document.getElementById('pro-key-input');
  const btnActivate = document.getElementById('btn-activate');
  const btnShowPro = document.getElementById('btn-show-pro');
  const btnShowPro2 = document.getElementById('btn-show-pro2');
  const btnBuyPro = document.getElementById('btn-buy-pro');
  const proBadge = document.querySelector('.pro-badge-large');
  const proMsg = document.querySelector('.pro-header span:nth-child(2)');
  const MAX_DEVICES = 3;

  function getDeviceId() {
    let id = localStorage.getItem('sce_device_id');
    if (!id) {
      id = 'DEVICE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('sce_device_id', id);
    }
    return id;
  }

  function checkDeviceLimit(key) {
    const registry = JSON.parse(localStorage.getItem('sce_key_registry') || '{}');
    if (!registry[key]) {
      registry[key] = { devices: [], firstSeen: new Date().toISOString() };
    }
    const entry = registry[key];
    const deviceId = getDeviceId();
    if (!entry.devices.includes(deviceId)) {
      entry.devices.push(deviceId);
    }
    localStorage.setItem('sce_key_registry', JSON.stringify(registry));
    return entry.devices.length <= MAX_DEVICES;
  }

  // Check saved PRO key
  const saved = localStorage.getItem('subtitleconverter_pro');
  const activated = localStorage.getItem('subtitleconverter_pro_activated') === 'true';
  if (saved && (activated || validateProKey(saved))) {
    isPro = true;
    if (proBadge) proBadge.textContent = '✓ PRO';
    if (proMsg) proMsg.textContent = 'PRO activated — unlimited entries & format conversion unlocked';
    document.querySelectorAll('#btn-show-pro, #btn-show-pro2').forEach(b => {
      b.textContent = '✅ Activated'; b.style.background = '#10b981';
    });
    freeHint.textContent = 'PRO mode — all entries and export formats available.';
  }

  // ─── File handling ─────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    currentFilename = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = parseSubtitle(text);
        if (result.entries.length === 0) {
          showError('No subtitle entries found. Make sure this is a valid SRT, VTT, or ASS file.');
          return;
        }
        showResults(result, file.name);
      } catch (err) {
        showError(`Failed to parse: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  document.getElementById('click-upload').addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
  fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleFile(fileInput.files[0]); });

  // ─── Display results ──────────────────────────────────
  function showResults(result, filename) {
    currentData = result;
    uploadCard.style.display = 'none';
    resultsCard.style.display = 'block';

    const formatNames = { srt: 'SRT', vtt: 'VTT', ass: 'ASS', txt: 'Plain Text' };
    fileInfo.textContent = `📄 ${filename} — ${result.totalEntries} entries`;
    detailCount.textContent = `Detected format: ${formatNames[result.format] || result.format.toUpperCase()}`;

    // Show free hint with entry count
    if (!isPro) {
      freeHint.innerHTML = `Free exports include the first ${MAX_FREE_ENTRIES} of ${result.totalEntries} entries. <a href="#" id="btn-show-pro">Upgrade to PRO</a> for all entries + format conversion + unlimited files.`;
      // Re-bind click handler since innerHTML replaced the old element
      document.getElementById('btn-show-pro').addEventListener('click', () => { proModal.style.display = 'flex'; });
    }

    // Render entry list
    entryList.innerHTML = '';
    const displayEntries = result.entries;
    for (const e of displayEntries) {
      const div = document.createElement('div');
      div.className = 'entry-item';
      const timeStr = e.start ? `${e.start} → ${e.end}` : '';
      div.innerHTML = `
        <div class="entry-header">
          <span>#${e.index} ${timeStr ? `— ${timeStr}` : ''}</span>
          <span class="open-indicator">▼</span>
        </div>
        <div class="entry-body">
          <div class="entry-text">${escapeHTML(e.text)}</div>
        </div>
      `;
      div.querySelector('.entry-header').addEventListener('click', () => {
        div.classList.toggle('open');
        div.querySelector('.open-indicator').textContent = div.classList.contains('open') ? '▲' : '▼';
      });
      entryList.appendChild(div);
    }

    // Open first few by default
    const firstItems = entryList.querySelectorAll('.entry-item');
    for (let i = 0; i < Math.min(3, firstItems.length); i++) {
      firstItems[i].classList.add('open');
      firstItems[i].querySelector('.open-indicator').textContent = '▲';
    }

    resultsCard.scrollIntoView({ behavior: 'smooth' });
  }

  // ─── Export handlers ──────────────────────────────────
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentData) return;
      const format = btn.dataset.format;

      let entries = currentData.entries;
      if (!isPro) {
        entries = entries.slice(0, MAX_FREE_ENTRIES);
      }

      let content, filename, mime;
      switch (format) {
        case 'txt':
          content = exportPlainText(entries);
          filename = `${currentFilename}-transcript.txt`;
          mime = 'text/plain';
          break;
        case 'srt':
          content = exportSRT(entries);
          filename = `${currentFilename}.srt`;
          mime = 'text/plain';
          break;
        case 'vtt':
          content = exportVTT(entries);
          filename = `${currentFilename}.vtt`;
          mime = 'text/vtt';
          break;
        case 'md':
          content = exportMarkdown(entries, currentFilename);
          filename = `${currentFilename}-transcript.md`;
          mime = 'text/markdown';
          break;
        case 'csv':
          content = exportCSV(entries);
          filename = `${currentFilename}-transcript.csv`;
          mime = 'text/csv';
          break;
        case 'json':
          content = exportJSON(entries);
          filename = `${currentFilename}-transcript.json`;
          mime = 'application/json';
          break;
      }
      downloadFile(filename, content, mime);
    });
  });

  // ─── Load sample ──────────────────────────────────────
  document.getElementById('load-sample').addEventListener('click', () => {
    const sample = `1
00:00:01,500 --> 00:00:04,000
Welcome to this tutorial on the solar system.
Today we'll explore the planets and their orbits.

2
00:00:04,500 --> 00:00:08,500
The sun is at the center of our solar system,
containing 99.86% of all its mass.

3
00:00:09,000 --> 00:00:12,500
Mercury is the smallest planet and closest to the sun.
Its surface temperatures range from -180°C to 430°C.

4
00:00:13,000 --> 00:00:16,000
Venus is Earth's twin in size but has
a thick toxic atmosphere of carbon dioxide.

5
00:00:16,500 --> 00:00:20,000
Earth is the third planet from the sun
and the only known planet to support life.

6
00:00:20,500 --> 00:00:24,500
Mars, the red planet, has the largest volcano
in the solar system — Olympus Mons.

7
00:00:25,000 --> 00:00:28,500
Jupiter is the largest planet, with
a mass more than twice that of all other planets combined.

8
00:00:29,000 --> 00:00:32,500
Saturn is famous for its beautiful ring system
made of ice particles and rocky debris.

9
00:00:33,000 --> 00:00:36,500
Uranus rotates on its side, with an axial tilt
of about 98 degrees relative to its orbit.

10
00:00:37,000 --> 00:00:41,000
Neptune is the windiest planet with speeds
reaching up to 2,100 kilometers per hour.

11
00:00:41,500 --> 00:00:44,000
Beyond Neptune lies the Kuiper Belt,
home to dwarf planets like Pluto.

12
00:00:44,500 --> 00:00:48,000
Pluto was reclassified as a dwarf planet in 2006,
but remains a fascinating world.

13
00:00:48,500 --> 00:00:52,000
The solar system formed about 4.6 billion years ago
from a giant cloud of gas and dust.

14
00:00:52,500 --> 00:00:56,000
Asteroids are rocky bodies orbiting the sun,
mostly found in the asteroid belt between Mars and Jupiter.

15
00:00:56,500 --> 00:01:00,000
Comets are icy bodies that develop spectacular tails
when they approach the sun.

16
00:01:00,500 --> 00:01:04,000
The solar system continues to surprise us
with new discoveries every year.

17
00:01:04,500 --> 00:01:08,000
Thank you for watching this introduction
to our incredible solar system.

18
00:01:08,500 --> 00:01:12,000
Subscribe for more educational content
and space exploration updates.`;

    const result = parseSubtitle(sample);
    showResults(result, 'sample-solar-system.srt');
  });

  // ─── PRO Modal ────────────────────────────────────────
  if (btnShowPro) {
    btnShowPro.addEventListener('click', () => { proModal.style.display = 'flex'; });
  }
  if (btnShowPro2) {
    btnShowPro2.addEventListener('click', () => { proModal.style.display = 'flex'; });
  }
  if (btnBuyPro) {
    btnBuyPro.addEventListener('click', () => {
      const url = btnBuyPro.dataset.gumroad;
      if (!url) return;
      const w = Math.min(600, window.innerWidth - 40);
      const h = Math.min(700, window.innerHeight - 40);
      const left = Math.max(0, (window.innerWidth - w) / 2);
      const top = Math.max(0, (window.innerHeight - h) / 2);
      const win = window.open(url, 'gumroad-checkout', `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,status=no`);
      if (!win) window.location.href = url;
    });
  }
  document.getElementById('modal-close').addEventListener('click', () => { proModal.style.display = 'none'; });
  proModal.addEventListener('click', (e) => { if (e.target === proModal) proModal.style.display = 'none'; });

  btnActivate.addEventListener('click', async () => {
    const key = proKeyInput.value.trim().toUpperCase();
    if (!key) { alert('Enter a PRO key first.'); return; }

    // Offline SUBTITLE-XXXX keys (for testing)
    if (key.startsWith('SUBTITLE-')) {
      if (!validateProKey(key)) {
        alert('Invalid PRO key. Enter a valid key purchased from our store.');
        return;
      }
      if (!checkDeviceLimit(key)) {
        alert(`This key has been activated on too many devices (max ${MAX_DEVICES}).`);
        return;
      }
      activatePro(key);
      return;
    }

    // Gumroad license key — verify via API
    btnActivate.textContent = 'Verifying...';
    btnActivate.disabled = true;
    try {
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `product_id=vYjz6BS7IFlW93oB-_255g==&license_key=${encodeURIComponent(key)}`
      });
      const data = await res.json();
      if (data.success && data.purchase) {
        if (data.uses >= 3) {
          alert(`This key has been activated on too many devices (max 3). Current uses: ${data.uses}`);
          return;
        }
        activatePro(key);
      } else {
        alert('This license key is invalid. Make sure you entered it exactly as received in your email.');
      }
    } catch (err) {
      alert('Failed to verify license. Check your internet connection and try again.');
    } finally {
      btnActivate.textContent = 'Activate';
      btnActivate.disabled = false;
    }
  });

  function activatePro(key) {
    isPro = true;
    if (proBadge) proBadge.textContent = '✓ PRO';
    if (proMsg) proMsg.textContent = 'PRO activated — unlimited entries & format conversion unlocked';
    document.querySelectorAll('#btn-show-pro, #btn-show-pro2').forEach(b => {
      b.textContent = '✅ Activated';
      b.style.background = '#10b981';
    });
    freeHint.innerHTML = 'PRO mode — all entries and export formats available.';
    proModal.style.display = 'none';
    localStorage.setItem('subtitleconverter_pro', key);
  }

  // ─── Helpers ──────────────────────────────────────────
  function showError(msg) {
    uploadCard.style.display = 'none';
    resultsCard.style.display = 'block';
    entryList.innerHTML = `<div class="error">${escapeHTML(msg)}</div>`;
    fileInfo.textContent = 'Error';
    detailCount.textContent = '';
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ─── New File button ────────────────────────────────────
  document.getElementById('btn-new-file').addEventListener('click', (e) => {
    e.preventDefault();
    uploadCard.style.display = 'block';
    resultsCard.style.display = 'none';
    currentData = null;
    fileInput.value = '';
    resultsCard.scrollIntoView({ behavior: 'smooth' });
  });

});

/* ─── PRO Key Validation ──────────────────────────────────────────── */

function validateProKey(key) {
  const parts = key.split('-');
  if (parts.length !== 5 || parts[0] !== 'SUBTITLE') return false;
  for (let i = 1; i < 5; i++) {
    if (parts[i].length !== 4 || !/^\d{4}$/.test(parts[i])) return false;
  }
  const str = parts.slice(1, 4).join('');
  let s = 0;
  for (let i = 0; i < str.length; i++) s += str.charCodeAt(i) * (i + 1);
  s ^= PRO_SECRET;
  return parts[4] === String(s % 10).repeat(4);
}
