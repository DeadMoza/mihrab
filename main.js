const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');

const createWindow = () => {
    const win = new BrowserWindow({
      width: 700,
      height: 600,
      maximizable: false,
      fullscreenable: false,
      resizable: true,
      useContentSize: true,
      frame: false,
      icon: 'themes/icons/mahrib@5x.png',
    
       webPreferences: {
        nodeIntegration: true
       }
    });
  
    win.loadFile('src/index.html');
    win.webContents.openDevTools();
  }

  try {
    require('electron-reloader') (module)

  } catch(_) {}

  let tray;

  app.whenReady().then(() => {
    createWindow();
    const icon = nativeImage.createFromPath('themes/icons/mahrib.png');
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {label: 'Exit', type: 'normal', click: () => app.quit()},
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip("Mihrab");

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
