/* =========================================================
   GDL — Shared website interactions
   ========================================================= */

/* Animated learning deck on the homepage */
(() => {
    const deck = document.getElementById('gdlAnimationDeck');

    if (!deck) {
        return;
    }

    const slidesTrack = document.getElementById('gdlAnimationSlides');
    const slides = [
        document.getElementById('gdlAnimationSlideOne'),
        document.getElementById('gdlAnimationSlideTwo')
    ];
    const dots = Array.from(deck.querySelectorAll('.page-dot'));
    const previousButton = document.getElementById('gdlDeckPrev');
    const nextButton = document.getElementById('gdlDeckNext');
    const pageCount = document.getElementById('gdlDeckPageCount');

    if (
        !slidesTrack ||
        slides.some((slide) => !slide) ||
        !previousButton ||
        !nextButton ||
        !pageCount
    ) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let currentSlide = 0;

    function showSlide(index) {
        currentSlide = Math.max(0, Math.min(slides.length - 1, index));

        slidesTrack.style.transform = `translateX(-${currentSlide * 50}%)`;

        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === currentSlide;
            slide.classList.toggle('active', isActive);
            slide.classList.remove('play');
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentSlide;
            dot.classList.toggle('selected', isActive);
            dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        });

        pageCount.textContent = `0${currentSlide + 1} / 0${slides.length}`;
        previousButton.disabled = currentSlide === 0;
        nextButton.disabled = currentSlide === slides.length - 1;

        window.setTimeout(() => {
            slides[currentSlide].classList.add('play');
            drawAll();
        }, 180);
    }

    previousButton.addEventListener('click', () => showSlide(currentSlide - 1));
    nextButton.addEventListener('click', () => showSlide(currentSlide + 1));

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });

    deck.addEventListener('keydown', (event) => {
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) {
            return;
        }

        if (event.key === 'ArrowRight') {
            showSlide(currentSlide + 1);
        }

        if (event.key === 'ArrowLeft') {
            showSlide(currentSlide - 1);
        }
    });

    function getPoint(element, svg, width, height) {
        const elementRect = element.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();

        if (!svgRect.width || !svgRect.height) {
            return null;
        }

        return {
            x: ((elementRect.left + elementRect.width / 2 - svgRect.left) / svgRect.width) * width,
            y: ((elementRect.top + elementRect.height / 2 - svgRect.top) / svgRect.height) * height,
            radiusX: (elementRect.width / 2 / svgRect.width) * width,
            radiusY: (elementRect.height / 2 / svgRect.height) * height
        };
    }

    function addConnector(group, svg, fromElement, toElement, index, width, height, curve = 0) {
        const start = getPoint(fromElement, svg, width, height);
        const end = getPoint(toElement, svg, width, height);

        if (!start || !end) {
            return;
        }

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;
        const unitX = dx / length;
        const unitY = dy / length;

        const startOffset = Math.min(start.radiusX, start.radiusY) + 4;
        const endOffset = Math.min(end.radiusX, end.radiusY) + 4;

        const startX = start.x + unitX * startOffset;
        const startY = start.y + unitY * startOffset;
        const endX = end.x - unitX * endOffset;
        const endY = end.y - unitY * endOffset;

        const bend = curve || Math.min(30, length * 0.04);
        const controlX = (startX + endX) / 2 - unitY * bend;
        const controlY = (startY + endY) / 2 + unitX * bend;
        const pathData = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
        const svgNamespace = 'http://www.w3.org/2000/svg';

        const baseLine = document.createElementNS(svgNamespace, 'path');
        baseLine.setAttribute('d', pathData);
        baseLine.setAttribute('class', 'base-line');

        const animatedLine = document.createElementNS(svgNamespace, 'path');
        animatedLine.setAttribute('d', pathData);
        animatedLine.setAttribute('class', 'animated-line');

        group.append(baseLine, animatedLine);

        const pathLength = animatedLine.getTotalLength() || 1;
        animatedLine.style.strokeDasharray = String(pathLength);
        animatedLine.style.strokeDashoffset = String(pathLength);
        animatedLine.style.animation = `draw-line .9s ease ${0.2 + index * 0.32}s forwards`;

        const movingDot = document.createElementNS(svgNamespace, 'circle');
        movingDot.setAttribute('r', '3.3');
        movingDot.setAttribute('class', 'light-dot');

        if (!prefersReducedMotion) {
            const motion = document.createElementNS(svgNamespace, 'animateMotion');
            motion.setAttribute('path', pathData);
            motion.setAttribute('dur', `${2.8 + (index % 3) * 0.45}s`);
            motion.setAttribute('repeatCount', 'indefinite');
            motion.setAttribute('begin', `${0.4 + index * 0.28}s`);
            movingDot.appendChild(motion);
        }

        group.appendChild(movingDot);
    }

    function buildRadialConnections() {
        const svg = document.getElementById('gdlRadialSvg');
        const group = document.getElementById('gdlRadialLines');
        const hub = document.getElementById('gdlMainHub');

        if (!svg || !group || !hub) {
            return;
        }

        group.replaceChildren();

        const nodes = Array.from(deck.querySelectorAll('[data-radial]'));

        nodes.forEach((node, index) => {
            addConnector(group, svg, hub, node, index, 1200, 650, 18);
        });
    }

    function buildWorkflowConnections() {
        const svg = document.getElementById('gdlWorkflowSvg');
        const group = document.getElementById('gdlWorkflowLines');
        const hub = document.getElementById('gdlWorkflowHub');

        if (!svg || !group || !hub) {
            return;
        }

        group.replaceChildren();

        const nodes = Array.from(deck.querySelectorAll('[data-flow]'));

        if (!nodes.length) {
            return;
        }

        nodes.forEach((node, index) => {
            const nextNode = nodes[index + 1] || hub;
            addConnector(group, svg, node, nextNode, index, 1200, 650, index % 2 === 0 ? 15 : -15);
        });

        addConnector(group, svg, hub, nodes[0], nodes.length, 1200, 650, 20);
    }

    function drawAll() {
        window.requestAnimationFrame(() => {
            buildRadialConnections();
            buildWorkflowConnections();
        });
    }

    window.addEventListener('load', () => {
        drawAll();
        showSlide(0);
    }, { once: true });

    window.addEventListener('resize', drawAll);

    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(drawAll);
        const observedElements = deck.querySelectorAll(
            '.visual, .main-hub, .workflow-hub, .radial-node, .flow-node'
        );

        observedElements.forEach((element) => observer.observe(element));
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(drawAll);
    }
})();


