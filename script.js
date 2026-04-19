(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const modal = document.getElementById('orderModal');
    const modalProduct = document.getElementById('modalProduct');
    const yearEl = document.getElementById('year');

    if (yearEl) yearEl.textContent = new Date().getFullYear();

    function onScroll() {
        if (window.scrollY > 40) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function openModal(productName) {
        modalProduct.textContent = productName || 'Tu selección';
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        const callBtn = modal.querySelector('.modal-call');
        if (callBtn) setTimeout(() => callBtn.focus(), 80);
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.card').forEach((card) => {
        const product = card.getAttribute('data-product');
        const fire = (e) => {
            e.preventDefault();
            openModal(product);
        };
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            fire(e);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') fire(e);
        });
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Pedir ${product}`);
    });

    modal.addEventListener('click', (e) => {
        if (e.target.matches('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

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
})();
