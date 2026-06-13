// Loombard – daty wszystkich zdjęć produktu

if (location.pathname.startsWith('/products/')) {

  function parseDateFromUrl(url) {
    const m = url && url.match(/\/library\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
  }

  function formatDate(d) {
    const months = ['stycznia','lutego','marca','kwietnia','maja','czerwca',
                    'lipca','sierpnia','września','października','listopada','grudnia'];
    return `${d.day} ${months[d.month - 1]} ${d.year}`;
  }

  function inject() {
    if (document.getElementById('lb-dates')) return;

    const imgs = document.querySelectorAll('#splide-product-main .splide__slide img');
    if (!imgs.length) return;

    const rows = [];
    imgs.forEach((img, i) => {
      const url = img.getAttribute('data-big') || img.getAttribute('data-splide-lazy');
      const d = parseDateFromUrl(url);
      rows.push(`<li>Zdjęcie ${i + 1}: <strong>${d ? formatDate(d) : '?'}</strong></li>`);
    });

    const panel = document.createElement('div');
    panel.id = 'lb-dates';
    panel.innerHTML = `<span>📅 Daty zdjęć:</span><ol>${rows.join('')}</ol>`;

    document.querySelector('h1')?.insertAdjacentElement('afterend', panel);
  }

  inject();
  setTimeout(inject, 1000);
}
