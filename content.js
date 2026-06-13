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
  if (document.getElementById('lb-oldest-date')) return;

  const imgs = document.querySelectorAll('#splide-product-main .splide__slide:not(.splide__slide--clone) img');
  if (!imgs.length) return;

  let oldestDate = null;
  imgs.forEach(img => {
    const url = img.getAttribute('data-big') || img.getAttribute('data-splide-lazy') || img.src;
    const d = parseDateFromUrl(url);
    if (d) {
      if (!oldestDate || d < oldestDate) {
        oldestDate = d;
      }
    }
  });

  if (oldestDate) {
    const panel = document.createElement('div');
    panel.id = 'lb-oldest-date';
    panel.style = "background: rgba(0,0,0,0.65); color: #fff; padding: 3px 9px; border-radius: 4px; margin: 8px 0; display: inline-block; font-weight: 600; font-size: 13px;";
    panel.innerHTML = `📅 ${formatDate(oldestDate)}`;

    const title = document.querySelector('h1');
    if (title) title.insertAdjacentElement('afterend', panel);
  }
}

// Funkcja dla list produktów (kategorie, wyniki wyszukiwania, polecane)
function injectListDates() {
  // Szukamy wszystkich linków do produktów
  const links = document.querySelectorAll('a[href*="/products/"]');

  links.forEach(link => {
    // Oznaczamy link (nie img), bo Vue może przeładować img ale zostawić link
    if (link.dataset.hasDate === 'true') return;

    const img = link.querySelector('img');
    if (!img) return;

    const url = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-splide-lazy') || img.src;
    const d = parseDateFromUrl(url);
    if (!d) return;

    link.dataset.hasDate = 'true';

    // Badge na narożniku zdjęcia – position:absolute, bez ruszania layoutu
    const imgWrap = img.parentElement; // to jest <span>
    imgWrap.style.position = 'relative';
    imgWrap.style.display = 'inline-block';

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
    badge.textContent = formatDate(d);

    imgWrap.appendChild(badge);
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