/* Mobile navigation */
(() => {
    const toggle = document.getElementById('gdlMobileToggle');
    const menu = document.getElementById('gdlMobileMenu');
    const closeButton = document.getElementById('gdlMobileClose');
    const overlay = document.getElementById('gdlMobileOverlay');

    if (!toggle || !menu || !closeButton || !overlay) {
        return;
    }

    function openMenu() {
        document.body.classList.add('gdl-menu-open');
        menu.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Փակել մենյուն');
        closeButton.focus();
    }

    function closeMenu(returnFocus = false) {
        document.body.classList.remove('gdl-menu-open');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Բացել մենյուն');

        if (returnFocus) {
            toggle.focus();
        }
    }

    toggle.addEventListener('click', () => {
        const isOpen = document.body.classList.contains('gdl-menu-open');
        if (isOpen) {
            closeMenu(true);
        } else {
            openMenu();
        }
    });

    closeButton.addEventListener('click', () => closeMenu(true));
    overlay.addEventListener('click', () => closeMenu(true));

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => closeMenu(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.body.classList.contains('gdl-menu-open')) {
            closeMenu(true);
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) {
            closeMenu(false);
        }
    });
})();


/* Course cards filter */
(() => {
    const buttons = Array.from(document.querySelectorAll('.course-filter'));
    const cards = Array.from(document.querySelectorAll('.course-card'));
    const emptyMessage = document.querySelector('.courses-empty');

    if (!buttons.length || !cards.length) {
        return;
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const selectedFilter = button.dataset.filter || 'all';
            let visibleCount = 0;

            buttons.forEach((item) => {
                const isActive = item === button;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-pressed', String(isActive));
            });

            cards.forEach((card) => {
                const categories = (card.dataset.category || '').split(/\s+/);
                const shouldShow = selectedFilter === 'all' || categories.includes(selectedFilter);

                card.hidden = !shouldShow;

                if (shouldShow) {
                    visibleCount += 1;
                }
            });

            if (emptyMessage) {
                emptyMessage.hidden = visibleCount !== 0;
            }
        });
    });
})();


/* Projects cards filter */
(() => {
    const buttons = Array.from(document.querySelectorAll('.project-filter'));
    const cards = Array.from(document.querySelectorAll('.project-card'));
    const count = document.getElementById('projectsVisibleCount');
    const emptyMessage = document.querySelector('.projects-empty');

    if (!buttons.length || !cards.length) {
        return;
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const selectedFilter = button.dataset.filter || 'all';
            let visibleCount = 0;

            buttons.forEach((item) => {
                const isActive = item === button;
                item.classList.toggle('is-active', isActive);
                item.setAttribute('aria-pressed', String(isActive));
            });

            cards.forEach((card) => {
                const categories = (card.dataset.category || '').split(/\s+/);
                const shouldShow = selectedFilter === 'all' || categories.includes(selectedFilter);

                card.hidden = !shouldShow;

                if (shouldShow) {
                    visibleCount += 1;
                }
            });

            if (count) {
                count.textContent = String(visibleCount).padStart(2, '0');
            }

            if (emptyMessage) {
                emptyMessage.hidden = visibleCount !== 0;
            }
        });
    });
})();


