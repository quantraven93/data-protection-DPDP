/**
 * AP Legal Tracker - Frontend Application
 */

// App State
const state = {
  cases: [],
  currentView: 'dashboard',
  currentFilter: null,
  editingCaseId: null,
  isLoading: false
};

// DOM Elements
const elements = {
  pageTitle: document.getElementById('page-title'),
  searchInput: document.getElementById('search-input'),
  addCaseBtn: document.getElementById('add-case-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  caseModal: document.getElementById('case-modal'),
  caseForm: document.getElementById('case-form'),
  modalTitle: document.getElementById('modal-title'),
  closeModal: document.getElementById('close-modal'),
  cancelCase: document.getElementById('cancel-case'),
  casesTableBody: document.getElementById('cases-table-body'),
  loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  console.log('AP Legal Tracker initializing...');

  // Set up navigation
  setupNavigation();

  // Set up event listeners
  setupEventListeners();

  // Load initial data
  await loadDashboardData();

  // Set up IPC listeners from main process
  setupIPCListeners();

  console.log('AP Legal Tracker ready');
});

// Navigation Setup
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Court filter navigation
  const filterItems = document.querySelectorAll('.nav-item[data-filter]');
  filterItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = item.dataset.filter;
      filterByCourtType(filter);
    });
  });
}

function switchView(viewName) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    }
  });

  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Show selected view
  const targetView = document.getElementById(`${viewName}-view`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    cases: 'All Cases',
    hearings: 'Upcoming Hearings',
    orders: 'Recent Orders',
    settings: 'Settings'
  };
  elements.pageTitle.textContent = titles[viewName] || viewName;

  state.currentView = viewName;

  // Load view-specific data
  loadViewData(viewName);
}

async function loadViewData(viewName) {
  switch (viewName) {
    case 'dashboard':
      await loadDashboardData();
      break;
    case 'cases':
      await loadCases();
      break;
    case 'hearings':
      await loadHearings();
      break;
    case 'orders':
      await loadOrders();
      break;
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Add Case Button
  elements.addCaseBtn.addEventListener('click', () => {
    openCaseModal();
  });

  // Refresh Button
  elements.refreshBtn.addEventListener('click', async () => {
    await refreshAllCases();
  });

  // Modal close buttons
  elements.closeModal.addEventListener('click', closeCaseModal);
  elements.cancelCase.addEventListener('click', closeCaseModal);

  // Case form submission
  elements.caseForm.addEventListener('submit', handleCaseSubmit);

  // Search input
  elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

  // Click outside modal to close
  elements.caseModal.addEventListener('click', (e) => {
    if (e.target === elements.caseModal) {
      closeCaseModal();
    }
  });

  // Filter dropdowns
  ['court-filter', 'status-filter', 'priority-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', handleFilterChange);
    }
  });

  // Close details modal
  document.getElementById('close-details-modal')?.addEventListener('click', () => {
    document.getElementById('case-details-modal').classList.remove('active');
  });

  // Settings
  setupSettingsListeners();
}

// IPC Listeners (from main process)
function setupIPCListeners() {
  if (window.api) {
    window.api.onAddCase(() => openCaseModal());
    window.api.onViewDashboard(() => switchView('dashboard'));
    window.api.onViewCases(() => switchView('cases'));
    window.api.onViewHearings(() => switchView('hearings'));
    window.api.onViewOrders(() => switchView('orders'));
    window.api.onRefreshStart(() => showLoading());
    window.api.onRefreshComplete(() => {
      hideLoading();
      loadViewData(state.currentView);
    });
    window.api.onRefreshError((event, { error }) => {
      hideLoading();
      showError('Refresh failed: ' + error);
    });
    window.api.onOpenPreferences(() => switchView('settings'));
  }
}

