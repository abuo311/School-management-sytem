export const notify = (message, type = 'info') => {
    if (typeof window === 'undefined' || !message) return;
    window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { message, type }
    }));
};
