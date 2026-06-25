class ParallaxCard {
  constructor(card) {
      this.card = card;
      this.image = card.querySelector(".project-img--bg");
      this.overlay = card.querySelector(".project-card__overlay");
      this.canvas = card.querySelector(".project-card__canvas");

      this.currentX = 0;
      this.currentY = 0;
      this.targetX = 0;
      this.targetY = 0;

      this.active = false;
      this.isPatched = false;
      this.originalShader = null; 
      
      this.patchInterval = setInterval(() => this.tryPatchWebGL(), 0.1);

      this.bind();
      this.animate();
  }

  tryPatchWebGL() {
      const c = this.card._card;
      if (c && c.init && c.data && c.data.mat && !this.isPatched) {
          clearInterval(this.patchInterval);
          this.applyShaderPatch(c.data.mat);
      }
  }

  applyShaderPatch(mat) {
      if (this.image) {
          this.image.style.opacity = "0";
          this.image.style.visibility = "hidden";
      }
      
      this.card.style.overflow = "visible";
      this.card.style.transformStyle = "preserve-3d";

      if (this.canvas) {
          this.canvas.style.opacity = "1";
          this.canvas.style.pointerEvents = "none";
      }

      this.originalShader = mat.fragmentShader;

      mat.fragmentShader = `
          precision highp float;
          varying vec2 vUv;
          uniform sampler2D uT; 
          uniform float uS, uZ; 
          uniform vec2 uR, uTR;

          const float SCALE = 1.15;

          float roundedBox(vec2 p, vec2 b, float r) {
              vec2 q = abs(p) - b + r;
              return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
          }

          void main() {
              vec2 ratio = vec2(min((uR.x/uR.y)/(uTR.x/uTR.y), 1.0), min((uR.y/uR.x)/(uTR.y/uTR.x), 1.0));
              
              vec2 uv = vUv - 0.5;
              vec2 baseUv = uv * SCALE;

              float scrollDist = dot(baseUv, baseUv) * (uS * 0.25);
              
              vec2 distortedUv = baseUv * (1.0 - scrollDist);
              vec2 fUv = (distortedUv / uZ) + 0.5;

              if(roundedBox(distortedUv * uR, 0.5 * uR, 0.0) > 0.0) discard;
              if(fUv.x < 0.0 || fUv.x > 1.0 || fUv.y < 0.0 || fUv.y > 1.0) discard;

              gl_FragColor = texture2D(uT, fUv * ratio + (1.0 - ratio) * 0.5);
          }
      `;
      
      mat.needsUpdate = true;
      this.isPatched = true;
      
      this.card._card.data.render();
  }

  bind() {
      this.card.addEventListener("mouseenter", () => {
          this.active = true;
      });

      this.card.addEventListener("mouseleave", () => {
          setTimeout(() => {
              this.targetX = 0;
              this.targetY = 0;
              this.active = false;
          }, 200); 
      });

      this.card.addEventListener("mousemove", e => {
          this.active = true; 
          const rect = this.card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;

          this.targetX = (x - 0.5) * 5.5;
          this.targetY = (y - 0.5) * 5.5;
      });
  }

  animate() {
      this.rafId = requestAnimationFrame(this.animate.bind(this));
  
      this.currentX += (this.targetX - this.currentX) * 0.08;
      this.currentY += (this.targetY - this.currentY) * 0.08;
  
      this.card.style.transform = `
          perspective(1400px)
          rotateY(${this.currentX}deg)
          rotateX(${-this.currentY}deg)
      `;

      if (this.canvas) {
          this.canvas.style.transform = `
              translate3d(${this.currentX * 0.5}px, ${this.currentY * 0.5}px, 0)
              scale(1.15)
          `;
      }

      if (this.overlay) {
          this.overlay.style.transform = `
              translate3d(${this.currentX * -1.0}px, ${this.currentY * -1.0}px, 0)
          `;
      }
      
      if (!this.isPatched && this.image) {
          this.image.style.transform = `
              scale(1.08)
              translate3d(${this.currentX * 0.2}px, ${this.currentY * 0.2}px, 0)
          `;
      }
  }

  destroy() {
      clearInterval(this.patchInterval);
      cancelAnimationFrame(this.rafId);
      
      this.card.style.transform = "";
      this.card.style.overflow = "";
      this.card.style.transformStyle = "";
      
      if (this.image) {
          this.image.style.opacity = "";
          this.image.style.visibility = "";
          this.image.style.transform = "";
      }
      
      if (this.canvas) {
          this.canvas.style.transform = "";
          this.canvas.style.opacity = "";
          this.canvas.style.pointerEvents = "";
      }
      
      if (this.overlay) {
          this.overlay.style.transform = "";
      }

      const c = this.card._card;
      if (c && c.init && c.data && c.data.mat && this.isPatched && this.originalShader) {
          c.data.mat.fragmentShader = this.originalShader;
          c.data.mat.needsUpdate = true;
          c.data.render();
          this.isPatched = false;
      }
  }
}

