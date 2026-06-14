function parseDateFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/library\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
  if (!m) return null;
  // Miesiące w JS są od 0 do 11, dlatego m[2]-1
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function formatDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

// Funkcja dla pojedynczego produktu (widok szczegółów)
function injectOldestDate() {
  if (!location.pathname.startsWith('/products/')) return;

  const imgs = document.querySelectorAll('#splide-product-main .splide__slide:not(.splide__slide--clone) img');
  if (!imgs.length) return;

  imgs.forEach((img, index) => {
    const imgWrap = img.parentElement;
    if (imgWrap.dataset.lbDate === 'true') return; // już wstrzyknięto
    imgWrap.dataset.lbDate = 'true';

    const dateUrl = img.getAttribute('data-big') || img.getAttribute('data-splide-lazy') || img.src;
    const exifUrl  = img.src || dateUrl;  // img.src = to co przeglądarka pobrała (w cache)
    const urlDate  = parseDateFromUrl(dateUrl);
    if (!urlDate) return;

    imgWrap.style.position = 'relative';
    imgWrap.style.display  = 'inline-block';

    const badge = document.createElement('div');
    badge.className = 'lb-product-date';
    badge.style = [
      'position:absolute',
      'top:0',
      'left:0',
      'right:0',
      'background:rgba(0,0,0,0.58)',
      'color:#fff',
      'font-size:13px',
      'font-weight:700',
      'text-align:center',
      'padding:4px 0',
      'line-height:1.5',
      'letter-spacing:0.3px',
      'pointer-events:none',
      'z-index:5',
    ].join(';');

    badge.textContent = `📅 ${formatDate(urlDate)}`;
    imgWrap.appendChild(badge);

    if (index === 0) {
      // Pierwsze zdjęcie widoczne od razu — fetch EXIF natychmiast
      console.log('[lb-product] fetch EXIF dla img[0]:', exifUrl);
      fetchExifDate(exifUrl).then(exifDate => {
        console.log('[lb-product] wynik EXIF img[0]:', exifDate ? formatDate(exifDate) : 'brak');
        if (!exifDate) return;
        badge.innerHTML = `📸 ${formatDate(exifDate)}<br>📅 ${formatDate(urlDate)}`;
      });
    } else {
      // Pozostałe — fetch EXIF dopiero gdy slajd wejdzie do viewport
      const obs = new IntersectionObserver((entries, o) => {
        if (!entries[0].isIntersecting) return;
        o.disconnect();
        console.log(`[lb-product] fetch EXIF dla img[${index}]:`, exifUrl);
        fetchExifDate(exifUrl).then(exifDate => {
          console.log(`[lb-product] wynik EXIF img[${index}]:`, exifDate ? formatDate(exifDate) : 'brak');
          if (!exifDate) return;
          badge.innerHTML = `📸 ${formatDate(exifDate)}<br>📅 ${formatDate(urlDate)}`;
        });
      }, { rootMargin: '0px' });
      obs.observe(img);
    }
  });
}



// Funkcja dla list produktów (kategorie, wyniki wyszukiwania, polecane)
function injectListDates() {
  const links = document.querySelectorAll('a[href*="/products/"]');

  links.forEach(link => {
    if (link.dataset.hasDate === 'true') return;

    const img = link.querySelector('img');
    if (!img) return;

    const dateUrl = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-splide-lazy') || img.src;
    const exifUrl  = img.src || dateUrl;  // img.src = to co przeglądarka pobrała
    const urlDate  = parseDateFromUrl(dateUrl);
    if (!urlDate) return;

    link.dataset.hasDate = 'true';

    // Badge na narożniku zdjęcia – position:absolute, bez ruszania layoutu
    const imgWrap = img.parentElement;
    imgWrap.style.position = 'relative';
    imgWrap.style.display  = 'inline-block';

    const badge = document.createElement('div');
    badge.className = 'lb-list-date';
    badge.style = [
      'position:absolute',
      'bottom:0',
      'left:0',
      'right:0',
      'background:rgba(0,0,0,0.58)',
      'color:#fff',
      'font-size:10px',
      'font-weight:700',
      'text-align:center',
      'padding:2px 0',
      'line-height:1.4',
      'letter-spacing:0.3px',
      'pointer-events:none',
      'z-index:5',
    ].join(';');

    // Pokaż datę URL natychmiast (z ikonką dla spójności)
    badge.textContent = `📅 ${formatDate(urlDate)}`;
    imgWrap.appendChild(badge);

    // Dociągnij EXIF dopiero gdy obrazek wejdzie do viewport
    // (dokładnie jak lazy loader — zero dodatkowych requestów przed scrollem)
    const observer = new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      fetchExifDate(exifUrl).then(exifDate => {
        if (!exifDate) return;
        badge.innerHTML = `📸 ${formatDate(exifDate)}<br>📅 ${formatDate(urlDate)}`;
      });
    }, { rootMargin: '200px' }); // 200px przed wejściem w viewport

    observer.observe(img);
  });
}



// Obsługa dynamicznego ładowania Vue.js
const observer = new MutationObserver(() => {
  injectOldestDate();
  injectListDates();
});

observer.observe(document.body, { childList: true, subtree: true });

// Pierwsze wywołanie
injectOldestDate();
injectListDates();

