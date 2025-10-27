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

        // تغيير الصورة عند النقر على زر اللون
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('color-btn')) {
                const productId = e.target.getAttribute('data-product-id');
                const newImage = e.target.getAttribute('data-image');
                const productImage = document.getElementById(`product-image-${productId}`);
                
                // تأثير التغيير السلس
                productImage.classList.add('fade-out');
                setTimeout(() => {
                    productImage.src = newImage;
                    productImage.classList.remove('fade-out');
                }, 300);
                
                // تحديث الزر النشط
                document.querySelectorAll(`.color-btn[data-product-id="${productId}"]`).forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
            }
        });

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
            if (body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
        
        function enableDarkMode() {
            body.classList.add('dark-mode');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('darkMode', 'enabled');
        }
        
        function disableDarkMode() {
            body.classList.remove('dark-mode');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('darkMode', 'disabled');
        }

        // تشغيل الفيديو الخلفية (lazy-load to improve initial load)
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

        // This remains the same in your top.js file
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const productId = this.getAttribute('data-product-id');
        const newImage = this.getAttribute('data-image');
        
        // Remove active class from all buttons for this product
        document.querySelectorAll(`.color-btn[data-product-id="${productId}"]`).forEach(b => {
            b.classList.remove('active');
        });
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Update the product image
        document.getElementById(`product-image-${productId}`).src = newImage;
    });
});

 