        document.getElementById('menu-btn').addEventListener('click', function() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        });

        // Product filtering
        const filterButtons = document.querySelectorAll('.filter-btn');
        const productCards = document.querySelectorAll('.product-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {

                filterButtons.forEach(btn => {
                    btn.classList.remove('gold-bg', 'navy-text');
                    btn.classList.add('bg-gray-200');
                });
                
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

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
                

                const mobileMenu = document.getElementById('mobile-menu');
                if (!mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            });
        });

        (function() {
            const imgCache = new Map(); 

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


                document.querySelectorAll(`.color-btn[data-product-id="${productId}"]`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');


                preloadImage(newImage).then(img => {
                    productImage.classList.add('fade-out');

                    setTimeout(() => {
                        productImage.src = img.src;
                        productImage.classList.remove('fade-out');
                    }, 120);
                }).catch(err => {
                    console.warn('Image preload failed:', newImage, err);
                    productImage.src = newImage;
                });
            });

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

                setTimeout(() => {
                    document.querySelectorAll('.color-btn[data-image]').forEach(b => preloadImage(b.getAttribute('data-image')).catch(()=>{}));
                }, 1500);
            }
        })();

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

                    btn.classList.remove('active');

                    if (!matched && (normCurrent === normData || normCurrent.endsWith(normData))) {
                        btn.classList.add('active');
                        matched = true;
                    }
                });


                if (!matched && buttons.length > 0) {
                    buttons[0].classList.add('active');
                }
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initActiveColorButtons);
        } else {
            initActiveColorButtons();
        }

        document.addEventListener('DOMContentLoaded', () => {
            const video = document.getElementById('hero-video') || document.querySelector('.video-background video');

            if (!video) return;


            const lazyLoadVideo = () => {
                const sources = video.querySelectorAll('source[data-src]');
                sources.forEach(s => {
                    const dataSrc = s.getAttribute('data-src');
                    if (dataSrc && !s.src) {

                        s.src = encodeURI(dataSrc);
                    }
                });

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

                io.observe(video.closest('.video-container') || video);
            } else {
                setTimeout(lazyLoadVideo, 300);
            }

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    video.play().catch(e => console.log('Auto-play prevented:', e));
                }
            });
        });