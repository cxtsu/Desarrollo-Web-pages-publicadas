
// Endpoint oficial de la API de Studio Ghibli
const API_URL = "https://ghibliapi.dev/films";

// Elementos del DOM capturados
const filmsContainer = document.getElementById("films-container");
const postersTrack = document.getElementById("posters-track");
const btnScrollLeft = document.getElementById("btn-scroll-left");
const btnScrollRight = document.getElementById("btn-scroll-right");
const searchInput = document.getElementById("search-input");
const directorFilter = document.getElementById("director-filter");
const loadingSpinner = document.getElementById("loading-spinner");
const errorMessage = document.getElementById("error-message");
const resultsCount = document.getElementById("results-count");

// Elementos del Hero dinámico (Banner superior)
const heroBackdrop = document.getElementById("hero-backdrop");
const heroTitle = document.getElementById("hero-title");
const heroJapanese = document.getElementById("hero-japanese");
const heroMeta = document.getElementById("hero-meta");
const heroPoster = document.getElementById("hero-poster");
const heroKanjiSub = document.getElementById("hero-kanji-sub");
const heroDirector = document.getElementById("hero-director");
const heroProducer = document.getElementById("hero-producer");
const heroDesc = document.getElementById("hero-desc");
const heroScore = document.getElementById("hero-score");

// Estado global de datos
let allFilms = [];
let currentFilmId = null;

// Variables de interacción para Arrastre (Drag-to-Scroll)
let isDown = false;
let startX = 0;
let scrollStartLeft = 0;
let hasDragged = false;

/**
 * Función asíncrona para consultar la API de Ghibli
 */
async function fetchFilms() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }

    allFilms = await response.json();

    loadingSpinner.classList.add("d-none");
    populateDirectors(allFilms);

    // Película destacada por defecto (Spirited Away o la primera de la lista)
    const defaultFilm =
      allFilms.find((f) => f.title.toLowerCase().includes("spirited away")) ||
      allFilms[0];

    if (defaultFilm) {
      updateHeroShowcase(defaultFilm, false);
    }

    renderAllViews(allFilms);
  } catch (error) {
    console.error("Fallo al obtener películas de la API:", error);
    loadingSpinner.classList.add("d-none");
    errorMessage.classList.remove("d-none");
  }
}

/**
 * Actualiza la información del Banner Hero superior
 * @param {Object} film - Película seleccionada
 * @param {Boolean} shouldScroll - Si debe subir suavemente al header
 */
