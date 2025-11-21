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
  const message = {
    setConfig: {
      theme: theme === 'dark' ? 'dark' : 'light'
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
  // Giscus loads asynchronously, so we might need to wait or let it handle its own initial theme based on system preference
  // But if we have a saved preference, we should try to enforce it once Giscus loads.
  // For now, the script tag in comments.html uses 'preferred_color_scheme' or we can set it to a specific value.
  // To ensure consistency, we can try to update it after a delay or rely on the toggle.
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
});
