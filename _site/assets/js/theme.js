const updateIcons = (theme) => {
  const sunIcon = document.getElementById('icon-sun');
  const moonIcon = document.getElementById('icon-moon');
  
  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  }
};

const updateGiscusTheme = (theme) => {
  const iframe = document.querySelector('iframe.giscus-frame');
  if (!iframe) return;
  
  let giscusTheme = theme === 'dark' ? 'dark' : 'light';
  if (window.giscusThemeConfig) {
    giscusTheme = theme === 'dark' ? window.giscusThemeConfig.dark : window.giscusThemeConfig.light;
  }

  const message = {
    setConfig: {
      theme: giscusTheme
    }
  };
  iframe.contentWindow.postMessage({ giscus: message }, 'https://giscus.app');
};

const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateIcons(newTheme);
  updateGiscusTheme(newTheme);
};

const initTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = savedTheme || systemTheme;
  document.documentElement.setAttribute('data-theme', theme);
  updateIcons(theme);
};

initTheme();

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
  // Ensure icons are correct on load (in case initTheme ran before DOM was ready)
  const currentTheme = document.documentElement.getAttribute('data-theme');
  updateIcons(currentTheme);

  // Sync Giscus theme when it loads
  const giscusContainer = document.getElementById('giscus-container');
  if (giscusContainer) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const iframe = document.querySelector('iframe.giscus-frame');
          if (iframe) {
            iframe.addEventListener('load', () => {
              const currentTheme = document.documentElement.getAttribute('data-theme');
              updateGiscusTheme(currentTheme);
            });
            observer.disconnect();
          }
        }
      });
    });
    observer.observe(giscusContainer, { childList: true });
  }
});
