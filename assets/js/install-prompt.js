/**
 * PWA install: registra el service worker, detecta instalabilidad y muestra
 * un popup invitando al usuario a añadir la web a su pantalla de inicio.
 *
 * Dispositivos cubiertos:
 * - Chrome/Edge/Samsung/Opera en Android/escritorio: evento beforeinstallprompt.
 * - Safari iOS: instrucciones manuales (Compartir → "Añadir a pantalla de inicio").
 * - Safari macOS 17+: admite beforeinstallprompt (nueva lógica).
 * - Ya instalado (standalone): no mostramos nada.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'lpda-install-prompt';
    const DAYS_BEFORE_RETRY = 7;
    const SHOW_DELAY_MS = 4500;

    let deferredPrompt = null;
    let popupShown = false;

    // ---------- Service Worker ----------
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch((err) => {
                console.warn('No se pudo registrar el service worker:', err);
            });
        });
    }

    // ---------- Estado persistente ----------
    function readState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }
    function writeState(patch) {
        try {
            const next = Object.assign({}, readState(), patch);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) { /* noop */ }
    }

    function isStandalone() {
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
               window.navigator.standalone === true;
    }

    function isIos() {
        const ua = window.navigator.userAgent || '';
        const iosUa = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        // iPadOS 13+ se identifica como Mac con touch. Detectamos con maxTouchPoints.
        const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
        return iosUa || iPadOS;
    }

    function shouldShow() {
        if (isStandalone()) return false;
        const state = readState();
        if (state.installed) return false;
        if (state.dismissedAt) {
            const elapsedDays = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
            if (elapsedDays < DAYS_BEFORE_RETRY) return false;
        }
        return true;
    }

    // ---------- Popup UI ----------
    const els = {};

    function queryEls() {
        els.popup    = document.getElementById('installPopup');
        els.cta      = document.getElementById('installCta');
        els.iosHelp  = document.getElementById('installIosHelp');
    }

    function showPopup() {
        if (popupShown || !els.popup) return;
        popupShown = true;
        els.popup.hidden = false;
        requestAnimationFrame(() => els.popup.classList.add('is-open'));
    }

    function closePopup(reason) {
        if (!els.popup) return;
        els.popup.classList.remove('is-open');
        setTimeout(() => { els.popup.hidden = true; }, 250);
        if (reason === 'dismiss') writeState({ dismissedAt: Date.now() });
    }

    async function handleCtaClick() {
        if (deferredPrompt) {
            // Android / Chrome / Edge: dispara el diálogo nativo del navegador.
            els.cta.disabled = true;
            try {
                deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice && choice.outcome === 'accepted') {
                    writeState({ installed: true });
                    closePopup('accepted');
                } else {
                    closePopup('dismiss');
                }
            } catch (e) {
                closePopup('dismiss');
            } finally {
                deferredPrompt = null;
                els.cta.disabled = false;
            }
            return;
        }

        if (isIos()) {
            // Safari iOS: no hay diálogo nativo, mostramos instrucciones.
            if (els.iosHelp) els.iosHelp.hidden = false;
            els.cta.hidden = true;
            return;
        }

        // Fallback: instrucciones genéricas.
        alert('En tu navegador, abre el menú y elige "Añadir a pantalla de inicio" o "Instalar app".');
    }

    function wireEvents() {
        if (!els.popup) return;
        els.popup.addEventListener('click', (e) => {
            if (e.target.matches('[data-close]')) closePopup('dismiss');
        });
        if (els.cta) els.cta.addEventListener('click', handleCtaClick);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && els.popup && !els.popup.hidden) closePopup('dismiss');
        });
    }

    // ---------- Eventos del navegador ----------
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (shouldShow()) scheduleShow();
    });

    window.addEventListener('appinstalled', () => {
        writeState({ installed: true });
        closePopup('accepted');
        deferredPrompt = null;
    });

    function scheduleShow() {
        setTimeout(() => {
            if (shouldShow()) showPopup();
        }, SHOW_DELAY_MS);
    }

    function init() {
        queryEls();
        wireEvents();

        // iOS: no dispara beforeinstallprompt. Si cumple condiciones, programamos el popup.
        if (isIos() && shouldShow()) {
            scheduleShow();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