function updateHeroShowcase(film, shouldScroll = false) {
  currentFilmId = film.id;

  const bgImage = film.movie_banner || film.image;
  heroBackdrop.style.backgroundImage = `url('${bgImage}')`;

  heroTitle.textContent = film.title;
  heroJapanese.textContent = `${film.original_title} (${film.original_title_romanised})`;
  heroMeta.textContent = `${film.release_date} • ${film.running_time} MIN • DIR. ${film.director.toUpperCase()} • STUDIO GHIBLI`;

  heroPoster.src = film.image;
  heroPoster.alt = `Póster oficial de ${film.title}`;
  heroKanjiSub.textContent = film.original_title;

  heroDirector.textContent = film.director;
  heroProducer.textContent = film.producer;
  heroDesc.textContent = film.description;
  heroScore.textContent = film.rt_score;

  // Actualizar clase 'is-selected' en todos los componentes
  document.querySelectorAll(".poster-card, .gallery-item").forEach((el) => {
    if (el.dataset.id === film.id) {
      el.classList.add("is-selected");
    } else {
      el.classList.remove("is-selected");
    }
  });

  if (shouldScroll) {
    document.getElementById("featured-hero").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

/**
 * Llena el selector de directores dinámicamente sin duplicados
 * @param {Array} films - Lista completa de obras
 */
function populateDirectors(films) {
  const directors = [...new Set(films.map((f) => f.director))].sort();

  directors.forEach((director) => {
    const opt = document.createElement("option");
    opt.value = director;
    opt.textContent = director;
    directorFilter.appendChild(opt);
  });
}

/**
 * Renderiza las Postales Vintage en el carrusel Coverflow 3D
 * @param {Array} films - Películas filtradas
 */
function renderPostersCarousel(films) {
  postersTrack.innerHTML = "";

  if (films.length === 0) {
    postersTrack.innerHTML = `<p class="text-muted small my-3">No hay postales disponibles.</p>`;
    return;
  }

  // Paleta de washi tapes para alternar cíclicamente
  const washiClasses = ["washi-blue", "washi-pink", "washi-green"];

  films.forEach((film, index) => {
    const card = document.createElement("article");
    const isSelected = film.id === currentFilmId ? "is-selected" : "";
    const tapeColor = washiClasses[index % washiClasses.length];

    card.className = `poster-card ${isSelected}`;
    card.dataset.id = film.id;
    card.title = `Abrir ficha de ${film.title}`;

    card.innerHTML = `
      <div class="washi-tape ${tapeColor}"></div>
      <div class="postal-photo-frame">
        <img src="${film.image}" alt="Postal de ${film.title}" loading="lazy" />
        <span class="postal-stamp">★ ${film.rt_score}%</span>
      </div>
      <div class="postal-caption">
        <h4 class="postal-title">${film.title}</h4>
        <span class="postal-sub">${film.original_title} &bull; ${film.release_date}</span>
      </div>
    `;

    // Clic en postal: solo si no fue un arrastre de scroll
    card.addEventListener("click", () => {
      if (!hasDragged) {
        updateHeroShowcase(film, true);
        centerCardInCoverflow(card);
      }
    });

    postersTrack.appendChild(card);
  });

  // Calcular perspectiva Coverflow 3D inicial
  updateCoverflow3D();
}

/**
 * Cálculo del Efecto Coverflow 3D suavizado (pantalla llena de postales)
 */
function updateCoverflow3D() {
  const scrollLeft = postersTrack.scrollLeft;
  const trackWidth = postersTrack.clientWidth;
  const trackCenter = scrollLeft + trackWidth / 2;
  const halfWidth = trackWidth / 2;

  const cards = postersTrack.querySelectorAll(".poster-card");
  if (!cards.length) return;

  const cardData = [];
  cards.forEach((card) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = (cardCenter - trackCenter) / halfWidth;
    // Limitamos la distancia para que las tarjetas laterales no roten excesivamente
    const clampedDist = Math.max(-1.1, Math.min(1.1, dist));
    cardData.push({ card, clampedDist });
  });

  cardData.forEach(({ card, clampedDist }) => {
    // Ángulos más moderados para evitar que se desborden bruscamente
    const rotateY = -clampedDist * 18; 
    const translateZ = -Math.abs(clampedDist) * 35;
    const scale = 1 - Math.min(0.12, Math.abs(clampedDist) * 0.08);
    const opacity = 1 - Math.min(0.25, Math.abs(clampedDist) * 0.15);
    const zIndex = Math.round(100 - Math.abs(clampedDist) * 30);

    card.style.transform = `perspective(1000px) rotateY(${rotateY.toFixed(2)}deg) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    card.style.opacity = opacity.toFixed(2);
    card.style.zIndex = zIndex;
  });
}

/**
 * Centra la tarjeta seleccionada dentro del viewport del carrusel
 * @param {HTMLElement} card - Elemento postal a centrar
 */
function centerCardInCoverflow(card) {
  const trackCenter = postersTrack.clientWidth / 2;
  const cardCenter = card.offsetLeft + card.clientWidth / 2;
  postersTrack.scrollTo({
    left: cardCenter - trackCenter,
    behavior: "smooth"
  });
}

/**
 * Renderiza el mosaico widescreen de fotogramas (16:9)
 * @param {Array} films - Películas a mostrar
 */
function renderGallery(films) {
  filmsContainer.innerHTML = "";

  resultsCount.textContent = `${films.length} ${
    films.length === 1 ? "obra encontrada" : "obras encontradas"
  }`;

  if (films.length === 0) {
    filmsContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted fs-5">No se encontraron películas con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  films.forEach((film) => {
    const col = document.createElement("div");
    col.className = "col";

    const isSelected = film.id === currentFilmId ? "is-selected" : "";

    col.innerHTML = `
      <article class="gallery-item ${isSelected}" data-id="${film.id}" title="Click para ver en el banner superior">
        <img 
          src="${film.movie_banner || film.image}" 
          alt="${film.title}" 
          class="gallery-thumb" 
          loading="lazy" 
        />
        <div class="gallery-caption">
          <h3 class="gallery-title text-truncate">${film.title}</h3>
          <span class="gallery-meta">${film.release_date} &bull; ★ ${film.rt_score}% &bull; ${film.director}</span>
        </div>
      </article>
    `;

    col.querySelector(".gallery-item").addEventListener("click", () => {
      updateHeroShowcase(film, true);
    });

    filmsContainer.appendChild(col);
  });
}

/**
 * Renderiza ambas vistas coordinadas
 */
function renderAllViews(films) {
  renderPostersCarousel(films);
  renderGallery(films);
}

/* ==========================================================================
   MANIPULACIÓN: ARRASTRE LIBRE (DRAG-TO-SCROLL), RUEDA Y BOTONES
   ========================================================================== */

// 1. Desplazamiento horizontal con la rueda del ratón
postersTrack.addEventListener("wheel", (e) => {
  e.preventDefault();
  postersTrack.scrollLeft += e.deltaY * 1.2;
}, { passive: false });

// 2. Arrastre sostenido con el ratón
postersTrack.addEventListener("mousedown", (e) => {
  isDown = true;
  hasDragged = false;
  postersTrack.classList.add("is-dragging");
  startX = e.pageX - postersTrack.offsetLeft;
  scrollStartLeft = postersTrack.scrollLeft;
});

window.addEventListener("mouseup", () => {
  if (!isDown) return;
  isDown = false;
  postersTrack.classList.remove("is-dragging");
});

postersTrack.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - postersTrack.offsetLeft;
  const walk = (x - startX) * 1.4; // Multiplicador de velocidad de arrastre
  if (Math.abs(walk) > 5) {
    hasDragged = true;
  }
  postersTrack.scrollLeft = scrollStartLeft - walk;
});

// 3. Recalcular ángulos Coverflow 3D en cada frame de scroll
postersTrack.addEventListener("scroll", () => {
  requestAnimationFrame(updateCoverflow3D);
});

// 4. Botones de flecha clásicos (< y >)
btnScrollLeft.addEventListener("click", () => {
  postersTrack.scrollBy({ left: -340, behavior: "smooth" });
});

btnScrollRight.addEventListener("click", () => {
  postersTrack.scrollBy({ left: 340, behavior: "smooth" });
});

/* ==========================================================================
   FILTROS DINÁMICOS
   ========================================================================== */
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedDirector = directorFilter.value;

  const filtered = allFilms.filter((film) => {
    const matchesQuery =
      film.title.toLowerCase().includes(query) ||
      film.original_title.toLowerCase().includes(query) ||
      film.original_title_romanised.toLowerCase().includes(query) ||
      film.release_date.includes(query);

    const matchesDirector =
      selectedDirector === "todos" || film.director === selectedDirector;

    return matchesQuery && matchesDirector;
  });

  renderAllViews(filtered);
}

searchInput.addEventListener("input", applyFilters);
directorFilter.addEventListener("change", applyFilters);

// Inicializar la aplicación al cargar el DOM
document.addEventListener("DOMContentLoaded", fetchFilms);

