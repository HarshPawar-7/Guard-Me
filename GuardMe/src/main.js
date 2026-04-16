// CSS already loaded via index.html, but can import here for Vite
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    const navTabs = document.querySelectorAll('.nav-tab');
    const modules = document.querySelectorAll('.module');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            navTabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked tab
            tab.classList.add('active');

            // Hide all modules
            modules.forEach(m => m.classList.remove('active'));
            // Show target module
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
});