window.ParallaxCards = {
  instances: [],
  init() {
      this.destroy();
      
      document.documentElement.style.overflowX = "hidden";
      document.body.style.overflowX = "hidden";

      let parallaxEnabled = document.body.dataset.view !== 'classic';
      document.querySelectorAll('.project-card').forEach(card => {
          this.instances.push(new ParallaxCard(card, parallaxEnabled));
      });

      const terminalCard = document.querySelector('.terminal-card');
      if (terminalCard) {
        terminalCard.addEventListener('mousemove', (e) => {
          if (document.body.dataset.view === 'classic') return;
          const rect = terminalCard.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -3;
          const rotateY = ((x - centerX) / centerX) * 3;
          terminalCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
          terminalCard.style.transition = 'none';

          const glare = terminalCard.querySelector('.terminal-glare');
          if (glare) {
            glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.15), transparent 60%)`;
          }
        });
        terminalCard.addEventListener('mouseleave', () => {
          terminalCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
          terminalCard.style.transition = 'transform 0.5s ease-out';
          const glare = terminalCard.querySelector('.terminal-glare');
          if (glare) glare.style.background = `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15), transparent 60%)`;
        });
      }
  },
  destroy() {
      this.instances.forEach(i => i.destroy());
      this.instances = [];
      
      document.documentElement.style.overflowX = "";
      document.body.style.overflowX = "";
  }
};

class LiquidGlassTabs {
  constructor() {
    this.switcher = document.querySelector('.view-switcher');
    this.items = document.querySelectorAll('.view-switcher__item');
    
    if (!this.switcher || this.items.length === 0) return;

    this.svgId = `glass-filter-${Math.random().toString(36).substr(2, 5)}`;
    this.initSVG();
    this.initPill();
    
    this.generateMap();
    
    const activeItem = document.querySelector('.view-switcher__item.is-active') || this.items[0];
    this.movePill(activeItem, 0);
  }

  initSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position: absolute; width: 0; height: 0; pointer-events: none; opacity: 0;");
    
    svg.innerHTML = `
      <defs>
        <filter id="${this.svgId}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
          <feImage id="${this.svgId}-map" result="MAP" preserveAspectRatio="none"/>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="MAP" 
            scale="320" 
            xChannelSelector="R" 
            yChannelSelector="G" 
            result="REFRACTED"
          />
          <feComposite in="REFRACTED" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
    this.feImage = document.getElementById(`${this.svgId}-map`);
  }

  generateMap() {
    const size = 128; 
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        
        const nx = (x / (size - 1)) * 2 - 1;
        const ny = (y / (size - 1)) * 2 - 1;
        
        const falloffX = Math.max(0, 1 - nx * nx);
        const falloffY = Math.max(0, 1 - ny * ny);
        const seamlessMask = Math.pow(falloffX * falloffY, 2); 

        const dist = Math.sqrt(nx * nx + ny * ny);
        const strength = dist * seamlessMask * 1.0;

        data[i]     = 128 + (nx * strength * 127);
        data[i + 1] = 128 + (ny * strength * 127);
        data[i + 2] = 255; 
        data[i + 3] = 255; 
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this.feImage.setAttribute("href", canvas.toDataURL());
  }

  initPill() {
    this.pill = document.createElement('div');
    this.pill.classList.add('glass-pill');
    
    const filterValue = `blur(4px) url(#${this.svgId})`;
    
    Object.assign(this.pill.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      height: '100%',
      zIndex: '-1',
      willChange: 'transform, width',
      backdropFilter: filterValue,
      webkitBackdropFilter: filterValue
    });
    
    this.switcher.appendChild(this.pill);
  }

  movePill(targetItem, duration = 0.1) {
    const rect = targetItem.getBoundingClientRect();
    const containerRect = this.switcher.getBoundingClientRect();
    
    const targetX = rect.left - containerRect.left;
    const targetWidth = rect.width;

    if (window.gsap) {
      gsap.killTweensOf(this.pill);
      if (duration === 0) {
        gsap.set(this.pill, { x: targetX, width: targetWidth });
        return;
      }
      gsap.to(this.pill, {
        x: targetX,
        width: targetWidth,
        duration: duration,
        ease: "power2.out"
      });
    } else {
       this.pill.style.transform = `translateX(${targetX}px)`;
       this.pill.style.width = `${targetWidth}px`;
       this.pill.style.transition = duration === 0 ? 'none' : `all ${duration}s ease-out`;
    }
  }
}

