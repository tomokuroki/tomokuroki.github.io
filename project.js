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

function initProjectApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (!projectId) {
    document.querySelector('.project-layout__main').innerHTML = '<h1 class="text-h1">Project Not Found</h1>';
    return;
  }

  const savedLang = getSavedLang();
  setActiveLanguage(savedLang);
  renderProject(savedLang, projectId);

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
      renderProject(lang, projectId);
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

function renderProject(lang, projectId) {
  const data = appData[lang];
  if (!data) return;
  document.documentElement.lang = lang;

  const project = data.projectsSection.projects.find(p => p.id === projectId);

  if (!project) {
    document.querySelector('.project-layout__main').innerHTML = '<h1 class="text-h1">Project Not Found</h1>';
    return;
  }

  document.getElementById('proj-label').textContent = project.label;
  document.getElementById('proj-title').textContent = project.title;
  const descEl = document.getElementById('proj-desc');
  descEl.innerHTML = `
    <div class="panda-loader panda-loader--readme">
      <img src="assets/panda_loader.png" alt="" class="panda-loader__img">
    </div>
  `;
  
  const repoName = project.link.split('/').pop();

  const readmePromise = fetch(`https://raw.githubusercontent.com/tomokuroki/${repoName}/main/README.md`)
    .then(response => {
      if (!response.ok) {
        return fetch(`https://raw.githubusercontent.com/tomokuroki/${repoName}/master/README.md`);
      }
      return response;
    })
    .then(response => {
      if (!response.ok) throw new Error('README not found');
      return response.text();
    })
    .then(text => {
      const fixedText = text.replace(/!\[(.*?)\]\((?!http|data:)(.*?)\)/g, (match, alt, path) => {
        return `![${alt}](https://raw.githubusercontent.com/tomokuroki/${repoName}/main/${path})`;
      }).replace(/<img[^>]+src=["'](?!http|data:)(.*?)["']/g, (match, path) => {
        return match.replace(path, `https://raw.githubusercontent.com/tomokuroki/${repoName}/main/${path}`);
      });

      return window.marked ? marked.parse(fixedText) : fixedText;
    })
    .catch(err => {
      console.warn(err);
      return project.description;
    });

  Promise.all([
    readmePromise,
    new Promise(resolve => setTimeout(resolve, 1200))
  ]).then(([content]) => {
    if (window.marked && content !== project.description) {
      descEl.innerHTML = content;
      hydrateReadmeImages(descEl);
    } else {
      descEl.textContent = content;
    }
  });

  document.getElementById('proj-link').href = project.link;
  
  let btnText = "View on GitHub ↗";
  if (lang === 'zh') btnText = "在 GitHub 上查看 ↗";
  if (lang === 'ru') btnText = "Посмотреть на GitHub ↗";
  document.getElementById('proj-link').textContent = btnText;

  const backBtn = document.querySelector('.header__logo');
  if (backBtn && data.ui.back) backBtn.textContent = data.ui.back;

  const roleDt = document.querySelector('.project-meta div:nth-child(1) dt');
  const roleDd = document.querySelector('.project-meta div:nth-child(1) dd');
  const timeDt = document.querySelector('.project-meta div:nth-child(2) dt');
  const timeDd = document.querySelector('.project-meta div:nth-child(2) dd');
  
  if (roleDt) roleDt.textContent = data.ui.role;
  if (roleDd) roleDd.textContent = data.ui.roleValue;
  if (timeDt) timeDt.textContent = data.ui.timeline;
  if (timeDd) timeDd.textContent = data.ui.timelineValue;

  const scanSpan = document.querySelector('.qr-popup span');
  if (scanSpan) scanSpan.textContent = data.ui.scan;

  const footer = document.querySelector('.footer__bottom-block');
  footer.innerHTML = `
    <div class="footer__main-content__text">${data.footer.contact}</div>
    <a href="mailto:${data.footer.email}" class="footer__main-content__text">${data.footer.email}</a>
  `;
}

function hydrateReadmeImages(root) {
  root.querySelectorAll('img').forEach(img => {
    img.loading = 'lazy';
    img.decoding = 'async';

    if (!img.parentElement.classList.contains('readme-image-shell')) {
      const shell = document.createElement('span');
      shell.className = 'readme-image-shell is-loading';
      shell.innerHTML = `
        <span class="panda-loader readme-image-loader">
          <img src="assets/panda_loader.png" alt="" class="panda-loader__img">
        </span>
      `;
      img.parentNode.insertBefore(shell, img);
      shell.appendChild(img);
    }

    const shell = img.parentElement;
    const done = () => shell.classList.remove('is-loading');
    if (img.complete && img.naturalWidth > 0) {
      done();
    } else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
}

document.addEventListener('DOMContentLoaded', initProjectApp);
