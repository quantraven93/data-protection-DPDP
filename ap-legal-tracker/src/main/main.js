const { app, BrowserWindow, ipcMain, Notification, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store');
const Database = require('../database/database');
const EcourtsService = require('../services/ecourts-service');
const SchedulerService = require('../services/scheduler-service');

// Initialize store for app settings
const store = new Store();

// Keep global references
let mainWindow = null;
let tray = null;
let db = null;
let ecourtsService = null;
let schedulerService = null;

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable webview tag for embedded browser
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('AP Legal Tracker window opened');
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'AP Legal Tracker',
      submenu: [
        { label: 'About AP Legal Tracker', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => openPreferences() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Cmd+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Cases',
      submenu: [
        { label: 'Add New Case', accelerator: 'Cmd+N', click: () => sendToRenderer('add-case') },
        { label: 'Refresh All Cases', accelerator: 'Cmd+R', click: () => refreshAllCases() },
        { type: 'separator' },
        { label: 'Import Cases...', click: () => sendToRenderer('import-cases') },
        { label: 'Export Cases...', click: () => sendToRenderer('export-cases') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Dashboard', accelerator: 'Cmd+1', click: () => sendToRenderer('view-dashboard') },
        { label: 'All Cases', accelerator: 'Cmd+2', click: () => sendToRenderer('view-cases') },
        { label: 'Upcoming Hearings', accelerator: 'Cmd+3', click: () => sendToRenderer('view-hearings') },
        { label: 'Recent Orders', accelerator: 'Cmd+4', click: () => sendToRenderer('view-orders') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  // Create tray icon for quick access
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(nativeImage.createFromPath(iconPath));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open AP Legal Tracker', click: () => mainWindow.show() },
    { label: 'Refresh Cases', click: () => refreshAllCases() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('AP Legal Tracker');
  tray.setContextMenu(contextMenu);
}

function sendToRenderer(channel, data = {}) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, data);
  }
}

function openPreferences() {
  sendToRenderer('open-preferences');
}

async function refreshAllCases() {
  log.info('Refreshing all cases...');
  sendToRenderer('refresh-start');

  try {
    const cases = db.getAllCases();
    for (const caseItem of cases) {
      await ecourtsService.fetchCaseStatus(caseItem);
    }
    sendToRenderer('refresh-complete');
    showNotification('Cases Updated', 'All case statuses have been refreshed');
  } catch (error) {
    log.error('Error refreshing cases:', error);
    sendToRenderer('refresh-error', { error: error.message });
  }
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // Case management
  ipcMain.handle('get-all-cases', () => db.getAllCases());
  ipcMain.handle('get-case', (event, id) => db.getCase(id));
  ipcMain.handle('add-case', (event, caseData) => db.addCase(caseData));
  ipcMain.handle('update-case', (event, id, caseData) => db.updateCase(id, caseData));
  ipcMain.handle('delete-case', (event, id) => db.deleteCase(id));
  ipcMain.handle('search-cases', (event, query) => db.searchCases(query));

  // Case status fetching
  ipcMain.handle('fetch-case-status', async (event, caseData) => {
    return await ecourtsService.fetchCaseStatus(caseData);
  });

  ipcMain.handle('fetch-case-orders', async (event, caseData) => {
    return await ecourtsService.fetchCaseOrders(caseData);
  });

  // eCourts Search - Auto fetch like Mercury Lawyer
  ipcMain.handle('search-ecourts', async (event, searchParams) => {
    log.info('Searching eCourts:', searchParams);
    return await ecourtsService.searchCase(searchParams);
  });

  ipcMain.handle('search-by-cnr', async (event, cnrNumber) => {
    log.info('Searching by CNR:', cnrNumber);
    return await ecourtsService.searchByCNR(cnrNumber);
  });

  ipcMain.handle('get-case-types', (event, courtType) => {
    return ecourtsService.getCaseTypes(courtType);
  });

  ipcMain.handle('get-ap-districts', () => {
    return ecourtsService.getDistricts();
  });

  ipcMain.handle('close-browser', async () => {
    await ecourtsService.closeBrowser();
  });

  // Hearings
  ipcMain.handle('get-upcoming-hearings', () => db.getUpcomingHearings());
  ipcMain.handle('add-hearing', (event, hearingData) => db.addHearing(hearingData));

  // Orders
  ipcMain.handle('get-recent-orders', () => db.getRecentOrders());
  ipcMain.handle('add-order', (event, orderData) => db.addOrder(orderData));

  // Settings
  ipcMain.handle('get-settings', () => store.store);
  ipcMain.handle('set-setting', (event, key, value) => store.set(key, value));

  // Notifications
  ipcMain.on('show-notification', (event, { title, body }) => {
    showNotification(title, body);
  });

  // Court data
  ipcMain.handle('get-courts', () => db.getCourts());
  ipcMain.handle('get-districts', () => db.getDistricts());
}

// App lifecycle
app.whenReady().then(async () => {
  log.info('Starting AP Legal Tracker...');

  // Initialize database
  db = new Database(app.getPath('userData'));
  await db.initialize();

  // Initialize services
  ecourtsService = new EcourtsService(db);
  schedulerService = new SchedulerService(db, ecourtsService, showNotification);

  // Start scheduler for background updates
  const autoRefresh = store.get('autoRefresh', true);
  if (autoRefresh) {
    schedulerService.start();
  }

  createWindow();
  createTray();
  setupIpcHandlers();

  log.info('AP Legal Tracker started successfully');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (schedulerService) {
    schedulerService.stop();
  }
  if (db) {
    db.close();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection:', reason);
});