function initApp() {
  const savedLang = getSavedLang();
  setActiveLanguage(savedLang);
  renderApp(savedLang);

  window.liquidTabs = new LiquidGlassTabs();
  
  const viewSwitcherItems = document.querySelectorAll('.view-switcher__item');
  viewSwitcherItems.forEach(item => {
    item.addEventListener('click', (e) => {
      viewSwitcherItems.forEach(btn => btn.classList.remove('is-active'));
      const clickedItem = e.currentTarget;
      clickedItem.classList.add('is-active');
      if (window.liquidTabs) {
        window.liquidTabs.movePill(clickedItem, 0.6);
      }
      
      const lang = clickedItem.getAttribute('data-lang');
      saveLang(lang);
      renderApp(lang);
    });
  });
}

function getSavedLang() {
  const lang = localStorage.getItem('site-lang');
  return appData[lang] ? lang : 'zh';
}

function saveLang(lang) {
  if (appData[lang]) localStorage.setItem('site-lang', lang);
}

function setActiveLanguage(lang) {
  document.querySelectorAll('.view-switcher__item').forEach(item => {
    item.classList.toggle('is-active', item.getAttribute('data-lang') === lang);
  });
}

const repoStars = {
  promise: null,
  data: null
};

let projectGridRenderId = 0;

function getRepoName(link) {
  return link.split('/').filter(Boolean).pop();
}

function renderPandaLoader(target) {
  target.innerHTML = `
    <div class="panda-loader panda-loader--grid">
      <img src="assets/panda_loader.png" alt="" class="panda-loader__img">
    </div>
  `;
}

function getRepoStars() {
  if (repoStars.data) return Promise.resolve(repoStars.data);
  if (!repoStars.promise) {
    repoStars.promise = fetch('https://api.github.com/users/tomokuroki/repos?per_page=100')
      .then(res => res.ok ? res.json() : [])
      .then(repos => {
        repoStars.data = Array.isArray(repos) ? repos : [];
        return repoStars.data;
      })
      .catch(err => {
        console.error("Failed to fetch real-time github data", err);
        repoStars.data = [];
        return repoStars.data;
      });
  }
  return repoStars.promise;
}

function updateProjectStars(projects) {
  getRepoStars().then(repos => {
    projects.forEach(project => {
      const repoName = getRepoName(project.link);
      const repo = repos.find(r => r.name === repoName);
      const starEl = document.getElementById(`stars-${repoName}`);
      if (starEl) starEl.textContent = repo ? repo.stargazers_count : '0';
    });
  });
}

