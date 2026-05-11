// parser.js - Subtitle Parsing & Export Functions

/* ─── Parse subtitle text into structured data ────────────────────── */

function detectFormat(text) {
  if (/^WEBVTT\b/m.test(text)) return 'vtt';
  if (/^Dialogue:\s*\d/m.test(text)) return 'ass';
  if (/^\d+\s*[\r\n]+\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}/m.test(text)) return 'srt';
  return 'txt';
}

function parseTimeToMs(timeStr) {
  const std = timeStr.replace(',', '.');
  const parts = std.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600000 + parseFloat(parts[1]) * 60000 + parseFloat(parts[2]) * 1000;
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60000 + parseFloat(parts[1]) * 1000;
  }
  return 0;
}

function msToTime(ms, fmt) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  const pad = (n, d) => String(n).padStart(d, '0');
  if (fmt === 'vtt') return `${pad(hours,2)}:${pad(minutes,2)}:${pad(seconds,2)}.${pad(millis,3)}`;
  return `${pad(hours,2)}:${pad(minutes,2)}:${pad(seconds,2)},${pad(millis,3)}`;
}

function parseSRT(text) {
  const entries = [];
  const blocks = text.trim().replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;

    const parts = timeLine.split(/\s*-->\s*/);
    if (parts.length !== 2) continue;

    const textLines = lines.filter(l => !l.includes('-->') && !/^\d+$/.test(l.trim()));
    const indexLine = lines.find(l => /^\d+$/.test(l.trim()));

    entries.push({
      index: indexLine ? parseInt(indexLine) : entries.length + 1,
      startMs: parseTimeToMs(parts[0]),
      endMs: parseTimeToMs(parts[1]),
      start: parts[0].trim(),
      end: parts[1].trim(),
      text: textLines.join('\n').replace(/<[^>]+>/g, '').trim()
    });
  }
  return entries;
}

function parseVTT(text) {
  const clean = text.replace(/\r\n/g, '\n');
  const blocks = clean.split(/\n\n+/);
  const entries = [];
  let idx = 0;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Skip WEBVTT header and metadata
    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE')) continue;

    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;

    const parts = timeLine.split(/\s*-->\s*/);
    if (parts.length !== 2) continue;

    const textLines = lines.filter(l => !l.includes('-->') && !l.startsWith('NOTE'));
    idx++;

    // Clean VTT timestamps: remove any extra cues like <00:00:10.500>
    const cleanText = textLines.join('\n').replace(/<\d+:\d+:\d+[\.\d]*>/g, '').replace(/<[^>]+>/g, '').trim();
    if (!cleanText) continue;

    entries.push({
      index: idx,
      startMs: parseTimeToMs(parts[0]),
      endMs: parseTimeToMs(parts[1]),
      start: parts[0].trim(),
      end: parts[1].trim(),
      text: cleanText
    });
  }
  return entries;
}

function parseASS(text) {
  const clean = text.replace(/\r\n/g, '\n');
  const entries = [];
  let idx = 0;

  const lines = clean.split('\n');
  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue;

    // ASS format: Dialogue: layer,start,end,style,name,marginL,marginR,marginV,effect,text
    const parts = line.split(',');
    if (parts.length < 10) continue;

    // The 2nd field is start time, 3rd is end time
    // ASS time format: H:MM:SS.cc (or H:MM:SS.msec)
    const startTime = parts[1].trim();
    const endTime = parts[2].trim();

    // Text is everything after the 9th comma
    const textStart = parts.slice(9).join(',').replace(/\{[^}]+\}/g, '').replace(/\\N/gi, '\n').trim();
    if (!textStart) continue;

    idx++;
    entries.push({
      index: idx,
      startMs: parseTimeToMs(startTime),
      endMs: parseTimeToMs(endTime),
      start: startTime,
      end: endTime,
      text: textStart
    });
  }
  return entries;
}

function parseSubtitle(text) {
  const format = detectFormat(text);
  let entries = [];

  switch (format) {
    case 'srt': entries = parseSRT(text); break;
    case 'vtt': entries = parseVTT(text); break;
    case 'ass': entries = parseASS(text); break;
    default:
      // Plain text - treat entire file as one entry
      entries = [{ index: 1, start: '', end: '', startMs: 0, endMs: 0, text: text.trim() }];
  }

  // Sort by start time
  entries.sort((a, b) => a.startMs - b.startMs);

  // Re-index
  entries.forEach((e, i) => e.index = i + 1);

  return { format, entries, totalEntries: entries.length };
}

/* ─── Export Functions ────────────────────────────────────────────── */

function exportPlainText(entries) {
  return entries.map(e => e.text).join('\n\n');
}

function exportSRT(entries) {
  return entries.map(e =>
    `${e.index}\n${e.start} --> ${e.end}\n${e.text}`
  ).join('\n\n') + '\n';
}

function exportVTT(entries) {
  return 'WEBVTT\n\n' + entries.map(e => {
    const start = e.start.includes('.') ? e.start : e.start.replace(',', '.');
    const end = e.end.includes('.') ? e.end : e.end.replace(',', '.');
    return `${e.index}\n${start} --> ${end}\n${e.text}`;
  }).join('\n\n') + '\n';
}

function exportMarkdown(entries, filename) {
  const lines = [`# Subtitle Transcript: ${filename}\n`];
  for (const e of entries) {
    if (e.start) {
      lines.push(`**[${e.start} → ${e.end}]**`);
    }
    lines.push(e.text.replace(/^/gm, '> '));
    lines.push('');
  }
  return lines.join('\n');
}

function exportCSV(entries) {
  const csvRows = ['"Index","Start","End","Text"'];
  for (const e of entries) {
    csvRows.push(`${e.index},"${e.start}","${e.end}","${e.text.replace(/"/g, '""')}"`);
  }
  return csvRows.join('\n');
}

function exportJSON(entries) {
  return JSON.stringify(entries.map(e => ({
    index: e.index,
    start: e.start,
    end: e.end,
    startMs: e.startMs,
    endMs: e.endMs,
    durationMs: e.endMs - e.startMs,
    text: e.text
  })), null, 2);
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
