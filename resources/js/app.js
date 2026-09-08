document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-scroll-content]').forEach((content) => {
        const hint = content.closest('.note-scroll-shell')?.querySelector('[data-scroll-hint]');
        if (!hint) return;

        const update = () => hint.classList.toggle('visible', content.scrollHeight > content.clientHeight + 4 && content.scrollTop < 8);
        content.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    });

    // Promotional Floating Chat Widget Logic
    const promoCard = document.getElementById('promo-popup-card');
    const promoCloseBtn = document.getElementById('promo-close-btn');
    const promoFloatingTrigger = document.getElementById('promo-floating-trigger');

    if (promoCard && promoFloatingTrigger) {
        const STORAGE_KEY_SESSION = 'etulis_promo_widget_dismissed';

        const openWidget = () => {
            promoCard.classList.add('is-open');
            promoCard.setAttribute('aria-hidden', 'false');
        };

        const closeWidget = (e) => {
            if (e) e.stopPropagation();
            promoCard.classList.remove('is-open');
            promoCard.setAttribute('aria-hidden', 'true');
            try {
                sessionStorage.setItem(STORAGE_KEY_SESSION, '1');
            } catch (_) {}
        };

        const toggleWidget = () => {
            if (promoCard.classList.contains('is-open')) {
                closeWidget();
            } else {
                openWidget();
            }
        };

        promoCloseBtn?.addEventListener('click', closeWidget);
        promoFloatingTrigger.addEventListener('click', toggleWidget);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && promoCard.classList.contains('is-open')) {
                closeWidget();
            }
        });

        // Auto open after 1.2s if not dismissed in current session
        let isDismissed = false;
        try {
            isDismissed = sessionStorage.getItem(STORAGE_KEY_SESSION) === '1';
        } catch (_) {}

        if (!isDismissed) {
            setTimeout(openWidget, 1200);
        }
    }
});
