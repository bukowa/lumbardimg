if (location.pathname.startsWith('/products/')) {

  function parseDateFromUrl(url) {
    if (!url) return null;
    const m = url.match(/\/library\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    if (!m) return null;
    // Miesiące w JS są od 0 do 11, dlatego m[2]-1
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  function formatDate(d) {
    const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
      'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function injectOldestDate() {
    if (document.getElementById('lb-oldest-date')) return;

    // Pobieramy zdjęcia (pomijamy klony Splide)
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
      panel.style = "background: #fff3cd; color: #856404; padding: 8px 12px; border-radius: 4px; margin: 10px 0; border: 1px solid #ffeeba; display: inline-block; font-weight: bold;";
      panel.innerHTML = `📅 Przedmiot wystawiony ok. ${formatDate(oldestDate)}`;

      const title = document.querySelector('h1');
      if (title) title.insertAdjacentElement('afterend', panel);
    }
  }

  // Obsługa dynamicznego ładowania Vue.js
  const observer = new MutationObserver(() => {
    if (!document.getElementById('lb-oldest-date')) {
      injectOldestDate();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  injectOldestDate();
}