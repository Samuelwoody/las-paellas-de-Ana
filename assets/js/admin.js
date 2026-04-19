(function () {
    'use strict';

    const TAG_STYLES = ['meat', 'veg', 'sea', 'mix', 'classic', 'cool', 'wine'];
    const CATEGORIES = { paella: 'Paella', ensalada: 'Ensalada', bebida: 'Bebida' };

    const SETTINGS_FIELDS = [
        'brand_name', 'brand_subtitle', 'logo_url',
        'hero_eyebrow', 'hero_title', 'hero_lead', 'hero_area',
        'phone_display', 'phone_tel',
        'address_line1', 'address_line2', 'restaurant_name'
    ];

    const state = {
        products: [],
        filter: 'all',
        editingId: null,
        deleteTargetId: null,
        uploadedImagePath: null,
        activePanel: 'products',
        settings: null
    };

    const els = {};

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function formatPrice(value) {
        if (value == null || value === '' || isNaN(Number(value))) return '—';
        const n = Number(value);
        return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    }

    function showNotice(msg, kind) {
        if (!els.notice) return;
        els.notice.hidden = false;
        els.notice.className = 'admin-notice admin-notice-' + (kind || 'info');
        els.notice.textContent = msg;
        setTimeout(() => { els.notice.hidden = true; }, 4500);
    }

    function showFormError(msg) {
        if (!els.formError) return;
        els.formError.textContent = msg;
        els.formError.hidden = false;
    }
    function clearFormError() {
        if (!els.formError) return;
        els.formError.hidden = true;
        els.formError.textContent = '';
    }

    // ------------------------- Auth guard -------------------------------
    async function requireAuth() {
        if (!window.lpdaConfigIsReady) {
            document.body.innerHTML = `
                <div class="admin-bootstrap-error">
                    <h1>Supabase no está configurado</h1>
                    <p>Rellena <code>config.js</code> con tu <code>SUPABASE_URL</code> y
                    <code>SUPABASE_ANON_KEY</code>, y ejecuta el SQL de
                    <code>supabase/schema.sql</code>. Ver <code>supabase/SETUP.md</code>.</p>
                    <a href="index.html" class="btn btn-primary">Volver a la web</a>
                </div>`;
            return null;
        }
        const { data, error } = await window.lpdaSupabase.auth.getSession();
        if (error || !data || !data.session) {
            window.location.replace('login.html');
            return null;
        }
        const user = data.session.user;
        if (els.adminUser) els.adminUser.textContent = user.email || '';
        return user;
    }

    // ------------------------- Products CRUD ----------------------------
    async function loadProducts() {
        els.tbody.innerHTML = '<tr><td colspan="8" class="admin-table-empty">Cargando productos…</td></tr>';
        const { data, error } = await window.lpdaSupabase
            .from('products')
            .select('*')
            .order('category')
            .order('sort_order', { ascending: true });

        if (error) {
            showNotice('Error cargando productos: ' + error.message, 'error');
            els.tbody.innerHTML = '<tr><td colspan="8" class="admin-table-empty">No se pudo cargar. ' + escapeHtml(error.message) + '</td></tr>';
            return;
        }
        state.products = data || [];
        renderTable();
    }

    function renderTable() {
        const rows = state.products.filter(p => state.filter === 'all' || p.category === state.filter);
        if (rows.length === 0) {
            els.tbody.innerHTML = '<tr><td colspan="8" class="admin-table-empty">No hay productos en esta categoría.<br><button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById(\'newProductBtn\').click()">+ Crear uno nuevo</button></td></tr>';
            return;
        }

        els.tbody.innerHTML = rows.map((p) => {
            const img = p.image_url
                ? `<div class="admin-img" style="background-image:url('${escapeHtml(p.image_url)}')"></div>`
                : `<div class="admin-img admin-img-empty">—</div>`;
            const tag = p.tag
                ? `<span class="tag tag-${escapeHtml(p.tag_style || 'meat')}">${escapeHtml(p.tag)}</span>`
                : '<span class="admin-mute">—</span>';
            const active = p.is_active
                ? '<span class="admin-badge admin-badge-on">Activo</span>'
                : '<span class="admin-badge admin-badge-off">Oculto</span>';

            return `
                <tr data-id="${escapeHtml(p.id)}">
                    <td>${img}</td>
                    <td><strong>${escapeHtml(p.name)}</strong><br><span class="admin-mute admin-desc">${escapeHtml((p.description||'').slice(0,80))}${(p.description||'').length>80?'…':''}</span></td>
                    <td>${escapeHtml(CATEGORIES[p.category] || p.category)}</td>
                    <td>${tag}</td>
                    <td>${escapeHtml(formatPrice(p.price))}</td>
                    <td>${escapeHtml(String(p.sort_order))}</td>
                    <td>${active}</td>
                    <td class="col-actions">
                        <button type="button" class="btn btn-sm btn-ghost-dark" data-action="edit" data-id="${escapeHtml(p.id)}">Editar</button>
                        <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${escapeHtml(p.id)}">Borrar</button>
                    </td>
                </tr>`;
        }).join('');
    }

    // ------------------------- Form modal --------------------------------
    function openForm(product) {
        clearFormError();
        state.uploadedImagePath = null;
        state.editingId = product && product.id ? product.id : null;
        els.modalTitle.textContent = state.editingId ? 'Editar producto' : 'Nuevo producto';
        els.form.reset();

        const fields = product || {};
        els.form.elements.id.value           = fields.id || '';
        els.form.elements.name.value         = fields.name || '';
        els.form.elements.category.value     = fields.category || 'paella';
        els.form.elements.description.value  = fields.description || '';
        els.form.elements.tag.value          = fields.tag || '';
        els.form.elements.tag_style.value    = TAG_STYLES.includes(fields.tag_style) ? fields.tag_style : 'meat';
        els.form.elements.price.value        = fields.price != null ? fields.price : '';
        els.form.elements.sort_order.value   = fields.sort_order != null ? fields.sort_order : (state.products.length * 10 + 10);
        els.form.elements.is_active.checked  = fields.is_active !== false;
        els.form.elements.image_url.value    = fields.image_url || '';
        updateImagePreview(fields.image_url || '');
        els.imageFileInput.value = '';

        els.productModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => els.form.elements.name.focus(), 60);
    }

    function closeForm() {
        els.productModal.hidden = true;
        document.body.style.overflow = '';
    }

    function updateImagePreview(url) {
        if (!els.imagePreview) return;
        if (url) {
            els.imagePreview.innerHTML = `<img src="${escapeHtml(url)}" alt="">`;
        } else {
            els.imagePreview.innerHTML = '<span>Sin imagen</span>';
        }
    }

    async function uploadImage(file) {
        const bucket = window.lpdaStorageBucket || 'product-images';
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const safeExt = ext.length > 5 ? 'jpg' : ext;
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
        const { error } = await window.lpdaSupabase.storage
            .from(bucket)
            .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw error;
        const { data } = window.lpdaSupabase.storage.from(bucket).getPublicUrl(path);
        return { url: data.publicUrl, path };
    }

    async function handleImageChange(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            showFormError('La imagen pesa más de 8 MB. Comprímela un poco.');
            e.target.value = '';
            return;
        }
        clearFormError();
        updateImagePreview(URL.createObjectURL(file));
        els.form.elements.image_url.value = ''; // se rellenará tras subir en submit

        try {
            const { url } = await uploadImage(file);
            els.form.elements.image_url.value = url;
            state.uploadedImagePath = url;
            updateImagePreview(url);
        } catch (err) {
            showFormError('No se pudo subir la imagen: ' + (err.message || err));
            updateImagePreview(els.form.elements.image_url.value || '');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        clearFormError();

        const fd = new FormData(els.form);
        const payload = {
            name:        String(fd.get('name') || '').trim(),
            category:    String(fd.get('category') || 'paella'),
            description: String(fd.get('description') || '').trim() || null,
            tag:         String(fd.get('tag') || '').trim() || null,
            tag_style:   String(fd.get('tag_style') || 'meat'),
            price:       fd.get('price') === '' || fd.get('price') == null ? null : Number(fd.get('price')),
            sort_order:  Number(fd.get('sort_order')) || 0,
            is_active:   fd.get('is_active') === 'on' || fd.get('is_active') === 'true' || els.form.elements.is_active.checked,
            image_url:   String(fd.get('image_url') || '').trim() || null
        };

        if (!payload.name) { showFormError('El nombre es obligatorio.'); return; }
        if (!CATEGORIES[payload.category]) { showFormError('Categoría no válida.'); return; }
        if (payload.price != null && (isNaN(payload.price) || payload.price < 0)) {
            showFormError('El precio no es válido.'); return;
        }

        els.saveBtn.disabled = true;
        els.saveBtn.textContent = 'Guardando…';

        try {
            if (state.editingId) {
                const { error } = await window.lpdaSupabase
                    .from('products').update(payload).eq('id', state.editingId);
                if (error) throw error;
                showNotice('Producto actualizado.', 'success');
            } else {
                const { error } = await window.lpdaSupabase
                    .from('products').insert(payload);
                if (error) throw error;
                showNotice('Producto creado.', 'success');
            }
            closeForm();
            await loadProducts();
        } catch (err) {
            showFormError('No se pudo guardar: ' + (err.message || err));
        } finally {
            els.saveBtn.disabled = false;
            els.saveBtn.textContent = 'Guardar';
        }
    }

    // ------------------------- Delete flow -------------------------------
    function openDelete(product) {
        state.deleteTargetId = product.id;
        els.deleteName.textContent = product.name;
        els.deleteModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }
    function closeDelete() {
        state.deleteTargetId = null;
        els.deleteModal.hidden = true;
        document.body.style.overflow = '';
    }
    async function confirmDelete() {
        if (!state.deleteTargetId) return;
        els.confirmDeleteBtn.disabled = true;
        els.confirmDeleteBtn.textContent = 'Borrando…';
        try {
            const { error } = await window.lpdaSupabase
                .from('products').delete().eq('id', state.deleteTargetId);
            if (error) throw error;
            showNotice('Producto borrado.', 'success');
            closeDelete();
            await loadProducts();
        } catch (err) {
            showNotice('No se pudo borrar: ' + (err.message || err), 'error');
        } finally {
            els.confirmDeleteBtn.disabled = false;
            els.confirmDeleteBtn.textContent = 'Sí, borrar';
        }
    }

    // ------------------------- Site settings -----------------------------
    async function loadSettings() {
        const { data, error } = await window.lpdaSupabase
            .from('site_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
        if (error) {
            showNotice('Error cargando ajustes: ' + error.message, 'error');
            return;
        }
        state.settings = data || {};
        fillSettingsForm(state.settings);
    }

    function fillSettingsForm(settings) {
        if (!els.settingsForm) return;
        SETTINGS_FIELDS.forEach((key) => {
            const input = els.settingsForm.elements[key];
            if (!input) return;
            input.value = settings[key] != null ? settings[key] : '';
        });
        updateLogoPreview(settings.logo_url || '');
        if (els.logoFileInput) els.logoFileInput.value = '';
    }

    function updateLogoPreview(url) {
        if (!els.logoPreview) return;
        if (url) {
            els.logoPreview.innerHTML = `<img src="${String(url).replace(/"/g,'&quot;')}" alt="">`;
        } else {
            els.logoPreview.innerHTML = '<span>Sin logo</span>';
        }
    }

    async function uploadSiteImage(file, prefix) {
        const bucket = window.lpdaStorageBucket || 'product-images';
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const safeExt = ext.length > 5 ? 'png' : ext;
        const path = `site/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
        const { error } = await window.lpdaSupabase.storage
            .from(bucket)
            .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw error;
        const { data } = window.lpdaSupabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }

    async function handleLogoChange(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
            els.settingsError.textContent = 'El logo pesa más de 4 MB.';
            els.settingsError.hidden = false;
            e.target.value = '';
            return;
        }
        els.settingsError.hidden = true;
        updateLogoPreview(URL.createObjectURL(file));
        try {
            const url = await uploadSiteImage(file, 'logo');
            els.settingsForm.elements.logo_url.value = url;
            updateLogoPreview(url);
        } catch (err) {
            els.settingsError.textContent = 'No se pudo subir el logo: ' + (err.message || err);
            els.settingsError.hidden = false;
            updateLogoPreview(els.settingsForm.elements.logo_url.value || '');
        }
    }

    async function handleSettingsSubmit(e) {
        e.preventDefault();
        els.settingsError.hidden = true;

        const payload = { id: 1 };
        SETTINGS_FIELDS.forEach((key) => {
            const input = els.settingsForm.elements[key];
            if (!input) return;
            const v = input.value.trim();
            payload[key] = v === '' ? null : v;
        });

        if (!payload.brand_name) {
            els.settingsError.textContent = 'El nombre de la marca no puede estar vacío.';
            els.settingsError.hidden = false;
            return;
        }

        els.saveSettingsBtn.disabled = true;
        els.saveSettingsBtn.textContent = 'Guardando…';

        try {
            const { error } = await window.lpdaSupabase
                .from('site_settings')
                .upsert(payload, { onConflict: 'id' });
            if (error) throw error;
            state.settings = payload;
            showNotice('Ajustes guardados. Se aplican al refrescar la web pública.', 'success');
        } catch (err) {
            els.settingsError.textContent = 'No se pudo guardar: ' + (err.message || err);
            els.settingsError.hidden = false;
        } finally {
            els.saveSettingsBtn.disabled = false;
            els.saveSettingsBtn.textContent = 'Guardar ajustes';
        }
    }

    function switchPanel(name) {
        state.activePanel = name;
        els.navBtns.forEach((b) => {
            const active = b.getAttribute('data-panel') === name;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.admin-panel').forEach((p) => {
            const active = p.id === 'panel-' + name;
            p.classList.toggle('is-active', active);
            p.hidden = !active;
        });

        if (name === 'settings' && !state.settings) {
            loadSettings();
        }
    }

    // ------------------------- Wiring ------------------------------------
    async function init() {
        els.adminUser       = document.getElementById('adminUser');
        els.logoutBtn       = document.getElementById('logoutBtn');
        els.newBtn          = document.getElementById('newProductBtn');
        els.tabs            = document.querySelectorAll('.admin-tab');
        els.tbody           = document.getElementById('productsBody');
        els.notice          = document.getElementById('adminNotice');
        els.productModal    = document.getElementById('productModal');
        els.modalTitle      = document.getElementById('productModalTitle');
        els.form            = document.getElementById('productForm');
        els.formError       = document.getElementById('formError');
        els.saveBtn         = document.getElementById('saveProductBtn');
        els.imagePreview    = document.getElementById('imagePreview');
        els.imageFileInput  = document.getElementById('imageFile');
        els.removeImageBtn  = document.getElementById('removeImageBtn');
        els.deleteModal     = document.getElementById('deleteModal');
        els.deleteName      = document.getElementById('deleteName');
        els.confirmDeleteBtn= document.getElementById('confirmDeleteBtn');
        els.navBtns         = document.querySelectorAll('.admin-nav-btn');
        els.settingsForm    = document.getElementById('settingsForm');
        els.settingsError   = document.getElementById('settingsError');
        els.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        els.logoFileInput   = document.getElementById('logoFile');
        els.logoPreview     = document.getElementById('logoPreview');
        els.removeLogoBtn   = document.getElementById('removeLogoBtn');

        const user = await requireAuth();
        if (!user) return;

        els.logoutBtn.addEventListener('click', async () => {
            await window.lpdaSupabase.auth.signOut();
            window.location.replace('login.html');
        });

        // Nav entre paneles
        els.navBtns.forEach((btn) => {
            btn.addEventListener('click', () => switchPanel(btn.getAttribute('data-panel')));
        });

        // Formulario de ajustes
        if (els.settingsForm) {
            els.settingsForm.addEventListener('submit', handleSettingsSubmit);
        }
        if (els.logoFileInput) {
            els.logoFileInput.addEventListener('change', handleLogoChange);
        }
        if (els.removeLogoBtn) {
            els.removeLogoBtn.addEventListener('click', () => {
                els.settingsForm.elements.logo_url.value = '';
                if (els.logoFileInput) els.logoFileInput.value = '';
                updateLogoPreview('');
            });
        }

        els.newBtn.addEventListener('click', () => openForm(null));

        els.tabs.forEach((btn) => {
            btn.addEventListener('click', () => {
                els.tabs.forEach(b => {
                    b.classList.remove('is-active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('is-active');
                btn.setAttribute('aria-selected', 'true');
                state.filter = btn.getAttribute('data-filter');
                renderTable();
            });
        });

        els.tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const product = state.products.find(p => String(p.id) === String(id));
            if (!product) return;
            if (btn.getAttribute('data-action') === 'edit') openForm(product);
            if (btn.getAttribute('data-action') === 'delete') openDelete(product);
        });

        els.productModal.addEventListener('click', (e) => {
            if (e.target.matches('[data-close]')) closeForm();
        });
        els.deleteModal.addEventListener('click', (e) => {
            if (e.target.matches('[data-close]')) closeDelete();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!els.productModal.hidden) closeForm();
                if (!els.deleteModal.hidden) closeDelete();
            }
        });

        els.form.addEventListener('submit', handleSubmit);
        els.imageFileInput.addEventListener('change', handleImageChange);
        els.removeImageBtn.addEventListener('click', () => {
            els.form.elements.image_url.value = '';
            els.imageFileInput.value = '';
            updateImagePreview('');
        });

        els.confirmDeleteBtn.addEventListener('click', confirmDelete);

        await loadProducts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
