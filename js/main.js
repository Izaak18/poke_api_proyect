import { loadConfigs } from './api.js';
import * as UI from './ui.js';
import * as Theme from './theme.js';
import * as Quiz from './quiz.js';
import * as Library from './library.js';
import * as Flashcards from './flashcards.js';
import * as Comparator from './comparator.js';
import { initModal, setPracticeCallback, setCompareCallback } from './modal.js';

async function boot() {
  try {
    await loadConfigs();
  } catch (e) {
    console.error('Error loading configs:', e);
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center;color:#f1f5f9;font-family:sans-serif;line-height:1.6">
        <h2>⚠️ Error al cargar la aplicación</h2>
        <p>Debes servir los archivos con un servidor local.<br>
        Ej: <code style="background:#1e293b;padding:4px 8px;border-radius:4px">python -m http.server 8000</code></p>
      </div>`;
    return;
  }

  Theme.init();
  UI.initNav();

  UI.registerView('home', () => UI.updateHomeStats());
  UI.registerView('library', () => Library.init());
  UI.registerView('flashcards', () => Flashcards.start());
  UI.registerView('comparator', () => Comparator.init());

  Quiz.init();
  Flashcards.init();
  initModal();
  setPracticeCallback((p) => Quiz.practiceWith(p));
  setCompareCallback(async (p) => {
    UI.showView('comparator');
    await Comparator.prefillA(p.id);
  });

  UI.updateHomeStats();
}

boot();