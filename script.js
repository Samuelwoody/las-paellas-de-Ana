(function () {
    'use strict';

    const FALLBACK_IMAGES = {
        'paella':   'assets/paella-mixta.svg',
        'ensalada': 'assets/ensalada-fresca.svg',
        'bebida':   'assets/refrescos.svg'
    };

    const DEFAULT_CATALOG = {
        paella: [
            { name: 'Paella de Carne',       description: 'Pollo de corral, conejo, judía verde, garrofón y nuestro sofrito secreto.', tag: 'Carne',        tag_style: 'meat', image_url: 'assets/paella-carne.svg' },
            { name: 'Paella Vegetariana',    description: 'Alcachofa, pimientos, judía verde, tomate cherry y azafrán. 100% vegetal.',  tag: 'Vegetariana',  tag_style: 'veg',  image_url: 'assets/paella-vegetariana.svg' },
            { name: 'Paella de Marisco',     description: 'Gambas, mejillones, calamar y almejas sobre fumet de pescado.',              tag: 'Marisco',      tag_style: 'sea',  image_url: 'assets/paella-marisco.svg' },
            { name: 'Paella Mixta',          description: 'Lo mejor del mar y la tierra: pollo, gambas, mejillones y pimientos.',       tag: 'Mixta',        tag_style: 'mix',  image_url: 'assets/paella-mixta.svg' }
        ],
        ensalada: [
            { name: 'Ensalada Fresca de la Casa', description: 'Mezclum, tomate, cebolla morada, aceitunas y aliño de la casa.',       tag: 'Fresca',    tag_style: 'veg',     image_url: 'assets/ensalada-fresca.svg' },
            { name: 'Ensaladilla Rusa',           description: 'Receta de toda la vida: patata, atún, huevo, zanahoria y mayonesa casera.', tag: 'Clásica', tag_style: 'classic', image_url: 'assets/ensaladilla-rusa.svg' }
        ],
        bebida: [
            { name: 'Refrescos', description: 'Coca-Cola, Fanta, Aquarius, agua mineral y más.', tag: 'Fríos',     tag_style: 'cool', image_url: 'assets/refrescos.svg' },
            { name: 'Cervezas',  description: 'Mahou, Estrella Galicia, Alhambra y opción 0,0.', tag: 'Bien fría', tag_style: 'cool', image_url: 'assets/cervezas.svg' },
            { name: 'Vinos',     description: 'Tintos de Rioja y Ribera, blancos Verdejo y Rueda, rosados.', tag: 'Selección', tag_style: 'wine', image_url: 'assets/vinos.svg' }
        ]
    };

    const navbar = document.getElementById('navbar');
    const modal = document.getElementById('orderModal');
    const modalProduct = document.getElementById('modalProduct');
    const yearEl = document.getElementById('year');

    if (yearEl) yearEl.textContent = new Date().getFullYear();

    function onScroll() {
        if (!navbar) return;
        if (window.scrollY > 40) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function openModal(productName) {
        if (!modal || !modalProduct) return;
        modalProduct.textContent = productName || 'Tu selección';
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        const callBtn = modal.querySelector('.modal-call');
        if (callBtn) setTimeout(() => callBtn.focus(), 80);
    }

    function closeModal() {
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = '';
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.matches('[data-close]')) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.hidden) closeModal();
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (id.length <= 1) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = 70;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    // -------------------------- Product rendering ------------------------
    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatPrice(value) {
        if (value == null || value === '' || isNaN(Number(value))) return '';
        const n = Number(value);
        return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    }

    function buildCard(product, category) {
        const isPaella = category === 'paella';
        const img = product.image_url || FALLBACK_IMAGES[category] || FALLBACK_IMAGES.paella;
        const tag = product.tag
            ? `<span class="tag tag-${escapeHtml(product.tag_style || 'meat')}">${escapeHtml(product.tag)}</span>`
            : '';
        const price = formatPrice(product.price);
        const priceHtml = price ? `<div class="card-price">${escapeHtml(price)}</div>` : '';
        const button = isPaella
            ? `<button class="btn btn-order" type="button">Pide esta Paella</button>`
            : '';
        const classes = ['card', isPaella ? 'card-paella' : 'card-info'];
        if (category === 'bebida') classes.push('card-sm');

        const article = document.createElement('article');
        article.className = classes.join(' ');
        if (isPaella) article.setAttribute('data-product', product.name);
        article.innerHTML = `
            <div class="card-img" style="background-image:url('${escapeHtml(img)}')"></div>
            <div class="card-body">
                <div class="card-head">
                    <h3>${escapeHtml(product.name)}</h3>
                    ${tag}
                </div>
                <p>${escapeHtml(product.description || '')}</p>
                ${priceHtml}
                ${button}
            </div>`;

        if (isPaella) {
            article.setAttribute('tabindex', '0');
            article.setAttribute('role', 'button');
            article.setAttribute('aria-label', `Pide esta ${product.name}`);
            const fire = (e) => {
                if (e.target.closest('a')) return;
                e.preventDefault();
                openModal(product.name);
            };
            article.addEventListener('click', fire);
            article.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') fire(e);
            });
        }
        return article;
    }

    function renderCategory(category, products) {
        const grid = document.getElementById(`${category}s-grid`);
        if (!grid) return;
        grid.innerHTML = '';
        if (!products || products.length === 0) {
            grid.innerHTML = `<div class="menu-grid-empty">Aún no hay productos en esta sección.</div>`;
            return;
        }
        products.forEach((p) => grid.appendChild(buildCard(p, category)));
    }

    function renderDefaults() {
        renderCategory('paella',   DEFAULT_CATALOG.paella);
        renderCategory('ensalada', DEFAULT_CATALOG.ensalada);
        renderCategory('bebida',   DEFAULT_CATALOG.bebida);
    }

    async function loadProductsFromSupabase() {
        if (!window.lpdaSupabase || !window.lpdaConfigIsReady) {
            console.info('Supabase sin configurar — mostrando catálogo por defecto.');
            renderDefaults();
            return;
        }
        try {
            const { data, error } = await window.lpdaSupabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('category')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                renderDefaults();
                return;
            }

            const grouped = { paella: [], ensalada: [], bebida: [] };
            data.forEach((p) => {
                if (grouped[p.category]) grouped[p.category].push(p);
            });
            renderCategory('paella',   grouped.paella);
            renderCategory('ensalada', grouped.ensalada);
            renderCategory('bebida',   grouped.bebida);
        } catch (err) {
            console.error('Error cargando productos de Supabase:', err);
            renderDefaults();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadProductsFromSupabase);
    } else {
        loadProductsFromSupabase();
    }
})();
