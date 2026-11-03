/*
 * Couche de données.
 *  - Mode réel : Firebase (Firestore + connexion par e-mail et mot de passe).
 *  - Mode démonstration : localStorage (uniquement si config.js n'a pas de configuration Firebase).
 * Les pages n'utilisent que l'objet global « Store ».
 */
(function () {
  var cfg = window.APP_CONFIG || {};
  var live = !!(cfg.firebase && cfg.firebase.apiKey);

  var EDITABLE = ['title', 'members', 'summary', 'languages', 'theme', 'corpusLink', 'presentationLink',
    'imageData', 'imageAlt', 'imageCredit', 'consent'];
  var PUB_FIELDS = ['title', 'members', 'summary', 'languages', 'theme', 'corpusLink', 'presentationLink',
    'imageData', 'imageAlt', 'imageCredit'];

  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; }
  function samePub(fiche, pub) {
    if (!pub) return false;
    return PUB_FIELDS.every(function (k) { return (fiche[k] || '') === (pub[k] || ''); });
  }

  /* ------------------------------------------------------------------ Firebase */
  var FB_VER = '10.12.2';
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Chargement impossible : ' + src)); };
      document.head.appendChild(s);
    });
  }

  function makeFirebaseStore() {
    var auth, db;
    function fromDoc(d) { var o = d.data(); o.id = d.id; return o; }
    return {
      live: true,
      init: function () {
        var base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
        return loadScript(base + 'firebase-app-compat.js').then(function () {
          return Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
        }).then(function () {
          firebase.initializeApp(cfg.firebase);
          auth = firebase.auth(); db = firebase.firestore();
        });
      },
      onAuth: function (cb) {
        auth.onAuthStateChanged(function (u) { cb(u ? { uid: u.uid, email: u.email, verified: !!u.emailVerified } : null); });
      },
      signIn: function (email, pw) { return auth.signInWithEmailAndPassword(email, pw); },
      signUp: function (email, pw) { return auth.createUserWithEmailAndPassword(email, pw); },
      resetPassword: function (email) { return auth.sendPasswordResetEmail(email); },
      sendVerification: function () { return auth.currentUser.sendEmailVerification(); },
      refreshUser: function () { return auth.currentUser.reload().then(function () { return auth.currentUser.getIdToken(true); }); },
      signOut: function () { return auth.signOut(); },

      getSettings: function () {
        return db.collection('config').doc('settings').get().then(function (d) {
          if (!d.exists) return { open: false, deadline: null, configured: false };
          var x = d.data();
          return { open: !!x.open, deadline: x.deadline ? x.deadline.toMillis() : null, configured: true };
        });
      },
      saveSettings: function (s) {
        return db.collection('config').doc('settings').set({
          open: !!s.open, deadline: firebase.firestore.Timestamp.fromMillis(s.deadline)
        });
      },

      listMine: function (uid) {
        return db.collection('fiches').where('ownerUid', '==', uid).get().then(function (qs) {
          return qs.docs.map(fromDoc);
        });
      },
      saveFiche: function (id, data, user) {
        var now = Date.now(), base = pick(data, EDITABLE), col = db.collection('fiches');
        if (!id) {
          var doc = Object.assign({}, base, {
            ownerUid: user.uid, ownerEmail: user.email, status: data.status, published: false,
            publishedAt: 0, adminComment: '', createdAt: now, updatedAt: now
          });
          return col.add(doc).then(function (ref) { return ref.id; });
        }
        return col.doc(id).update(Object.assign({}, base, { status: data.status, updatedAt: now })).then(function () { return id; });
      },
      deleteFiche: function (id) { return db.collection('fiches').doc(id).delete(); },

      listAll: function () {
        return db.collection('fiches').get().then(function (qs) { return qs.docs.map(fromDoc); });
      },
      adminSave: function (id, patch) {
        return db.collection('fiches').doc(id).update(Object.assign({}, patch, { updatedAt: Date.now() }));
      },
      publish: function (fiche) {
        var now = Date.now(), batch = db.batch();
        batch.set(db.collection('publications').doc(fiche.id), Object.assign(pick(fiche, PUB_FIELDS), { publishedAt: now }));
        batch.update(db.collection('fiches').doc(fiche.id), { published: true, publishedAt: now });
        return batch.commit();
      },
      unpublish: function (id) {
        var batch = db.batch();
        batch.delete(db.collection('publications').doc(id));
        batch.update(db.collection('fiches').doc(id), { published: false });
        return batch.commit();
      },
      listPublished: function () {
        return db.collection('publications').get().then(function (qs) { return qs.docs.map(fromDoc); });
      }
    };
  }

  /* ------------------------------------------------------------------ Démo (navigateur) */
  function makeDemoStore() {
    var listeners = [];
    function read(k, def) { try { var v = localStorage.getItem('demo_' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
    function write(k, v) { localStorage.setItem('demo_' + k, JSON.stringify(v)); }
    function denied() { var e = new Error('permission-denied'); e.code = 'permission-denied'; return e; }
    function user() { return read('user', null); }
    function isAdmin() { var u = user(); return !!u && u.email === 'enseignante@demo.local'; }
    function emit() { var u = user(); listeners.forEach(function (cb) { cb(u); }); }
    function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function svg(title, c1, c2) {
      var s = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><text x="400" y="270" font-family="sans-serif" font-size="46" fill="#fff" text-anchor="middle">' + title + '</text></svg>';
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
    }
    return {
      live: false,
      init: function () {
        if (!read('settings', null)) write('settings', { open: true, deadline: Date.now() + 30 * 86400000, configured: true });
        return Promise.resolve();
      },
      onAuth: function (cb) { listeners.push(cb); cb(user()); },
      signIn: function (email) { write('user', { uid: email.toLowerCase(), email: email.toLowerCase(), verified: true }); emit(); return Promise.resolve(); },
      signUp: function (email) { return this.signIn(email); },
      resetPassword: function () { return Promise.resolve(); },
      sendVerification: function () { return Promise.resolve(); },
      refreshUser: function () { return Promise.resolve(); },
      signOut: function () { localStorage.removeItem('demo_user'); emit(); return Promise.resolve(); },

      getSettings: function () { return Promise.resolve(read('settings', { open: false, deadline: null, configured: false })); },
      saveSettings: function (s) { if (!isAdmin()) return Promise.reject(denied()); write('settings', { open: !!s.open, deadline: s.deadline, configured: true }); return Promise.resolve(); },

      listMine: function (u) {
        var all = read('fiches', {});
        return Promise.resolve(Object.keys(all).map(function (k) { return all[k]; }).filter(function (f) { return f.ownerUid === u; }));
      },
      saveFiche: function (id, data, u) {
        var all = read('fiches', {}), now = Date.now(), base = pick(data, EDITABLE);
        if (!id) {
          id = uid();
          all[id] = Object.assign({ id: id }, base, { ownerUid: u.uid, ownerEmail: u.email, status: data.status, published: false, publishedAt: 0, adminComment: '', createdAt: now, updatedAt: now });
        } else {
          if (!all[id] || all[id].ownerUid !== u.uid) return Promise.reject(denied());
          Object.assign(all[id], base, { status: data.status, updatedAt: now });
        }
        write('fiches', all); return Promise.resolve(id);
      },
      deleteFiche: function (id) { var all = read('fiches', {}); delete all[id]; write('fiches', all); return Promise.resolve(); },

      listAll: function () {
        if (!isAdmin()) return Promise.reject(denied());
        var all = read('fiches', {}); return Promise.resolve(Object.keys(all).map(function (k) { return all[k]; }));
      },
      adminSave: function (id, patch) {
        if (!isAdmin()) return Promise.reject(denied());
        var all = read('fiches', {}); Object.assign(all[id], patch, { updatedAt: Date.now() }); write('fiches', all); return Promise.resolve();
      },
      publish: function (f) {
        if (!isAdmin()) return Promise.reject(denied());
        var pubs = read('pubs', {}), all = read('fiches', {}), now = Date.now();
        pubs[f.id] = Object.assign({ id: f.id }, pick(f, PUB_FIELDS), { publishedAt: now });
        all[f.id].published = true; all[f.id].publishedAt = now;
        write('pubs', pubs); write('fiches', all); return Promise.resolve();
      },
      unpublish: function (id) {
        if (!isAdmin()) return Promise.reject(denied());
        var pubs = read('pubs', {}), all = read('fiches', {});
        delete pubs[id]; if (all[id]) all[id].published = false;
        write('pubs', pubs); write('fiches', all); return Promise.resolve();
      },
      listPublished: function () { var p = read('pubs', {}); return Promise.resolve(Object.keys(p).map(function (k) { return p[k]; })); },

      /* Exemples de démonstration : clairement étiquetés, supprimables en un clic */
      loadSamples: function () {
        var all = read('fiches', {}), pubs = read('pubs', {}), now = Date.now();
        var items = [
          { t: '[EXEMPLE] Corpus de témoignages oraux', m: 'Prénom Exemple-A\nPrénom Exemple-B', l: 'Français, arabe', c: ['#f3c34f', '#e3949a'], pub: true },
          { t: '[EXEMPLE] Corpus de messages de forums', m: 'Prénom Exemple-C\nPrénom Exemple-D', l: 'Français, anglais', c: ['#b57be6', '#9db9f2'], pub: true },
          { t: '[EXEMPLE] Corpus de récits écrits', m: 'Prénom Exemple-E', l: 'Français', c: ['#e3949a', '#b57be6'], pub: false }
        ];
        items.forEach(function (it) {
          var id = uid();
          var f = {
            id: id, demo: true, title: it.t, members: it.m, summary: 'Texte d’exemple : ceci est une fiche fictive créée pour la démonstration.',
            languages: it.l, theme: 'Texte d’exemple : thématique et objectifs fictifs.', corpusLink: 'https://example.org/corpus',
            presentationLink: 'https://example.org/presentation', imageData: svg('Exemple', it.c[0], it.c[1]), imageAlt: 'Illustration d’exemple : dégradé de couleurs',
            imageCredit: 'Image générée pour la démonstration', consent: true, ownerUid: 'exemple@demo.local', ownerEmail: 'exemple@demo.local',
            status: it.pub ? 'validee' : 'envoyee', published: it.pub, publishedAt: it.pub ? now : 0, adminComment: '', createdAt: now, updatedAt: now
          };
          all[id] = f;
          if (it.pub) pubs[id] = Object.assign({ id: id, demo: true }, pick(f, PUB_FIELDS), { publishedAt: now });
        });
        write('fiches', all); write('pubs', pubs); return Promise.resolve();
      },
      clearSamples: function () {
        var all = read('fiches', {}), pubs = read('pubs', {});
        Object.keys(all).forEach(function (k) { if (all[k].demo) delete all[k]; });
        Object.keys(pubs).forEach(function (k) { if (pubs[k].demo) delete pubs[k]; });
        write('fiches', all); write('pubs', pubs); return Promise.resolve();
      },
      resetAll: function () {
        ['fiches', 'pubs', 'settings', 'user'].forEach(function (k) { localStorage.removeItem('demo_' + k); });
        return Promise.resolve();
      }
    };
  }

  window.Store = live ? makeFirebaseStore() : makeDemoStore();
  window.Store.samePub = samePub;
})();
