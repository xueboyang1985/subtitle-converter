# Subtitle Converter & Transcript Exporter

**Convert SRT, VTT, and ASS subtitles to plain text, Markdown, CSV, or JSON — 100% in your browser, no upload required.**

[🌐 Live Tool](https://xueboyang1985.github.io/subtitle-converter/) • [📖 User Guide](https://xueboyang1985.github.io/subtitle-converter/guide.html) • [🛒 PRO Key](https://xuebo8.gumroad.com/l/bvewo)

---

## Web Tool (GitHub Pages)

A browser-based tool at **[subtitle-converter](https://xueboyang1985.github.io/subtitle-converter/)** that processes subtitle files entirely on the client side:

1. Drag & drop an .srt, .vtt, or .ass file onto the page
2. Preview all entries with timestamps
3. Export as TXT, Markdown, CSV, JSON (free) or convert between SRT/VTT/ASS (PRO)

**Use cases:**
- 🎥 Video editors — convert subtitle formats for different platforms
- 📝 Journalists & researchers — extract transcript text from interviews
- 🗣️ Language learners — export subtitles as study notes
- 📊 Data analysts — convert subtitle timing to CSV for analysis

## Free vs PRO

| Feature | Free | PRO |
|---------|------|-----|
| Entries per export | 30 entries | Unlimited |
| Files processed | 1 file | Unlimited |
| Format conversion | — | SRT ↔ VTT ↔ ASS |
| Export formats | TXT, MD, CSV, JSON | TXT, SRT, VTT, MD, CSV, JSON |
| 100% local (no upload) | ✅ | ✅ |
| Priority support | — | ✅ |

**PRO price**: $9.99 one-time payment · 3 devices per key · [Buy here](https://xuebo8.gumroad.com/l/bvewo)

## Project Structure

```
root/
├── index.html          Main web tool page
├── app.js              Web tool logic + PRO key validation
├── parser.js           Subtitle parser (SRT/VTT/ASS) + export formatters
├── style.css           Styles
├── web/
│   └── guide.html      User guide & FAQ
├── sitemap.xml         SEO sitemap
└── robots.txt          Crawler rules
```

## Tech Stack

- Pure HTML + CSS + JavaScript (vanilla, no dependencies)
- GitHub Pages hosting (free CDN)
- Gumroad for payments & license management

## Subtitle Formats Support

| Format | Parsing | Export |
|--------|---------|--------|
| SRT (.srt) | ✅ Full | ✅ With timestamps |
| VTT (.vtt) | ✅ Full | ✅ WEBVTT compliant |
| ASS (.ssa/.ass) | ✅ Dialogue extraction | ✅ Format preserved |

## License

MIT — free to use, modify, and distribute.
