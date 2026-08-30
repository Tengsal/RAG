/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Dynamic SPA Router Engine
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const VIEW_TITLES = {
  dashboard: 'Executive Dashboard',
  calls: 'Live Admissions Calls',
  leads: 'Leads & CRM Workspace',
  dispatch: 'Single Call Dispatch',
  campaigns: 'Bulk Admissions Campaigns',
  courses: 'Course Knowledge Base',
  summaries: 'Gemini 3.6 Flash AI Summaries',
  analytics: 'Reports & Analytics',
  system: 'Infrastructure System Status',
  settings: 'Portal Settings & Roles',
};

const VIEW_RENDERERS = {
  dashboard: { render: renderDashboardPage, init: initDashboardPage },
  calls: { render: renderCallsPage, init: initCallsPage },
  leads: { render: renderLeadsPage, init: initLeadsPage },
  dispatch: { render: renderDispatchPage, init: initDispatchPage },
  campaigns: { render: renderCampaignsPage, init: initCampaignsPage },
  courses: { render: renderCoursesPage, init: initCoursesPage },
  summaries: { render: renderSummariesPage, init: initSummariesPage },
  analytics: { render: renderAnalyticsPage, init: initAnalyticsPage },
  system: { render: renderSystemPage, init: initSystemPage },
  settings: { render: renderSettingsPage, init: initSettingsPage },
};

let currentViewId = 'dashboard';

function switchView(viewId) {
  if (!VIEW_RENDERERS[viewId]) viewId = 'dashboard';
  currentViewId = viewId;

  // Update Breadcrumb Title
  const title = VIEW_TITLES[viewId] || 'Executive Dashboard';
  const pageTitleEl = $('page-title');
  if (pageTitleEl) pageTitleEl.textContent = title;

  // Highlight Sidebar Active Nav
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    if (item.dataset.view === viewId) item.classList.add('active');
    else item.classList.remove('active');
  });

  // Mount View Dynamic Content into #page-container
  const container = $('page-container');
  if (container) {
    const pageModule = VIEW_RENDERERS[viewId];
    if (pageModule && typeof pageModule.render === 'function') {
      container.innerHTML = pageModule.render();
      if (typeof pageModule.init === 'function') {
        pageModule.init();
      }
    }
  }

  // Close Mobile Sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

// Global Event Delegation for Nav Buttons
document.addEventListener('click', (ev) => {
  const navItem = ev.target.closest('[data-view]');
  if (navItem) {
    ev.preventDefault();
    switchView(navItem.dataset.view);
    return;
  }

  const gotoBtn = ev.target.closest('[data-goto]');
  if (gotoBtn) {
    ev.preventDefault();
    switchView(gotoBtn.dataset.goto);
    return;
  }
});
