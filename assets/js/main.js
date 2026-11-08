// قائمة الموبايل
document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('hidden');
});

// سكرول ناعم للروابط الداخلية
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
    document.getElementById('mobile-menu').classList.add('hidden');
  });
});

// تحميل فيديو الهيرو عند ظهوره
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('hero-video');
  if (!video) return;
  const load = () => {
    video.querySelectorAll('source[data-src]').forEach(s => {
      if (!s.src) s.src = encodeURI(s.dataset.src);
    });
    video.load();
    video.play().catch(() => {});
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)) { load(); obs.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(video.closest('.video-container') || video);
  } else { setTimeout(load, 300); }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) video.play().catch(() => {});
  });
});
