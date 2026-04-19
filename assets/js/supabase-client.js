/**
 * Inicializa el cliente de Supabase y lo expone en window.lpdaSupabase.
 * Requiere que esta página haya cargado antes:
 *   1) https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 *   2) /config.js (con LPDA_CONFIG)
 */
(function () {
    'use strict';

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase JS no está cargado. Revisa el <script src=".../supabase-js@2">');
        return;
    }

    const cfg = window.LPDA_CONFIG || {};
    if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR-PROJECT') ||
        !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes('YOUR-ANON')) {
        console.warn('config.js sin credenciales. La web funcionará con el catálogo por defecto.');
    }

    window.lpdaSupabase = window.supabase.createClient(
        cfg.SUPABASE_URL || 'https://placeholder.supabase.co',
        cfg.SUPABASE_ANON_KEY || 'placeholder-key',
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storage: window.localStorage,
                storageKey: 'lpda-auth'
            }
        }
    );

    window.lpdaStorageBucket = cfg.STORAGE_BUCKET || 'product-images';

    window.lpdaConfigIsReady = !(
        !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR-PROJECT') ||
        !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes('YOUR-ANON')
    );
})();
