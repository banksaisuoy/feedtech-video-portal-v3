// ==========================================
// MODULE: FIGMA ALL-IN-ONE SHOWCASE (figma-showcase.js)
// Enables single-URL import of all screens into Figma
// ==========================================

window.initFigmaShowcaseMode = async function() {
  console.log('🎨 Activating Figma All-in-One Showcase Mode...');

  // 1. Force persona to Admin so all screens & data are accessible
  if (state.users && state.users.length > 0) {
    const adminUser = state.users.find(u => u.is_admin === 1 || u.role === 'Admin') || state.users[0];
    if (adminUser) {
      state.currentUser = adminUser;
      if (typeof syncPersonaSelectUI === 'function') syncPersonaSelectUI();
      try {
        await fetch('/api/current-user/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: adminUser.id })
        });
      } catch (e) {
        console.warn('Session switch in figma mode:', e);
      }
    }
  }

  // 2. Load all dynamic datasets and trigger loaders
  if (typeof renderHomeVideos === 'function') renderHomeVideos();
  if (typeof renderCategoriesDirectory === 'function') renderCategoriesDirectory();
  if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
  if (typeof renderUserTable === 'function') renderUserTable();
  if (typeof renderVideoManagementTable === 'function') renderVideoManagementTable();
  if (typeof loadAccessMatrix === 'function') loadAccessMatrix();
  if (typeof loadAuditLogs === 'function') loadAuditLogs();
  if (typeof renderCategoryManagementTable === 'function') renderCategoryManagementTable();

  // 3. Prepare watch view with dummy/first video if empty
  if (state.accessibleVideos && state.accessibleVideos.length > 0) {
    const v = state.accessibleVideos[0];
    const titleEl = document.getElementById('watchVideoTitle');
    if (titleEl) titleEl.textContent = v.title;
    const authorEl = document.getElementById('watchVideoAuthor');
    if (authorEl) authorEl.textContent = v.uploaded_by || 'Dr. Alice Smith';
    const deptEl = document.getElementById('watchBreadcrumbCategory');
    if (deptEl) deptEl.textContent = v.department || 'Biotech';
    const descEl = document.getElementById('watchVideoDescription');
    if (descEl) descEl.textContent = v.description || 'Enterprise scientific research and training video.';
  }

  // 4. Hide single active view constraint and build the Figma Canvas
  const mainContainer = document.getElementById('mainViewContainer');
  if (!mainContainer) return;

  // Check if showcase is already rendered
  if (document.getElementById('figmaShowcaseWrapper')) return;

  // Insert Figma Banner at the top of the body
  const banner = document.createElement('div');
  banner.id = 'figmaTopBanner';
  banner.className = 'sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-3.5 shadow-xl border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md';
  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-black text-sm">
        F
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-sm tracking-wide text-white">FIGMA ALL-IN-ONE SHOWCASE MODE</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase">UI Kit Ready</span>
        </div>
        <p class="text-xs text-indigo-200/80">Every screen, table, modal, and drawer is expanded and styled for 1-click Figma import.</p>
      </div>
    </div>

    <!-- Quick Jump Links -->
    <div class="flex items-center flex-wrap gap-1.5 text-xs">
      <a href="#figma-screen-home" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">01 Home</a>
      <a href="#figma-screen-categories" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">02 Categories Hub</a>
      <a href="#figma-screen-watch" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">03 Player</a>
      <a href="#figma-screen-admin-dashboard" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">04 Dashboard</a>
      <a href="#figma-screen-admin-users" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">05 Users</a>
      <a href="#figma-screen-admin-videos" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">06 Videos</a>
      <a href="#figma-screen-admin-matrix" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">07 Matrix</a>
      <a href="#figma-screen-admin-categories" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">08 Governance</a>
      <a href="#figma-screen-admin-logs" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">09 Logs</a>
      <a href="#figma-screen-edit-drawer" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">10 Drawer</a>
      <a href="#figma-screen-add-user" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-200 font-medium">11 Modals</a>
    </div>

    <div class="flex items-center gap-2">
      <a href="/" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">logout</span>
        <span>Exit Figma Mode</span>
      </a>
    </div>
  `;

  document.body.prepend(banner);

  // Create Wrapper
  const showcaseWrapper = document.createElement('div');
  showcaseWrapper.id = 'figmaShowcaseWrapper';
  showcaseWrapper.className = 'w-full space-y-20 py-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto';

  // Helper to wrap a screen into a Figma Artboard Frame
  function createFigmaFrame(id, screenNum, title, subtitle, contentElement) {
    const frame = document.createElement('section');
    frame.id = id;
    frame.className = 'figma-artboard bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transition-all scroll-mt-24';
    
    // Header
    frame.innerHTML = `
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-5 flex items-center justify-between border-b border-slate-700/50">
        <div class="flex items-center gap-3.5">
          <span class="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-black border border-indigo-400/30">
            ${screenNum}
          </span>
          <div>
            <h2 class="text-lg font-bold text-white tracking-tight">${title}</h2>
            <p class="text-xs text-slate-400 font-medium">${subtitle}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>Figma Auto-Layout 1440px</span>
        </div>
      </div>
      <div class="p-6 md:p-8 bg-slate-50/50 figma-screen-body"></div>
    `;

    const body = frame.querySelector('.figma-screen-body');
    if (contentElement) {
      contentElement.classList.remove('hidden');
      body.appendChild(contentElement);
    }
    return frame;
  }

  // Define screen targets
  const screens = [
    { id: 'figma-screen-home', num: 'SCREEN 01', title: 'Home Video Portal & Discovery Feed', subtitle: 'Hero Banner, Persona Security Level, 17-Department Categories Carousel, Video Grid', elId: 'view-home' },
    { id: 'figma-screen-categories', num: 'SCREEN 02', title: 'Categories Hub (17 Departments Directory)', subtitle: 'All 17 Department cards with icons, policy status, video count & descriptions', elId: 'view-categories' },
    { id: 'figma-screen-watch', num: 'SCREEN 03', title: 'Video Watch & Interactive Player View', subtitle: '16:9 Cinema Player, Author Bio, Description, Live Comments, Related Videos Feed', elId: 'view-watch' },
    { id: 'figma-screen-admin-dashboard', num: 'SCREEN 04', title: 'Executive Admin Dashboard & Analytics', subtitle: 'Portal Metrics, Engagement Trends, PBAC Audit Summary, System Health', elId: 'view-admin-dashboard' },
    { id: 'figma-screen-admin-users', num: 'SCREEN 05', title: 'Corporate User Management & PBAC Roster', subtitle: 'Employee Roster Table, Security Clearance Badges, Excel Import & CSV Export', elId: 'view-admin-users' },
    { id: 'figma-screen-admin-videos', num: 'SCREEN 06', title: 'Video Asset Repository & Governance', subtitle: 'All Video Assets, Classification Levels, Filter by Department, Edit Action Controls', elId: 'view-admin-videos' },
    { id: 'figma-screen-admin-matrix', num: 'SCREEN 07', title: 'PBAC Visual Security Access Matrix', subtitle: 'Real-time Matrix mapping all Corporate Users against Classified Video Assets', elId: 'view-admin-matrix' },
    { id: 'figma-screen-admin-categories', num: 'SCREEN 08', title: 'Department Policy Governance & Category Management', subtitle: 'Clearance Rules, Default Access Tiers, Department-Level Policy Editor', elId: 'view-admin-categories' },
    { id: 'figma-screen-admin-logs', num: 'SCREEN 09', title: 'Enterprise Audit & Compliance Logs', subtitle: 'Immutable System Activity Logs, Filterable Event Types, Timestamps & IP', elId: 'view-admin-logs' },
    { id: 'figma-screen-admin-upload', num: 'SCREEN 12', title: 'Cloud Link Video Registration Hub', subtitle: 'SharePoint / OneDrive / CDN Video Intake Form with Metadata & Clearance assignment', elId: 'view-admin-upload' },
  ];

  screens.forEach(s => {
    const el = document.getElementById(s.elId);
    if (el) {
      const frame = createFigmaFrame(s.id, s.num, s.title, s.subtitle, el);
      showcaseWrapper.appendChild(frame);
    }
  });

  // Screen 10: In-flow Video Edit Drawer
  const editDrawer = document.getElementById('edit-drawer');
  if (editDrawer) {
    const drawerClone = editDrawer.cloneNode(true);
    drawerClone.id = 'figma-edit-drawer-mockup';
    drawerClone.classList.remove('hidden');
    drawerClone.style.maxWidth = '100%';
    drawerClone.style.margin = '0 auto';
    const titleInp = drawerClone.querySelector('#editDrawerTitle');
    if (titleInp) titleInp.value = 'Biotech Genetic Strain Analysis & Fermentation Protocol 2026';
    const descInp = drawerClone.querySelector('#editDrawerDesc');
    if (descInp) descInp.value = 'In-depth laboratory research review regarding feed enzyme reaction, amino acid profiling, and microbial culture longevity.';
    
    const frame10 = createFigmaFrame(
      'figma-screen-edit-drawer',
      'SCREEN 10',
      'Video Asset Metadata & Permission Drawer (Expanded)',
      'Side-drawer/Modal for updating video title, clearance level, department classification, and custom thumbnail',
      drawerClone
    );
    showcaseWrapper.appendChild(frame10);
  }

  // Screen 11: In-flow User Creation Modal
  const userModal = document.getElementById('userModal');
  if (userModal) {
    const userModalCard = userModal.querySelector('.relative') || userModal.firstElementChild;
    if (userModalCard) {
      const modalClone = userModalCard.cloneNode(true);
      modalClone.classList.remove('hidden');
      modalClone.style.maxWidth = '700px';
      modalClone.style.margin = '0 auto';

      const frame11 = createFigmaFrame(
        'figma-screen-add-user',
        'SCREEN 11',
        'Add / Edit Corporate User Modal',
        'Interactive Dialog for creating employee identity, Department assignment, and PBAC clearance level',
        modalClone
      );
      showcaseWrapper.appendChild(frame11);
    }
  }

  mainContainer.innerHTML = '';
  mainContainer.appendChild(showcaseWrapper);

  console.log('✅ Figma Showcase Ready: All 12 screens rendered in-flow.');
};
