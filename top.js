  // Mobile menu toggle
        document.getElementById('menu-btn').addEventListener('click', function() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        });

        // Product filtering
        const filterButtons = document.querySelectorAll('.filter-btn');
        const productCards = document.querySelectorAll('.product-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => {
                    btn.classList.remove('gold-bg', 'navy-text');
                    btn.classList.add('bg-gray-200');
                });
                
                // Add active class to clicked button
                button.classList.remove('bg-gray-200');
                button.classList.add('gold-bg', 'navy-text');
                
                const filter = button.getAttribute('data-filter');
                
                productCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-category') === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const mobileMenu = document.getElementById('mobile-menu');
                if (!mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            });
        });

        // تغيير الصورة عند النقر على زر اللون — preload then swap smoothly
        (function() {
            const imgCache = new Map(); // src -> Promise(Image)

            function preloadImage(src) {
                if (!src) return Promise.reject('no-src');
                const key = src;
                if (imgCache.has(key)) return imgCache.get(key);
                const p = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = (e) => reject(e);
                    img.src = encodeURI(src);
                });
                imgCache.set(key, p);
                return p;
            }

            document.addEventListener('click', function(e) {
                const btn = e.target.closest && e.target.closest('.color-btn') || (e.target.classList && e.target.classList.contains('color-btn') ? e.target : null);
                if (!btn) return;

                const productId = btn.getAttribute('data-product-id');
                const newImage = btn.getAttribute('data-image');
                const productImage = document.getElementById(`product-image-${productId}`);
                if (!productImage) return;

                // Update active state immediately
                document.querySelectorAll(`.color-btn[data-product-id="${productId}"]`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Preload then swap to avoid flicker
                preloadImage(newImage).then(img => {
                    productImage.classList.add('fade-out');
                    // small delay to allow CSS transition
                    setTimeout(() => {
                        productImage.src = img.src;
                        productImage.classList.remove('fade-out');
                    }, 120);
                }).catch(err => {
                    // If preload fails, still attempt a direct swap
                    console.warn('Image preload failed:', newImage, err);
                    productImage.src = newImage;
                });
            });

            // Preload color images for a product when that product card is visible
            if ('IntersectionObserver' in window) {
                const cardObserver = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const card = entry.target;
                            card.querySelectorAll('.color-btn[data-image]').forEach(b => {
                                const src = b.getAttribute('data-image');
                                preloadImage(src).catch(()=>{});
                            });
                            obs.unobserve(card);
                        }
                    });
                }, {threshold: 0.15});

                document.querySelectorAll('.product-card').forEach(card => cardObserver.observe(card));
            } else {
                // Fallback: preload all color images shortly after load
                setTimeout(() => {
                    document.querySelectorAll('.color-btn[data-image]').forEach(b => preloadImage(b.getAttribute('data-image')).catch(()=>{}));
                }, 1500);
            }
        })();

        // Ensure only the color button that matches the currently displayed image is active on page load
        function normalizePath(s) {
            if (!s) return '';
            try {
                return decodeURI(s).replace(/\\\\/g, '/').trim();
            } catch (e) {
                return String(s).replace(/\\\\/g, '/').trim();
            }
        }

        function initActiveColorButtons() {
            document.querySelectorAll('.product-card').forEach(card => {
                const img = card.querySelector('.product-main-image');
                if (!img) return;
                const currentSrc = img.getAttribute('src') || img.src || '';
                const normCurrent = normalizePath(currentSrc);

                let matched = false;
                const buttons = card.querySelectorAll('.color-btn[data-image]');
                buttons.forEach((btn, idx) => {
                    const dataImage = btn.getAttribute('data-image') || '';
                    const normData = normalizePath(dataImage);

                    // Remove any existing active class; we'll set the correct one below
                    btn.classList.remove('active');

                    // If the current image path equals or endsWith the data-image path, mark it
                    if (!matched && (normCurrent === normData || normCurrent.endsWith(normData))) {
                        btn.classList.add('active');
                        matched = true;
                    }
                });

                // If no matching button found, set the first button as active to avoid none being active
                if (!matched && buttons.length > 0) {
                    buttons[0].classList.add('active');
                }
            });
        }

        // Run on DOMContentLoaded so initial markup is settled
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initActiveColorButtons);
        } else {
            initActiveColorButtons();
        }

        // Dark mode toggle
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const body = document.body;
        
        // Check for saved user preference or use system preference
        if (localStorage.getItem('darkMode') === 'enabled' || 
            (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            enableDarkMode();
        }

        themeToggle.addEventListener('click', () => {
            // prefer the html 'dark' class (Tailwind) as the authoritative source
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });

        function enableDarkMode() {
            // Add Tailwind-compatible 'dark' to <html> and keep legacy 'dark-mode' on <body>
            document.documentElement.classList.add('dark');
            body.classList.add('dark-mode');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('darkMode', 'enabled');
        }

        function disableDarkMode() {
            document.documentElement.classList.remove('dark');
            body.classList.remove('dark-mode');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('darkMode', 'disabled');
        }


        document.addEventListener('DOMContentLoaded', () => {
            // Prefer the explicit ID if present
            const video = document.getElementById('hero-video') || document.querySelector('.video-background video');

            if (!video) return;

            // When sources are stored in data-src, assign them only when the video is near viewport
            const lazyLoadVideo = () => {
                const sources = video.querySelectorAll('source[data-src]');
                sources.forEach(s => {
                    const dataSrc = s.getAttribute('data-src');
                    if (dataSrc && !s.src) {
                        // encode spaces and other characters
                        s.src = encodeURI(dataSrc);
                    }
                });
                // load new sources and try to play (muted autoplay should be allowed)
                video.load();
                video.play().catch(e => console.log('Auto-play prevented or failed:', e));
            };

            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            lazyLoadVideo();
                            obs.disconnect();
                        }
                    });
                }, {threshold: 0.15});

                // observe the video element or its container for visibility
                io.observe(video.closest('.video-container') || video);
            } else {
                // Fallback: load shortly after DOM ready
                setTimeout(lazyLoadVideo, 300);
            }

            // Ensure video resumes when tab becomes active (Safari fix)
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    video.play().catch(e => console.log('Auto-play prevented:', e));
                }
            });
        });

        // Duplicate click handlers removed — image swapping and preloading handled above.

 