// ==========================================
// MODULE: APPLICATION ENTRY POINT (main.js)
// DOMContentLoaded bootstrap and initial data fetching
// ==========================================

async function init() {
  // Initialize Theme (Dark / Light Mode)
  if (typeof initTheme === 'function') initTheme();

  // Initialize Sidebar State (Collapsed / Expanded)
  if (typeof initSidebarState === 'function') initSidebarState();

  const savedLang = state.currentLanguage || 'en';
  const navSel = document.getElementById('navbarLangSelect');
  if (navSel) navSel.value = savedLang;
  const prefSel = document.getElementById('prefLanguageSelect');
  if (prefSel) prefSel.value = savedLang;

  // Initialize Language in UI
  setPortalLanguage(savedLang);

  // Check Login Status
  const isAuthed = await checkAuthSession();

  // Load baseline core data
  await loadDepartments();
  await loadUsers();
  await loadCurrentUser();
  await loadAccessibleVideos();
  await loadAllVideos();
  await loadCategories();
  await loadContentTypes();
  await loadEvents();

  // Check URL parameters for Figma Showcase or direct view routing
  const urlParams = new URLSearchParams(window.location.search);
  const isFigmaMode = window.__FORCE_FIGMA_MODE__ === true ||
    window.location.pathname.startsWith('/figma') ||
    urlParams.get('mode') === 'figma' ||
    urlParams.get('figma') === 'all' ||
    window.location.hash === '#figma';
  const targetView = urlParams.get('view') || window.location.hash.replace('#', '');

  if (isFigmaMode) {
    if (typeof initFigmaShowcaseMode === 'function') {
      await initFigmaShowcaseMode();
      return;
    }
  }

  if (targetView && targetView !== 'figma') {
    if (targetView.startsWith('admin')) {
      const adminUser = state.users && state.users.find(u => u.is_admin === 1 || u.role === 'Admin');
      if (adminUser) {
        state.currentUser = adminUser;
        if (typeof syncPersonaSelectUI === 'function') syncPersonaSelectUI();
      }
    }
    navigateView(targetView);
  } else if (isAuthed) {
    const isAdmin = state.currentUser && (state.currentUser.is_admin === 1 || state.currentUser.role === 'Admin');
    navigateView(isAdmin ? 'admin-dashboard' : 'home');
  } else {
    navigateView('home');
  }

  // Handle direct modal & popup openers via URL (?open=edit-video or ?modal=add-user)
  const modalToOpen = urlParams.get('modal') || urlParams.get('open');
  if (modalToOpen) {
    const adminUser = state.users && state.users.find(u => u.is_admin === 1 || u.role === 'Admin');
    if (adminUser) {
      state.currentUser = adminUser;
      if (typeof syncPersonaSelectUI === 'function') syncPersonaSelectUI();
    }

    setTimeout(() => {
      const vidId = (state.accessibleVideos && state.accessibleVideos[0]?.id) || 1;
      if (modalToOpen === 'edit-video' || modalToOpen === 'edit-drawer' || modalToOpen === 'edit') {
        navigateView('admin-videos');
        if (typeof openEditDrawer === 'function') openEditDrawer(vidId);
      } else if (modalToOpen === 'add-user' || modalToOpen === 'user') {
        navigateView('admin-users');
        if (typeof openAddUserModal === 'function') openAddUserModal();
      } else if (modalToOpen === 'matrix' || modalToOpen === 'access-matrix') {
        if (typeof openPermissionMatrixModal === 'function') openPermissionMatrixModal();
      } else if (modalToOpen === 'player' || modalToOpen === 'video-player') {
        if (typeof openVideoPlayerModal === 'function') openVideoPlayerModal(vidId);
      } else if (modalToOpen === 'profile' || modalToOpen === 'settings') {
        if (typeof openProfileModal === 'function') openProfileModal('preferences');
      } else if (modalToOpen === 'department' || modalToOpen === 'add-department') {
        navigateView('admin-depts');
        if (typeof openDepartmentModal === 'function') openDepartmentModal();
      } else if (modalToOpen === 'category' || modalToOpen === 'add-category') {
        navigateView('admin-categories');
        if (typeof openAddCategoryModal === 'function') openAddCategoryModal();
      } else if (modalToOpen === 'excel' || modalToOpen === 'import-excel') {
        navigateView('admin-users');
        if (typeof openImportExcelModal === 'function') openImportExcelModal();
      } else if (modalToOpen === 'import-videos') {
        navigateView('admin-videos');
        if (typeof openImportVideosModal === 'function') openImportVideosModal();
      }
    }, 200);
  }

  // Wire up Global Escape key for modals & drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVideoPlayer();
      closeUserModal();
      closeEditDrawer();
      closeCategoryModal();
      closeDeptModal();
      closeProfileModal();
      closeEventModal();
      closePermissionMatrixModal();
      closeCategoryDrilldown();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
