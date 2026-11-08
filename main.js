/* =========================================================
   НАСТРОЙКИ
   FORM_ENDPOINT — адрес для отправки заявок (например, Formspree:
   "https://formspree.io/f/xxxxxxx"). Пока пусто — форма просто
   показывает «Спасибо», заявки никуда не уходят.
   ========================================================= */
const FORM_ENDPOINT = "";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const rub = n => n === 0 ? "Бесплатно" : n.toLocaleString("ru-RU") + " ₽";

/* ---------- шапка и меню ---------- */
const header = $("#header");
const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });
$("#burger").addEventListener("click", () => header.classList.toggle("is-open"));
$$("#nav a").forEach(a => a.addEventListener("click", () => header.classList.remove("is-open")));

/* ---------- афиша ---------- */
const events = [...window.EVENTS].sort((a, b) => a.date.localeCompare(b.date));

function eventCard(e) {
  const d = new Date(e.date + "T00:00");
  return `<article class="event">
    <div class="event__img"><img src="${e.img}" alt="" loading="lazy">
      <div class="event__date"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></div></div>
    <div class="event__body">
      <div class="event__tag">${e.cat} · ${e.time}</div>
      <h3>${e.title}</h3>
      <p>${e.text}</p>
      <div class="event__foot"><span class="event__price">${rub(e.price)}</span>
        <button class="btn" data-book="${e.id}">Записаться</button></div>
    </div></article>`;
}

function renderEvents(cat = "Все") {
  const list = cat === "Все" ? events : events.filter(e => e.cat === cat);
  $("#events").innerHTML = list.map(eventCard).join("");
}

const cats = ["Все", ...new Set(events.map(e => e.cat))];
$("#filters").innerHTML = cats.map((c, i) => `<button class="chip${i ? "" : " is-active"}" data-cat="${c}">${c}</button>`).join("");
$("#filters").addEventListener("click", ev => {
  const b = ev.target.closest(".chip"); if (!b) return;
  $$(".chip").forEach(c => c.classList.toggle("is-active", c === b));
  renderEvents(b.dataset.cat);
});
renderEvents();

const today = new Date().toISOString().slice(0, 10);
const upcoming = events.filter(e => e.date >= today).slice(0, 3);
$("#upcoming").innerHTML = (upcoming.length ? upcoming : events.slice(0, 3)).map(eventCard).join("");

/* ---------- запись на событие ---------- */
const modal = $("#modal");
let current = null;
function openBooking(id) {
  current = events.find(e => e.id === id);
  if (!current) return;
  $("#bookForm").classList.remove("is-sent");
  $("#bookForm form").reset();
  $("#mEvent").textContent = `${current.title} — ${new Date(current.date + "T00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${current.time}`;
  $("#mEventInput").value = current.title + " " + current.date;
  $("#mSubmit").textContent = current.price ? "Перейти к оплате" : "Записаться";
  updateTotal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => $("#b-name").focus(), 50);
}
function closeModal() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); }
function updateTotal() {
  const n = parseInt($("#b-count").value, 10) || 0;
  $("#mTotal").textContent = !current ? "—" : current.price === 0 ? "Бесплатно" : n ? rub(n * current.price) : rub(current.price) + " / билет";
}
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-book]");
  if (b) openBooking(b.dataset.book);
  if (ev.target.closest("[data-close]") || ev.target === modal) closeModal();
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape") closeModal(); });
$("#b-count").addEventListener("input", updateTotal);

/* ---------- отправка форм ---------- */
$$("form[data-form]").forEach(form => {
  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const box = form.closest(".form");
    if (FORM_ENDPOINT) {
      try {
        await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      } catch (e) { alert("Не получилось отправить. Попробуйте ещё раз или позвоните нам."); return; }
    }
    box.classList.add("is-sent");
  });
});

/* ---------- карта парка ---------- */
const P = window.PLACES;
function showPlace(id) {
  const p = P[id]; if (!p) return;
  $$("#parksvg [data-place]").forEach(z => z.classList.toggle("is-active", z.dataset.place === id));
  $$("#legend button").forEach(b => b.classList.toggle("is-active", b.dataset.place === id));
  $("#place").innerHTML = `
    <img src="${p.img}" alt="">
    <div class="eyebrow">${p.type}</div>
    <h3>${p.name}</h3>
    <p>${p.text}</p>
    <div class="place__meta">${p.facts.map(f => `<span>${f[0]} — ${f[1]}</span>`).join("")}</div>
    <a class="btn" href="guide.html?place=${id}">Описание и аудиогид</a>`;
}
$("#legend").innerHTML = Object.entries(P).map(([id, p]) => `<button data-place="${id}"><i style="background:${p.color}"></i>${p.name}</button>`).join("");
$("#legend").addEventListener("click", ev => { const b = ev.target.closest("button"); if (b) showPlace(b.dataset.place); });
$$("#parksvg [data-place]").forEach(z => {
  z.addEventListener("click", () => {
    showPlace(z.dataset.place);
    if (window.innerWidth < 900) $("#place").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  z.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); showPlace(z.dataset.place); } });
});
showPlace("dom");

/* декоративный QR */
(function () {
  const s = $("#qrdemo"); if (!s) return;
  let r = "", seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#203327"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#203327"/>`;
  for (let y = 0; y < 29; y++) for (let x = 0; x < 29; x++) {
    const inF = (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
    if (!inF && rnd() > .52) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="#203327"/>`;
  }
  s.innerHTML = r + finder(0, 0) + finder(22, 0) + finder(0, 22);
})();

/* ---------- виртуальный тур ---------- */
const T = window.TOUR, pano = $("#pano"), stage = $("#stage");
let offset = 0, dir = -1, dragging = false, startX = 0, startOff = 0, auto = true;
const minOff = () => stage.clientWidth - pano.clientWidth;
function place() { offset = Math.max(minOff(), Math.min(0, offset)); pano.style.transform = `translateX(${offset}px)`; }
function showRoom(i) {
  pano.style.backgroundImage = `url(${T[i].img})`;
  $("#stageTitle").textContent = T[i].name;
  $$(".tour__item").forEach((b, j) => b.classList.toggle("is-active", i === j));
  offset = minOff() / 2; place();
}
$("#tourList").innerHTML = T.map((t, i) => `<button class="tour__item" data-i="${i}"><img src="${t.img}" alt=""><span><b>${t.name}</b><small>${t.sub}</small></span></button>`).join("");
$("#tourList").addEventListener("click", ev => { const b = ev.target.closest(".tour__item"); if (b) showRoom(+b.dataset.i); });
stage.addEventListener("pointerdown", e => { dragging = true; auto = false; startX = e.clientX; startOff = offset; stage.setPointerCapture(e.pointerId); });
stage.addEventListener("pointermove", e => { if (!dragging) return; offset = startOff + (e.clientX - startX); place(); });
stage.addEventListener("pointerup", () => dragging = false);
stage.addEventListener("pointercancel", () => dragging = false);
window.addEventListener("resize", place);
(function drift() {
  if (auto && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    offset += dir * .3;
    if (offset <= minOff() || offset >= 0) dir *= -1;
    place();
  }
  requestAnimationFrame(drift);
})();
showRoom(0);

/* ---------- появление при скролле ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: .12 });
$$(".reveal").forEach(el => io.observe(el));
