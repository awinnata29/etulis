document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-scroll-content]').forEach((content) => {
        const hint = content.closest('.note-scroll-shell')?.querySelector('[data-scroll-hint]');
        if (!hint) return;

        const update = () => hint.classList.toggle('visible', content.scrollHeight > content.clientHeight + 4 && content.scrollTop < 8);
        content.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    });
});