function renderApp(lang) {
  const data = appData[lang];
  if (!data) return;
  document.documentElement.lang = lang;

  const scanSpan = document.querySelector('.qr-popup span');
  if (scanSpan && data.ui && data.ui.scan) scanSpan.textContent = data.ui.scan;

  document.querySelector('.header__logo').textContent = data.nav.logo;
  
  document.querySelector('.hero .text-h1').textContent = data.hero.title;
  document.querySelector('.hero .text-h3').textContent = data.hero.subtitle;
  document.querySelector('.hero .text-p').textContent = data.hero.description;

  const projTitle = document.getElementById('projects-section-title');
  if (projTitle) projTitle.textContent = data.projectsSection.title;

  const projectsGrid = document.getElementById('github-pinned-grid');
  if (projectsGrid) {
    const renderId = ++projectGridRenderId;
    renderPandaLoader(projectsGrid);
    const langColors = {
      "CSS": "#663399",
      "C++": "#f34b7d",
      "Python": "#3572A5",
      "PHP": "#4F5D95",
      "JavaScript": "#f1e05a",
      "HTML": "#e34c26"
    };

    setTimeout(() => {
      if (renderId !== projectGridRenderId) return;
      projectsGrid.innerHTML = '';
      data.projectsSection.projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        const langColor = langColors[project.label] || "#8b949e";
        const repoName = getRepoName(project.link);
        
        card.innerHTML = `
          <canvas class="project-card__canvas"></canvas>
          <img class="project-img--bg" style="display:block;" src="${project.image}" alt="${project.title}">
          <a href="project.html?id=${project.id}" class="project-card__link"></a>
          <div class="project-card__overlay Box d-flex" style="flex-direction: column; background: rgba(20, 20, 20, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); padding: 24px;">
            <div class="d-flex width-full position-relative">
              <div class="flex-1 d-flex v-align-middle">
                <svg height="16" viewBox="0 0 16 16" width="16" class="octicon octicon-repo mr-1 color-fg-muted mt-1"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path></svg>
                <span class="Link mr-1 text-bold wb-break-word" style="font-size: 16px;">${project.title}</span>
                <span class="Label Label--secondary v-align-middle mt-1 no-wrap">Public</span>
              </div>
            </div>
            <p class="pinned-item-desc text-small mt-2 mb-0" style="color: rgba(255,255,255,0.85); flex: 1 0 auto; display: block; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              ${project.description}
            </p>
            <p class="mb-0 mt-2 f6 color-fg-muted d-flex v-align-middle" style="align-items: center; gap: 16px;">
              <span class="d-inline-block v-align-middle">
                <span class="repo-language-color" style="background-color: ${langColor}"></span>
                <span itemprop="programmingLanguage" style="color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${project.label}</span>
              </span>
              <span class="pinned-item-meta d-inline-block v-align-middle" style="color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                <svg height="16" viewBox="0 0 16 16" width="16" class="octicon octicon-star mr-1"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path></svg>
                <span id="stars-${repoName}">...</span>
              </span>
            </p>
          </div>
        `;
        projectsGrid.appendChild(card);
      });

      updateProjectStars(data.projectsSection.projects);
      window.ParallaxCards.init();
    }, 650);
  }

  if (data.terminal) {
    const termBody = document.querySelector('.terminal-body');
    if (termBody) {
      termBody.innerHTML = `
        <div style="text-align: center; max-width: 600px; margin: 0 auto;">
          <h2 class="text-h2" style="margin-bottom: 24px; color: var(--p-accent);">${data.terminal.about}</h2>
          <p class="text-p" style="margin-bottom: 32px;">${data.terminal.text}</p>
          <h3 class="text-h3" style="margin-bottom: 16px;">${data.terminal.stackTitle}</h3>
          <p class="text-p" style="margin-bottom: 16px; color: var(--p-secondary); font-size: 16px;">${data.terminal.stackText}</p>
          <img src="${data.terminal.icons}" alt="Tech Stack Icons" style="max-width: 100%;">
        </div>
      `;
    }
  }

  const hypoSection = document.querySelector('.hypothesis-section');
  hypoSection.querySelector('.text-h2').textContent = data.hypothesisSection.title;
  
  const hypoGrid = hypoSection.querySelector('.hypothesis-grid');
  hypoGrid.innerHTML = '';
  data.hypothesisSection.cards.forEach(c => {
    const card = document.createElement('div');
    card.className = `hypothesis-card hypothesis-card--${c.type}`;
    card.innerHTML = `
      <h3 class="text-h3">${c.title}</h3>
      <p class="text-p">${c.description}</p>
    `;
    hypoGrid.appendChild(card);
  });

  const footer = document.querySelector('.footer__bottom-block');
  footer.innerHTML = `
    <div class="footer__main-content__text">${data.footer.contact}</div>
    <a href="mailto:${data.footer.email}" class="footer__main-content__text">${data.footer.email}</a>
  `;

  if (!projectsGrid) window.ParallaxCards.init();
}

document.addEventListener('DOMContentLoaded', initApp);
