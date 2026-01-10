// Scroll to Top Feature
(function() {
  if (window.self !== window.top) return; // Only run in top frame

  const button = document.createElement('div');
  button.innerHTML = '⬆';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    opacity: 0;
    transition: opacity 0.3s, transform 0.2s;
    z-index: 2147483647;
    pointer-events: none;
    transform: translateY(10px);
  `;

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.body.appendChild(button);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
      button.style.transform = 'translateY(0)';
    } else {
      button.style.opacity = '0';
      button.style.pointerEvents = 'none';
      button.style.transform = 'translateY(10px)';
    }
  });
})();
