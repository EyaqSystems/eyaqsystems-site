(function () {
  if (typeof gsap === 'undefined') return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Hero entrance
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.hero-badge',    { opacity: 0, y: 30, duration: 0.8, delay: 0.3 })
    .from('.hero h1',       { opacity: 0, y: 40, duration: 1   }, '-=0.4')
    .from('.hero p',        { opacity: 0, y: 30, duration: 0.8 }, '-=0.6')
    .from('.hero-actions',  { opacity: 0, y: 20, duration: 0.6 }, '-=0.5')
    .from('.stat',          { opacity: 0, y: 20, duration: 0.5, stagger: 0.1 }, '-=0.3')
    .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.2');

  gsap.from('nav .brand', { opacity: 0, x: -20, duration: 0.8, delay: 0.2, ease: 'power2.out' });
  gsap.from('nav a',      { opacity: 0, y: -10, duration: 0.5, stagger: 0.08, delay: 0.4, ease: 'power2.out' });

  if (typeof ScrollTrigger !== 'undefined') {
    // Sections fade in on scroll
    gsap.utils.toArray('.section-3d').forEach(function (section, i) {
      gsap.to(section, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: i * 0.05,
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    // Cards stagger on scroll
    gsap.utils.toArray('.grid').forEach(function (grid) {
      gsap.from(grid.querySelectorAll('.card'), {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: grid,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    // Contact items slide in
    gsap.from('.contact-item', {
      opacity: 0,
      x: -20,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contact-grid',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

  } else {
    // Fallback: show all sections immediately
    gsap.utils.toArray('.section-3d').forEach(function (section) {
      gsap.to(section, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    });
  }
})();