// ─── KROK 1: test parsowania EXIF (tylko console.log, brak zmian w UI) ────────
async function fetchExifDate(url) {
  const res = await fetch(url, {
    cache: 'force-cache',
    headers: { Range: 'bytes=0-65535' },
  });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return parseExifDate(buf);
}

function parseExifDate(buf) {
  const view = new DataView(buf);
  const sig16 = view.getUint16(0);

  // ── JPEG ──────────────────────────────────────────────────────────────────
  if (sig16 === 0xFFD8) {
    let offset = 2;
    while (offset + 4 < buf.byteLength) {
      const marker = view.getUint16(offset);
      const segLen = view.getUint16(offset + 2);
      if (marker === 0xFFE1) {                       // APP1 = EXIF
        const date = readExifApp1(view, offset + 4, segLen - 2);
        if (date) return date;
      }
      if (marker === 0xFFDA) break;                  // SOS = dane obrazu
      offset += 2 + segLen;
    }
    return null;
  }

  // ── WebP (RIFF container) ─────────────────────────────────────────────────
  const riff = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  );
  const webp = String.fromCharCode(
    view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
  );
  console.log('[lb-exif] nagłówek:', riff, webp, '| bufor:', buf.byteLength, 'B');
  if (riff !== 'RIFF' || webp !== 'WEBP') return null;

  // Iteruj po chunkach RIFF logując każdy
  let offset = 12;
  const chunks = [];
  while (offset + 8 < buf.byteLength) {
    const cc = String.fromCharCode(
      view.getUint8(offset),   view.getUint8(offset+1),
      view.getUint8(offset+2), view.getUint8(offset+3)
    );
    const chunkSize = view.getUint32(offset + 4, true);
    chunks.push(`${cc}(${chunkSize}B)`);
    if (cc === 'EXIF') {
      let dataStart = offset + 8;
      const maybeExif = String.fromCharCode(
        view.getUint8(dataStart), view.getUint8(dataStart+1),
        view.getUint8(dataStart+2), view.getUint8(dataStart+3)
      );
      if (maybeExif === 'Exif') dataStart += 6;
      return readTiffExif(view, dataStart);
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  console.log('[lb-exif] chunki WebP:', chunks.join(', '));
  return null;
}

function readExifApp1(view, start, len) {
  // nagłówek 'Exif\0\0'
  const sig = String.fromCharCode(
    view.getUint8(start), view.getUint8(start+1),
    view.getUint8(start+2), view.getUint8(start+3)
  );
  if (sig !== 'Exif') return null;
  return readTiffExif(view, start + 6);  // pomiń "Exif\0\0"
}

function readTiffExif(view, t) {
  const le = view.getUint16(t) === 0x4949;          // little-endian?
  const r16 = o => view.getUint16(t + o, le);
  const r32 = o => view.getUint32(t + o, le);

  if (r16(2) !== 42) return null;                   // magic TIFF
  const ifd0 = r32(4);
  const n    = r16(ifd0);

  // Szukamy ExifIFD (tag 0x8769) w IFD0
  let exifIfd = null;
  for (let i = 0; i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (r16(e) === 0x8769) { exifIfd = r32(e + 8); break; }
  }

  // Czytamy DateTimeOriginal (0x9003) lub DateTimeDigitized (0x9004)
  if (exifIfd !== null) {
    const d = readAsciiTag(view, t, exifIfd, le, 0x9003)
           || readAsciiTag(view, t, exifIfd, le, 0x9004);
    if (d) return d;
  }
  // Fallback: DateTime (0x0132) z IFD0
  return readAsciiTag(view, t, ifd0, le, 0x0132);
}

function readAsciiTag(view, tiffBase, ifdOffset, le, tag) {
  const r16 = o => view.getUint16(tiffBase + o, le);
  const r32 = o => view.getUint32(tiffBase + o, le);
  const n   = r16(ifdOffset);
  for (let i = 0; i < n; i++) {
    const e = ifdOffset + 2 + i * 12;
    if (r16(e) !== tag) continue;
    const count  = r32(e + 4);
    const valOff = r32(e + 8);
    const base   = count <= 4 ? e + 8 : valOff;
    let str = '';
    for (let j = 0; j < count - 1; j++) {
      const ch = view.getUint8(tiffBase + base + j);
      if (!ch) break;
      str += String.fromCharCode(ch);
    }
    // format: "YYYY:MM:DD HH:MM:SS"
    const m = str.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
  }
  return null;
}

// Test: działa na każdej stronie — bierze pierwsze znalezione zdjęcie produktu
(function runTest() {
  // Próbuj widok szczegółów produktu
  let img = document.querySelector(
    '#splide-product-main .splide__slide:not(.splide__slide--clone) img'
  );
  // Fallback: lista produktów — pierwsze img wewnątrz linku do produktu
  if (!img) {
    const link = document.querySelector('a[href*="/products/"]');
    if (link) img = link.querySelector('img');
  }

  if (!img) {
    console.log('[lb-exif] Brak zdjęcia do testu na tej stronie');
    return;
  }

  const url = img.getAttribute('data-big')
    || img.getAttribute('data-src')
    || img.getAttribute('data-splide-lazy')
    || img.src;

  console.log('[lb-exif] URL zdjęcia:', url);
  fetchExifDate(url).then(d => {
    console.log('[lb-exif] Data EXIF:', d ? formatDate(d) : 'brak / nie znaleziono');
  }).catch(err => {
    console.error('[lb-exif] Błąd fetch:', err);
  });
})();