/* Registration form: front-end validation and confirmation only.
   No information is sent or stored until a backend service is connected. */
(() => {
    const form = document.getElementById('gdlApplicationForm');
    const successMessage = document.getElementById('gdlFormSuccess');

    if (!form || !successMessage) {
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        successMessage.classList.add('show');
        successMessage.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    });
})();


/* Reveal elements when they enter the visible area */
(() => {
    const elements = document.querySelectorAll('.gdl-reveal');

    if (!elements.length) {
        return;
    }

    if (!('IntersectionObserver' in window)) {
        elements.forEach((element) => element.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                currentObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    elements.forEach((element) => observer.observe(element));
})();


/* Homepage photo gallery: one photo per slide */
(() => {
    const gallery = document.querySelector('.gdl-gallery');

    if (!gallery || gallery.dataset.initialized === 'true') {
        return;
    }

    const track = gallery.querySelector('.gdl-gallery-track');
    const dotsContainer = gallery.querySelector('.gdl-gallery-dots');
    const previousButton = gallery.querySelector('[data-gallery-prev]');
    const nextButton = gallery.querySelector('[data-gallery-next]');

    if (!track || !dotsContainer || !previousButton || !nextButton) {
        return;
    }

    const images = Array.from(track.querySelectorAll('.gdl-gallery-item'));

    if (!images.length) {
        return;
    }

    gallery.dataset.initialized = 'true';
    track.replaceChildren();
    dotsContainer.replaceChildren();

    images.forEach((image) => {
        const slide = document.createElement('div');
        slide.className = 'gdl-gallery-slide';
        slide.setAttribute('aria-hidden', 'true');
        slide.appendChild(image);
        track.appendChild(slide);
    });

    const slides = Array.from(track.querySelectorAll('.gdl-gallery-slide'));
    const dots = [];
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentSlide = 0;
    let timer = null;
    let isHovered = false;
    let isFocused = false;

    slides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'gdl-gallery-dot';
        dot.setAttribute('aria-label', `Ցուցադրել լուսանկարը ${index + 1}`);
        dot.setAttribute('aria-current', 'false');

        dot.addEventListener('click', () => {
            showSlide(index);
            restartAutoplay();
        });

        dotsContainer.appendChild(dot);
        dots.push(dot);
    });

    function showSlide(index) {
        currentSlide = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${currentSlide * gallery.clientWidth}px)`;

        slides.forEach((slide, slideIndex) => {
            slide.setAttribute('aria-hidden', String(slideIndex !== currentSlide));
        });

        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentSlide;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        });



        previousButton.disabled = slides.length < 2;
        nextButton.disabled = slides.length < 2;
    }

    function stopAutoplay() {
        if (timer !== null) {
            window.clearInterval(timer);
            timer = null;
        }
    }

    function startAutoplay() {
        stopAutoplay();

        if (
            prefersReducedMotion ||
            isHovered ||
            isFocused ||
            document.hidden ||
            slides.length < 2
        ) {
            return;
        }

        timer = window.setInterval(() => {
            showSlide(currentSlide + 1);
        }, 4000);
    }

    function restartAutoplay() {
        startAutoplay();
    }

    previousButton.addEventListener('click', () => {
        showSlide(currentSlide - 1);
        restartAutoplay();
    });

    nextButton.addEventListener('click', () => {
        showSlide(currentSlide + 1);
        restartAutoplay();
    });

    gallery.addEventListener('mouseenter', () => {
        isHovered = true;
        stopAutoplay();
    });

    gallery.addEventListener('mouseleave', () => {
        isHovered = false;
        startAutoplay();
    });

    gallery.addEventListener('focusin', () => {
        isFocused = true;
        stopAutoplay();
    });

    gallery.addEventListener('focusout', (event) => {
        if (!gallery.contains(event.relatedTarget)) {
            isFocused = false;
            startAutoplay();
        }
    });

    gallery.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            showSlide(currentSlide + 1);
            restartAutoplay();
        }

        if (event.key === 'ArrowLeft') {
            showSlide(currentSlide - 1);
            restartAutoplay();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    window.addEventListener('resize', () => {
        showSlide(currentSlide);
    });

    showSlide(0);
    startAutoplay();
})();
