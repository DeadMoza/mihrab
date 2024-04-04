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
      icon: 'themes/icons/mihrabIcon.png',

      webPreferences: {
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      }
    });
  
    win.loadFile('src/index.html');

    win.on('close', () => {
      win.close();
    })
  }

  function quitApp() {
    if(process.platform !== "darwin") app.quit();
  }

  try {
    require('electron-reloader') (module)

  } catch(_) {}

  let tray;

  app.whenReady().then(() => {
    createWindow();
    const icon = nativeImage.createFromPath('themes/icons/mihrabIcon.png');
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {label: 'Exit', type: 'normal', click: () => quitApp()},
      
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip("Mihrab");

    tray.addListener('click', () => createWindow());

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });


  });

  app.on('window-all-closed', () => {

  });