// Dashboard Data
async function loadDashboardData() {
  try {
    if (window.api) {
      const cases = await window.api.getAllCases();
      state.cases = cases || [];

      // Update stats
      document.getElementById('total-cases').textContent = cases.length;
      document.getElementById('pending-cases').textContent =
        cases.filter(c => c.case_status === 'pending').length;

      const hearings = await window.api.getUpcomingHearings();
      document.getElementById('upcoming-hearings').textContent = hearings?.length || 0;

      const orders = await window.api.getRecentOrders();
      document.getElementById('recent-orders').textContent = orders?.length || 0;

      // Update lists
      updateUpcomingHearingsList(hearings?.slice(0, 5) || []);
      updateRecentOrdersList(orders?.slice(0, 5) || []);
      updateCasesByCourtStats(cases);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateUpcomingHearingsList(hearings) {
  const container = document.getElementById('upcoming-hearings-list');

  if (!hearings || hearings.length === 0) {
    container.innerHTML = '<div class="empty-state">No upcoming hearings</div>';
    return;
  }

  container.innerHTML = hearings.map(h => `
    <div class="list-item">
      <span class="list-item-icon">📅</span>
      <div class="list-item-content">
        <div class="list-item-title">${h.case_number}</div>
        <div class="list-item-subtitle">${h.purpose || 'Hearing'}</div>
        <div class="list-item-date">${formatDate(h.hearing_date)}</div>
      </div>
    </div>
  `).join('');
}

function updateRecentOrdersList(orders) {
  const container = document.getElementById('recent-orders-list');

  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="empty-state">No recent orders</div>';
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="list-item">
      <span class="list-item-icon">📜</span>
      <div class="list-item-content">
        <div class="list-item-title">${o.case_number}</div>
        <div class="list-item-subtitle">${o.order_type || 'Order'}</div>
        <div class="list-item-date">${formatDate(o.order_date)}</div>
      </div>
    </div>
  `).join('');
}

function updateCasesByCourtStats(cases) {
  const container = document.getElementById('cases-by-court');

  if (!cases || cases.length === 0) {
    container.innerHTML = '<div class="empty-state">No cases added yet</div>';
    return;
  }

  // Group by court
  const byCourt = cases.reduce((acc, c) => {
    const court = c.court_name || 'Unknown';
    if (!acc[court]) {
      acc[court] = { total: 0, pending: 0, disposed: 0 };
    }
    acc[court].total++;
    if (c.case_status === 'pending') acc[court].pending++;
    if (c.case_status === 'disposed') acc[court].disposed++;
    return acc;
  }, {});

  container.innerHTML = Object.entries(byCourt).map(([court, stats]) => `
    <div class="court-stat-item">
      <div class="court-stat-name">${court}</div>
      <div class="court-stat-numbers">
        <span>Total: ${stats.total}</span>
        <span>Pending: ${stats.pending}</span>
        <span>Disposed: ${stats.disposed}</span>
      </div>
    </div>
  `).join('');
}

// Cases
async function loadCases() {
  try {
    if (window.api) {
      const cases = await window.api.getAllCases();
      state.cases = cases || [];
      renderCasesTable(cases);
    }
  } catch (error) {
    console.error('Error loading cases:', error);
  }
}

function renderCasesTable(cases) {
  const tbody = elements.casesTableBody;

  if (!cases || cases.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          No cases found. Click "Add Case" to add your first case.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = cases.map(c => `
    <tr data-id="${c.id}">
      <td>
        <a href="#" class="case-link" onclick="viewCaseDetails(${c.id})">${c.case_number}</a>
      </td>
      <td>${c.court_name || '-'}</td>
      <td>
        <div>${c.petitioner || '-'}</div>
        <div style="color: var(--text-muted)">vs</div>
        <div>${c.respondent || '-'}</div>
      </td>
      <td>
        <span class="status-badge status-${c.case_status || 'pending'}">
          ${capitalizeFirst(c.case_status || 'pending')}
        </span>
      </td>
      <td>${c.next_hearing_date ? formatDate(c.next_hearing_date) : '-'}</td>
      <td>
        <span class="priority-badge priority-${c.priority || 'normal'}">
          ${capitalizeFirst(c.priority || 'normal')}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn action-btn-view" onclick="viewCaseDetails(${c.id})" title="View">👁️</button>
          <button class="action-btn action-btn-edit" onclick="editCase(${c.id})" title="Edit">✏️</button>
          <button class="action-btn action-btn-delete" onclick="deleteCase(${c.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Case Modal
function openCaseModal(caseData = null) {
  state.editingCaseId = caseData?.id || null;
  elements.modalTitle.textContent = caseData ? 'Edit Case' : 'Add New Case';

  // Reset form
  elements.caseForm.reset();

  // If editing, populate form
  if (caseData) {
    document.getElementById('case-court').value = caseData.court_name || '';
    document.getElementById('case-number').value = caseData.case_number || '';
    document.getElementById('case-type').value = caseData.case_type || '';
    document.getElementById('case-year').value = caseData.case_year || '';
    document.getElementById('cnr-number').value = caseData.cnr_number || '';
    document.getElementById('case-district').value = caseData.district || '';
    document.getElementById('petitioner').value = caseData.petitioner || '';
    document.getElementById('respondent').value = caseData.respondent || '';
    document.getElementById('advocate-petitioner').value = caseData.advocate_petitioner || '';
    document.getElementById('advocate-respondent').value = caseData.advocate_respondent || '';
    document.getElementById('filing-date').value = caseData.filing_date || '';
    document.getElementById('next-hearing').value = caseData.next_hearing_date || '';
    document.getElementById('case-status').value = caseData.case_status || 'pending';
    document.getElementById('case-priority').value = caseData.priority || 'normal';
    document.getElementById('judge-name').value = caseData.judge_name || '';
    document.getElementById('act-sections').value = caseData.act_sections || '';
    document.getElementById('case-notes').value = caseData.notes || '';
  }

  elements.caseModal.classList.add('active');
}

function closeCaseModal() {
  elements.caseModal.classList.remove('active');
  elements.caseForm.reset();
  state.editingCaseId = null;
}

async function handleCaseSubmit(e) {
  e.preventDefault();

  const caseData = {
    court_name: document.getElementById('case-court').value,
    case_number: document.getElementById('case-number').value,
    case_type: document.getElementById('case-type').value,
    case_year: document.getElementById('case-year').value ? parseInt(document.getElementById('case-year').value) : null,
    cnr_number: document.getElementById('cnr-number').value,
    district: document.getElementById('case-district').value,
    petitioner: document.getElementById('petitioner').value,
    respondent: document.getElementById('respondent').value,
    advocate_petitioner: document.getElementById('advocate-petitioner').value,
    advocate_respondent: document.getElementById('advocate-respondent').value,
    filing_date: document.getElementById('filing-date').value,
    next_hearing_date: document.getElementById('next-hearing').value,
    case_status: document.getElementById('case-status').value,
    priority: document.getElementById('case-priority').value,
    judge_name: document.getElementById('judge-name').value,
    act_sections: document.getElementById('act-sections').value,
    notes: document.getElementById('case-notes').value
  };

  try {
    if (window.api) {
      if (state.editingCaseId) {
        await window.api.updateCase(state.editingCaseId, caseData);
      } else {
        await window.api.addCase(caseData);
      }
    }

    closeCaseModal();
    await loadViewData(state.currentView);

    // Show success notification
    if (window.api) {
      window.api.showNotification(
        'Case Saved',
        `Case ${caseData.case_number} has been ${state.editingCaseId ? 'updated' : 'added'}`
      );
    }
  } catch (error) {
    console.error('Error saving case:', error);
    showError('Failed to save case: ' + error.message);
  }
}

// Case Actions
async function viewCaseDetails(id) {
  try {
    if (window.api) {
      const caseData = await window.api.getCase(id);
      if (caseData) {
        showCaseDetailsModal(caseData);
      }
    }
  } catch (error) {
    console.error('Error loading case details:', error);
  }
}

function showCaseDetailsModal(caseData) {
  const modal = document.getElementById('case-details-modal');
  const title = document.getElementById('case-details-title');
  const body = document.getElementById('case-details-body');

  title.textContent = caseData.case_number;

  body.innerHTML = `
    <div class="case-details">
      <div class="case-detail-section">
        <h4>Court</h4>
        <div class="case-detail-value">${caseData.court_name || '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>CNR Number</h4>
        <div class="case-detail-value">${caseData.cnr_number || '-'}</div>
      </div>
      <div class="case-detail-section full-width">
        <h4>Petitioner</h4>
        <div class="case-detail-value">${caseData.petitioner || '-'}</div>
      </div>
      <div class="case-detail-section full-width">
        <h4>Respondent</h4>
        <div class="case-detail-value">${caseData.respondent || '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Advocate (Petitioner)</h4>
        <div class="case-detail-value">${caseData.advocate_petitioner || '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Advocate (Respondent)</h4>
        <div class="case-detail-value">${caseData.advocate_respondent || '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Status</h4>
        <div class="case-detail-value">
          <span class="status-badge status-${caseData.case_status || 'pending'}">
            ${capitalizeFirst(caseData.case_status || 'pending')}
          </span>
        </div>
      </div>
      <div class="case-detail-section">
        <h4>Next Hearing</h4>
        <div class="case-detail-value">${caseData.next_hearing_date ? formatDate(caseData.next_hearing_date) : '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Filing Date</h4>
        <div class="case-detail-value">${caseData.filing_date ? formatDate(caseData.filing_date) : '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Judge</h4>
        <div class="case-detail-value">${caseData.judge_name || '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Act/Sections</h4>
        <div class="case-detail-value">${caseData.act_sections || '-'}</div>
      </div>
      <div class="case-detail-section">
        <h4>Priority</h4>
        <div class="case-detail-value">
          <span class="priority-badge priority-${caseData.priority || 'normal'}">
            ${capitalizeFirst(caseData.priority || 'normal')}
          </span>
        </div>
      </div>
      ${caseData.notes ? `
        <div class="case-detail-section full-width">
          <h4>Notes</h4>
          <div class="case-detail-value">${caseData.notes}</div>
        </div>
      ` : ''}
    </div>

    <div style="margin-top: 24px; display: flex; gap: 12px;">
      <button class="btn btn-primary" onclick="fetchCaseStatus(${caseData.id})">
        🔄 Fetch Latest Status
      </button>
      <button class="btn btn-secondary" onclick="editCase(${caseData.id})">
        ✏️ Edit Case
      </button>
    </div>
  `;

  modal.classList.add('active');
}

async function editCase(id) {
  try {
    document.getElementById('case-details-modal')?.classList.remove('active');

    if (window.api) {
      const caseData = await window.api.getCase(id);
      if (caseData) {
        openCaseModal(caseData);
      }
    }
  } catch (error) {
    console.error('Error loading case for edit:', error);
  }
}

async function deleteCase(id) {
  if (!confirm('Are you sure you want to delete this case?')) {
    return;
  }

  try {
    if (window.api) {
      await window.api.deleteCase(id);
      await loadViewData(state.currentView);
    }
  } catch (error) {
    console.error('Error deleting case:', error);
    showError('Failed to delete case');
  }
}

async function fetchCaseStatus(id) {
  try {
    showLoading();
    if (window.api) {
      const caseData = await window.api.getCase(id);
      const result = await window.api.fetchCaseStatus(caseData);

      hideLoading();

      if (result.requiresCaptcha) {
        // Open portal URL in browser for manual verification
        if (confirm('This portal requires CAPTCHA verification. Would you like to open it in your browser?')) {
          require('electron').shell.openExternal(result.portalUrl);
        }
      } else {
        await loadViewData(state.currentView);
        showSuccess('Case status updated');
      }
    }
  } catch (error) {
    hideLoading();
    console.error('Error fetching case status:', error);
    showError('Failed to fetch case status');
  }
}

// Hearings
async function loadHearings() {
  try {
    if (window.api) {
      const hearings = await window.api.getUpcomingHearings();
      renderHearings(hearings);
    }
  } catch (error) {
    console.error('Error loading hearings:', error);
  }
}

function renderHearings(hearings) {
  const container = document.getElementById('hearings-list');

  if (!hearings || hearings.length === 0) {
    container.innerHTML = '<div class="empty-state">No upcoming hearings scheduled</div>';
    return;
  }

  container.innerHTML = hearings.map(h => {
    const date = new Date(h.hearing_date);
    return `
      <div class="hearing-card">
        <div class="hearing-date-box">
          <div class="hearing-date-day">${date.getDate()}</div>
          <div class="hearing-date-month">${date.toLocaleString('default', { month: 'short' })}</div>
        </div>
        <div class="hearing-info">
          <div class="hearing-case-number">${h.case_number}</div>
          <div class="hearing-parties">${h.petitioner || ''} vs ${h.respondent || ''}</div>
          <div class="hearing-purpose">${h.purpose || 'Hearing'} | ${h.court_name || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Orders
async function loadOrders() {
  try {
    if (window.api) {
      const orders = await window.api.getRecentOrders();
      renderOrders(orders);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-list');

  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="empty-state">No recent orders</div>';
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-case">${o.case_number}</div>
          <div class="order-date">${formatDate(o.order_date)}</div>
        </div>
        <span class="order-type">${o.order_type || 'Order'}</span>
      </div>
      ${o.order_text ? `<div class="order-text">${o.order_text}</div>` : ''}
      ${o.order_url ? `<a href="${o.order_url}" target="_blank" class="btn btn-secondary" style="margin-top: 12px;">View Order →</a>` : ''}
    </div>
  `).join('');
}

// Filters
function handleFilterChange() {
  const courtFilter = document.getElementById('court-filter')?.value || '';
  const statusFilter = document.getElementById('status-filter')?.value || '';
  const priorityFilter = document.getElementById('priority-filter')?.value || '';

  let filteredCases = [...state.cases];

  if (courtFilter) {
    filteredCases = filteredCases.filter(c =>
      (c.court_name || '').includes(courtFilter)
    );
  }

  if (statusFilter) {
    filteredCases = filteredCases.filter(c => c.case_status === statusFilter);
  }

  if (priorityFilter) {
    filteredCases = filteredCases.filter(c => c.priority === priorityFilter);
  }

  renderCasesTable(filteredCases);
}

function filterByCourtType(courtType) {
  switchView('cases');

  // Set appropriate filter
  const courtFilter = document.getElementById('court-filter');
  if (courtFilter) {
    switch (courtType) {
      case 'supreme-court':
        courtFilter.value = 'Supreme Court';
        break;
      case 'high-court':
        courtFilter.value = 'High Court';
        break;
      case 'district-courts':
        courtFilter.value = 'District';
        break;
      default:
        courtFilter.value = '';
    }
    handleFilterChange();
  }
}

// Search
async function handleSearch() {
  const query = elements.searchInput.value.trim();

  if (!query) {
    await loadCases();
    return;
  }

  try {
    if (window.api) {
      const results = await window.api.searchCases(query);
      renderCasesTable(results);
      switchView('cases');
    }
  } catch (error) {
    console.error('Error searching cases:', error);
  }
}

// Refresh
async function refreshAllCases() {
  showLoading();
  try {
    // The main process handles the actual refresh
    // We just need to reload the view after
    await loadViewData(state.currentView);
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error refreshing cases:', error);
    showError('Failed to refresh cases');
  }
}

// Settings
function setupSettingsListeners() {
  // Auto refresh toggle
  document.getElementById('auto-refresh')?.addEventListener('change', async (e) => {
    if (window.api) {
      await window.api.setSetting('autoRefresh', e.target.checked);
    }
  });

  // Desktop notifications toggle
  document.getElementById('desktop-notifications')?.addEventListener('change', async (e) => {
    if (window.api) {
      await window.api.setSetting('desktopNotifications', e.target.checked);
    }
  });

  // Refresh interval
  document.getElementById('refresh-interval')?.addEventListener('change', async (e) => {
    if (window.api) {
      await window.api.setSetting('refreshInterval', parseInt(e.target.value));
    }
  });

  // Export data
  document.getElementById('export-data')?.addEventListener('click', exportData);

  // Import data
  document.getElementById('import-data')?.addEventListener('click', importData);

  // Clear data
  document.getElementById('clear-data')?.addEventListener('click', clearData);
}

async function exportData() {
  // TODO: Implement export to JSON/Excel
  alert('Export functionality coming soon');
}

async function importData() {
  // TODO: Implement import from JSON
  alert('Import functionality coming soon');
}

async function clearData() {
  if (!confirm('Are you sure you want to delete ALL cases? This cannot be undone.')) {
    return;
  }

  if (!confirm('This will permanently delete all your case data. Are you absolutely sure?')) {
    return;
  }

  // TODO: Implement clear all data
  alert('Clear data functionality coming soon');
}

// Utility Functions
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showLoading() {
  elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

function showError(message) {
  alert(message); // TODO: Replace with better notification
}

function showSuccess(message) {
  if (window.api) {
    window.api.showNotification('Success', message);
  }
}

// Make functions available globally for onclick handlers
window.viewCaseDetails = viewCaseDetails;
window.editCase = editCase;
window.deleteCase = deleteCase;
window.fetchCaseStatus = fetchCaseStatus;
