// Gemeinsame Bewegungsschicht der Gestaltungsrichtungen: Auftritte beim Scrollen, Zähler, Hintergrundvideo,
// Bildbetrachter, Kopfleiste, aktiver Abschnitt, Reiter und Bildreihe. Ohne Bibliotheken; reduzierte Bewegung wird respektiert.
(function () {
  "use strict";
  var wurzel = document.documentElement;
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  wurzel.classList.add("js");

  // Auftritte: [data-auftritt] erscheint selbst, in [data-gruppe] erscheinen die Kinder mit [data-folge] gestaffelt
  var auftritte = document.querySelectorAll("[data-auftritt], [data-gruppe]");
  auftritte.forEach(function (el) {
    el.querySelectorAll("[data-folge]").forEach(function (kind, i) { kind.style.setProperty("--i", i); });
  });
  if (ruhig || !("IntersectionObserver" in window)) {
    auftritte.forEach(function (el) { el.classList.add("sichtbar"); });
  } else {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("sichtbar"); beobachter.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    auftritte.forEach(function (el) { beobachter.observe(el); });
  }

  // Zähler: [data-zahl="32"] zählt beim ersten Sichtkontakt hoch
  var zaehler = document.querySelectorAll("[data-zahl]");
  function zaehle(el) {
    var ziel = Number(el.dataset.zahl);
    if (ruhig) { el.textContent = ziel; return; }
    var dauer = 1400, start = performance.now();
    function schritt(jetzt) {
      var t = Math.min(1, (jetzt - start) / dauer);
      var weich = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(ziel * weich);
      if (t < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }
  if ("IntersectionObserver" in window) {
    var zb = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) { zaehle(e.target); zb.unobserve(e.target); } });
    }, { threshold: 0.6 });
    zaehler.forEach(function (el) { el.textContent = ruhig ? el.dataset.zahl : "0"; zb.observe(el); });
  }

  // Hintergrundvideo: passende Größe wählen, nur abspielen, solange sichtbar; Knopf zum Anhalten (WCAG 2.2.2)
  document.querySelectorAll("video[data-hintergrund]").forEach(function (video) {
    var klein = window.matchMedia("(max-width: 900px)").matches;
    var quelle = klein ? video.dataset.klein : video.dataset.gross;
    var knopf = document.querySelector('[data-video-knopf="' + video.id + '"]');
    var angehalten = ruhig;
    function zeige() { if (knopf) knopf.setAttribute("aria-pressed", angehalten ? "true" : "false"); if (knopf) knopf.querySelector("span").textContent = angehalten ? "Play" : "Pause"; }
    if (!ruhig) { video.src = quelle; video.load(); }
    video.addEventListener("playing", function () { video.classList.add("laeuft"); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        if (angehalten) return;
        if (e[0].isIntersecting) { var p = video.play(); if (p) p.catch(function () {}); } else video.pause();
      }, { threshold: 0.1 }).observe(video);
    }
    if (knopf) knopf.addEventListener("click", function () {
      angehalten = !angehalten;
      if (angehalten) video.pause();
      else { if (!video.src) { video.src = quelle; video.load(); } video.play().catch(function () {}); }
      zeige();
    });
    zeige();
  });

  // Bildbetrachter: Bilder mit [data-gross] öffnen in einem <dialog>, Pfeiltasten blättern
  var bilder = Array.prototype.slice.call(document.querySelectorAll("[data-gross]"));
  if (bilder.length && window.HTMLDialogElement) {
    var dlg = document.createElement("dialog");
    dlg.className = "betrachter";
    dlg.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="b-zu" aria-label="Close">×</button>' +
      '<button type="button" class="b-vor" aria-label="Previous image">←</button>' +
      '<button type="button" class="b-nach" aria-label="Next image">→</button>';
    document.body.appendChild(dlg);
    var bild = dlg.querySelector("img"), text = dlg.querySelector("figcaption"), aktuell = 0;
    function zeigeBild(i) {
      aktuell = (i + bilder.length) % bilder.length;
      var b = bilder[aktuell];
      bild.src = b.dataset.gross; bild.alt = b.alt;
      text.textContent = b.alt + " · " + (aktuell + 1) + " / " + bilder.length;
    }
    bilder.forEach(function (b, i) {
      b.tabIndex = 0; b.setAttribute("role", "button");
      function oeffne() { zeigeBild(i); dlg.showModal(); }
      b.addEventListener("click", oeffne);
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); oeffne(); } });
    });
    dlg.querySelector(".b-zu").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".b-vor").addEventListener("click", function () { zeigeBild(aktuell - 1); });
    dlg.querySelector(".b-nach").addEventListener("click", function () { zeigeBild(aktuell + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") zeigeBild(aktuell - 1);
      if (e.key === "ArrowRight") zeigeBild(aktuell + 1);
    });
  }

  // Kopfleiste: Zustand nach dem ersten Scrollen; aktiver Abschnitt in der Navigation
  var kopf = document.querySelector("[data-kopf]");
  if (kopf) {
    var pruefe = function () { kopf.classList.toggle("fest", window.scrollY > 40); };
    window.addEventListener("scroll", pruefe, { passive: true });
    pruefe();
  }
  var links = document.querySelectorAll("[data-nav] a[href^='#']");
  if (links.length && "IntersectionObserver" in window) {
    var ziele = [];
    links.forEach(function (a) { var z = document.querySelector(a.getAttribute("href")); if (z) ziele.push([z, a]); });
    var nb = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        ziele.forEach(function (p) { if (p[0] === e.target) p[1].setAttribute("aria-current", "true"); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ziele.forEach(function (p) { nb.observe(p[0]); });
  }

  // Reiter (Install / Update / Uninstall): Pfeiltasten wechseln, wie es das ARIA-Muster vorsieht
  document.querySelectorAll("[role=tablist]").forEach(function (liste) {
    var reiter = Array.prototype.slice.call(liste.querySelectorAll("[role=tab]"));
    function waehle(r, fokus) {
      reiter.forEach(function (x) {
        var an = x === r;
        x.setAttribute("aria-selected", an ? "true" : "false");
        x.tabIndex = an ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !an;
      });
      if (fokus) r.focus();
    }
    reiter.forEach(function (r, i) {
      r.addEventListener("click", function () { waehle(r, false); });
      r.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (n === null) return;
        e.preventDefault();
        waehle(reiter[(n + reiter.length) % reiter.length], true);
      });
    });
  });

  // Bildreihe mit Knöpfen blättern
  document.querySelectorAll("[data-blaettern]").forEach(function (knopf) {
    var reihe = document.getElementById(knopf.dataset.blaettern);
    knopf.addEventListener("click", function () {
      var schritt = reihe.querySelector("figure").getBoundingClientRect().width + 12;
      reihe.scrollBy({ left: knopf.dataset.richtung === "vor" ? schritt : -schritt, behavior: ruhig ? "auto" : "smooth" });
    });
  });
})();
