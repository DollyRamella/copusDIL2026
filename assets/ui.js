/* Éléments d'interface partagés : en-tête, formulaire de fiche, validation, images, export. */
(function () {
  var cfg = window.APP_CONFIG || {};

  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    Array.prototype.slice.call(arguments, 2).forEach(function add(kid) {
      if (kid === null || kid === undefined || kid === false) return;
      if (Array.isArray(kid)) { kid.forEach(add); return; }
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
    return el;
  }

  /* Accepte uniquement les adresses https:// valides */
  function safeUrl(s) {
    s = (s || '').trim();
    if (!s || /\s/.test(s)) return null;
    try { var u = new URL(s); return u.protocol === 'https:' && u.hostname.indexOf('.') > 0 ? u.href : null; } catch (e) { return null; }
  }
  function safeImage(s) {
    return typeof s === 'string' && /^data:image\/(jpeg|png|webp|svg\+xml)[;,]/.test(s) ? s : '';
  }

  var FIELDS = [
    { key: 'title', label: 'Intitulé du corpus', required: true, type: 'text', max: 100,
      help: 'Le titre qui apparaîtra sur la carte (100 caractères maximum).' },
    { key: 'members', label: 'Prénoms et noms des étudiants du groupe', required: true, type: 'textarea', rows: 4, max: 500,
      help: 'Un étudiant par ligne, sous la forme « Prénom NOM ».' },
    { key: 'summary', label: 'Présentation synthétique du corpus', required: true, type: 'textarea', rows: 5, max: 800,
      help: 'Trois à cinq phrases : nature des données, volume, mode de constitution (800 caractères maximum).' },
    { key: 'languages', label: 'Langue ou langues concernées', required: true, type: 'text', max: 150,
      help: 'Séparez les langues par des virgules, par exemple : français, arabe.' },
    { key: 'theme', label: 'Thématique et objectifs du travail', required: true, type: 'textarea', rows: 5, max: 1000,
      help: 'Quel thème avez-vous exploré, et quels objectifs poursuiviez-vous ? (1 000 caractères maximum).' },
    { key: 'corpusLink', label: 'Lien vers le corpus ou les ressources associées', required: false, type: 'url', max: 500,
      help: 'Adresse complète commençant par https://. Vérifiez que le lien s’ouvre sans compte ni mot de passe.' },
    { key: 'presentationLink', label: 'Lien vers la présentation prévue pour le séminaire', required: false, type: 'url', max: 500,
      help: 'Facultatif à l’envoi, mais indispensable pour publier la fiche : le bouton « Voir la présentation » ouvrira ce lien. Adresse commençant par https://.' }
  ];
  var EMPTY = { title: '', members: '', summary: '', languages: '', theme: '', corpusLink: '', presentationLink: '',
    imageData: '', imageAlt: '', imageCredit: '', consent: false };

  var STATUS = {
    brouillon: 'Brouillon',
    envoyee: 'Envoyée, en attente de vérification',
    modifs: 'Modifications demandées',
    validee: 'Validée'
  };

  /* submit = true : contrôle des champs obligatoires. Sinon : formats et longueurs seulement. */
  function validate(d, submit) {
    var e = {};
    FIELDS.forEach(function (f) {
      var v = (d[f.key] || '').trim();
      if (f.required && submit && !v) e[f.key] = 'Ce champ est obligatoire.';
      else if (f.type === 'url' && v && !safeUrl(v)) e[f.key] = 'Lien invalide : saisissez une adresse complète commençant par https://';
      else if (v.length > f.max) e[f.key] = 'Texte trop long (' + f.max + ' caractères maximum).';
    });
    if (!(d.title || '').trim() && !e.title) e.title = 'Indiquez au moins un intitulé pour enregistrer la fiche.';
    if (submit) {
      if (!d.imageData) e.imageData = 'Ajoutez une image d’illustration.';
      if (!(d.imageAlt || '').trim()) e.imageAlt = 'Le texte alternatif est obligatoire (il décrit l’image pour les personnes qui ne la voient pas).';
      if (!(d.imageCredit || '').trim()) e.imageCredit = 'Indiquez les crédits (auteur, source ou licence ; « Production du groupe » si l’image est la vôtre).';
      if (!d.consent) e.consent = 'Votre accord est nécessaire pour envoyer la fiche.';
    }
    return e;
  }
  /* Informations manquantes pour le repérage côté enseignante */
  function missing(d) {
    var m = [];
    FIELDS.forEach(function (f) { if ((f.required || f.key === 'presentationLink') && !(d[f.key] || '').trim()) m.push(f.key === 'presentationLink' ? 'Lien présentation' : f.label.split(' ').slice(0, 3).join(' ')); });
    if (!d.imageData) m.push('Image');
    else {
      if (!(d.imageAlt || '').trim()) m.push('Texte alternatif');
      if (!(d.imageCredit || '').trim()) m.push('Crédits');
    }
    return m;
  }

  /* Redimensionne et compresse l'image côté navigateur (JPEG) */
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = Math.min(img.naturalWidth, cfg.imageMaxWidth || 1200), q = 0.85, out = '';
        var limit = (cfg.imageTargetKB || 350) * 1024;
        for (var i = 0; i < 12; i++) {
          var hgt = Math.round(img.naturalHeight * (w / img.naturalWidth));
          var c = document.createElement('canvas'); c.width = w; c.height = hgt;
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt); ctx.drawImage(img, 0, 0, w, hgt);
          out = c.toDataURL('image/jpeg', q);
          if (out.length * 0.75 <= limit) break;
          if (q > 0.55) q -= 0.1; else w = Math.round(w * 0.8);
        }
        resolve(out);
      };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------ En-tête, pied de page */
  function mountChrome(active) {
    document.title = (document.title ? document.title + ' — ' : '') + cfg.siteTitle;
    var nav = [['index.html', 'Galerie des travaux', 'index'], ['depot.html', 'Déposer ma fiche', 'depot']];
    var header = document.getElementById('top');
    header.className = 'site-header';
    header.append(h('div', { class: 'wrap' },
      h('a', { class: 'brand', href: 'index.html' },
        cfg.logoUrl ? h('img', { src: cfg.logoUrl, alt: '' }) : null,
        h('span', {}, cfg.siteTitle, h('small', {}, cfg.siteSubtitle))),
      h('nav', { class: 'nav', 'aria-label': 'Navigation principale' },
        nav.map(function (n) { return h('a', { href: n[0], 'aria-current': active === n[2] ? 'page' : null }, n[1]); }))));
    if (!window.Store.live) {
      header.after(h('div', { class: 'demo-banner', id: 'demoBanner' }, h('div', { class: 'wrap' },
        h('strong', {}, 'Mode démonstration'),
        h('span', {}, 'Les données restent uniquement dans ce navigateur et ne sont partagées avec personne. Renseignez config.js pour activer la collecte réelle.'))));
    }
    var foot = document.getElementById('foot');
    if (foot) {
      foot.className = 'site-footer';
      foot.append(h('div', { class: 'wrap' },
        h('p', {}, 'Les noms des étudiants, les images et les liens affichés sur ce site sont publiés avec l’accord des groupes concernés, qui l’ont donné en envoyant leur fiche. Les adresses e-mail servent uniquement à l’accès aux fiches et ne sont jamais publiées.'),
        h('p', {}, cfg.contactPublic ? 'Pour demander la modification ou le retrait d’une fiche : ' + cfg.contactPublic + '.' : 'Pour demander la modification ou le retrait d’une fiche, contactez l’enseignante responsable du séminaire.'),
        h('p', {}, h('a', { href: 'gestion.html' }, 'Espace enseignante'))));
    }
  }

  /* ------------------------------------------------------------ Formulaire de fiche */
  var seq = 0;
  function buildForm(opts) {
    var data = Object.assign({}, EMPTY, opts.data || {});
    var readOnly = !!opts.readOnly, n = ++seq, state = { imageData: data.imageData || '' };
    var root = h('form', { class: 'fiche-form', novalidate: true, onsubmit: function (e) { e.preventDefault(); } });
    var inputs = {}, errs = {};

    function wrap(key, labelEl, helpText, input) {
      var helpId = 'h_' + key + n, errId = 'e_' + key + n;
      input.setAttribute('aria-describedby', (helpText ? helpId + ' ' : '') + errId);
      var err = h('p', { class: 'error', id: errId, role: 'alert' });
      errs[key] = err;
      var box = h('div', { class: 'field', 'data-key': key }, labelEl, helpText ? h('p', { class: 'help', id: helpId }, helpText) : null, input, err);
      return box;
    }
    function reqTag(r) { return h('span', { class: r ? 'req' : 'opt' }, r ? ' (obligatoire)' : ' (facultatif)'); }

    FIELDS.forEach(function (f) {
      var id = 'f_' + f.key + n;
      var input = f.type === 'textarea'
        ? h('textarea', { id: id, rows: f.rows || 4, maxlength: f.max })
        : h('input', { id: id, type: f.type === 'url' ? 'url' : 'text', maxlength: f.max, placeholder: f.type === 'url' ? 'https://…' : null, autocomplete: 'off' });
      input.value = data[f.key] || '';
      if (readOnly) input.disabled = true;
      inputs[f.key] = input;
      root.append(wrap(f.key, h('label', { class: 'lbl', for: id }, f.label, reqTag(f.required)), f.help, input));
    });

    // Image d'illustration
    var preview = h('div', { class: 'preview' });
    var fileInput = h('input', { id: 'f_img' + n, type: 'file', accept: 'image/jpeg,image/png,image/webp', disabled: readOnly });
    var imgErr = h('p', { class: 'error', role: 'alert', id: 'e_imageData' + n }); errs.imageData = imgErr;
    function drawPreview() {
      preview.textContent = '';
      var src = safeImage(state.imageData);
      if (src) {
        preview.append(h('img', { src: src, alt: 'Aperçu de l’image téléversée' }));
        if (!readOnly) preview.append(h('button', { type: 'button', class: 'btn secondary small', onclick: function () { state.imageData = ''; fileInput.value = ''; drawPreview(); } }, 'Retirer l’image'));
      }
    }
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0]; imgErr.textContent = '';
      if (!f) return;
      if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { imgErr.textContent = 'Format non accepté : utilisez une image JPEG, PNG ou WebP.'; fileInput.value = ''; return; }
      if (f.size > (cfg.maxImageMB || 5) * 1024 * 1024) { imgErr.textContent = 'Fichier trop lourd : ' + (cfg.maxImageMB || 5) + ' Mo maximum.'; fileInput.value = ''; return; }
      imgErr.textContent = 'Traitement de l’image…';
      compressImage(f).then(function (d) { state.imageData = d; imgErr.textContent = ''; drawPreview(); })
        .catch(function (e) { imgErr.textContent = e.message; });
    });
    drawPreview();
    var alt = h('input', { id: 'f_alt' + n, type: 'text', maxlength: 250, autocomplete: 'off', disabled: readOnly }); alt.value = data.imageAlt || ''; inputs.imageAlt = alt;
    var cred = h('input', { id: 'f_cred' + n, type: 'text', maxlength: 150, autocomplete: 'off', disabled: readOnly }); cred.value = data.imageCredit || ''; inputs.imageCredit = cred;
    root.append(h('fieldset', {},
      h('legend', { class: 'lbl' }, 'Image d’illustration', reqTag(true)),
      h('div', { class: 'field', 'data-key': 'imageData' },
        h('label', { class: 'lbl', for: 'f_img' + n }, 'Image à téléverser'),
        h('p', { class: 'help' }, 'Formats JPEG, PNG ou WebP, ' + (cfg.maxImageMB || 5) + ' Mo maximum. L’image est redimensionnée automatiquement. Elle apparaîtra sur la carte (format paysage conseillé).'),
        fileInput, preview, imgErr),
      wrap('imageAlt', h('label', { class: 'lbl', for: 'f_alt' + n }, 'Texte alternatif de l’image', reqTag(true)),
        'Décrivez l’image en une phrase, pour les personnes qui ne peuvent pas la voir (250 caractères maximum).', alt),
      wrap('imageCredit', h('label', { class: 'lbl', for: 'f_cred' + n }, 'Crédits de l’image', reqTag(true)),
        'Auteur, source ou licence. Utilisez uniquement une image dont vous avez le droit de vous servir. Écrivez « Production du groupe » si l’image est la vôtre.', cred)));

    // Autorisation de publication
    var consent = h('input', { type: 'checkbox', id: 'f_consent' + n, disabled: readOnly }); consent.checked = !!data.consent;
    var cErr = h('p', { class: 'error', role: 'alert' }); errs.consent = cErr;
    root.append(h('div', { class: 'field', 'data-key': 'consent' },
      h('div', { class: 'check' }, consent,
        h('label', { for: 'f_consent' + n }, 'J’ai l’accord de tous les membres du groupe pour que les noms, l’image et les liens ci-dessus soient publiés sur le site du séminaire une fois la fiche validée par l’enseignante. ', reqTag(true))),
      cErr));
    root.append(h('p', { class: 'help' }, 'Les adresses e-mail ne sont jamais publiées. Aucune donnée n’est affichée publiquement avant validation et publication par l’enseignante.'));

    return {
      el: root,
      getData: function () {
        var d = {};
        FIELDS.forEach(function (f) { d[f.key] = inputs[f.key].value.trim(); });
        d.imageData = state.imageData; d.imageAlt = alt.value.trim(); d.imageCredit = cred.value.trim(); d.consent = consent.checked;
        return d;
      },
      showErrors: function (e) {
        Object.keys(errs).forEach(function (k) { errs[k].textContent = e[k] || ''; var box = errs[k].closest('.field'); if (box) box.classList.toggle('has-error', !!e[k]); });
        var first = Object.keys(e)[0];
        if (first) {
          var box = errs[first].closest('.field'), f = box && box.querySelector('input,textarea');
          if (f) f.focus();
        }
      }
    };
  }

  /* ------------------------------------------------------------ Divers */
  function fmtDate(ms) {
    return ms ? new Date(ms).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '—';
  }
  function toLocalInput(ms) {
    var d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  }
  function csvCell(v) {
    v = String(v === null || v === undefined ? '' : v).replace(/\r?\n/g, ' ');
    if (/^[=+\-@\t]/.test(v)) v = "'" + v;   // évite l'interprétation en formule dans le tableur
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function downloadCSV(rows, name) {
    var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
    var a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: name });
    document.body.append(a); a.click(); a.remove();
  }
  function message(el, kind, text) {
    el.textContent = ''; el.className = 'notice ' + (kind || '');
    if (!text) { el.hidden = true; return; }
    el.hidden = false; el.append(h('p', {}, text));
  }
  function friendlyError(e) {
    var c = e && (e.code || e.message) || '';
    if (/permission-denied/.test(c)) return 'Action refusée : la collecte est peut-être fermée, la date limite dépassée, ou la fiche n’est plus modifiable.';
    if (/invalid-email/.test(c)) return 'Adresse e-mail invalide.';
    if (/invalid-credential|wrong-password|user-not-found/.test(c)) return 'Adresse e-mail ou mot de passe incorrect.';
    if (/email-already-in-use/.test(c)) return 'Un compte existe déjà avec cette adresse : utilisez « Se connecter » (ou « Mot de passe oublié »).';
    if (/weak-password/.test(c)) return 'Mot de passe trop court : 8 caractères minimum.';
    if (/operation-not-allowed/.test(c)) return 'La connexion par e-mail et mot de passe n’est pas activée dans Firebase (voir README, étape 3).';
    if (/too-many-requests/.test(c)) return 'Trop de tentatives : réessayez dans quelques minutes.';
    if (/unauthorized-continue-uri|invalid-continue-uri/.test(c)) return 'Ce domaine n’est pas autorisé dans Firebase (voir README, étape 3).';
    if (/network|unavailable/.test(c)) return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
    return 'Une erreur est survenue : ' + (e && e.message ? e.message : c);
  }

  /* Ajoute des enfants à un élément en ignorant null/false et en aplatissant les tableaux */
  function append(parent) {
    Array.prototype.slice.call(arguments, 1).forEach(function add(k) {
      if (k === null || k === undefined || k === false) return;
      if (Array.isArray(k)) { k.forEach(add); return; }
      parent.append(k.nodeType ? k : document.createTextNode(String(k)));
    });
    return parent;
  }

  window.UI = { append: append, h: h, safeUrl: safeUrl, safeImage: safeImage, FIELDS: FIELDS, STATUS: STATUS, validate: validate, missing: missing,
    mountChrome: mountChrome, buildForm: buildForm, fmtDate: fmtDate, toLocalInput: toLocalInput, downloadCSV: downloadCSV,
    message: message, friendlyError: friendlyError };
})();
