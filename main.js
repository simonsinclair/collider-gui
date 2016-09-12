'use strict';

var collider = require('./lib/collider');
var cmds = require('./lib/commands');
var matter = require('./lib/matter');

// Electron
var electron = require('electron');
var app      = electron.app;
var ipcMain  = electron.ipcMain;
var dialog   = electron.dialog;

var _ = require('lodash');
var os = require('os');
var path = require('path');

require('electron-debug')();
require('fix-path')();

var spawn = require('child_process').spawn;

var mainWindow;

function onClosed() {
	mainWindow = null;
}

function createMainWindow() {
	var win = new electron.BrowserWindow({
		width: 800,
		height: 600,
	});

	win.loadURL(`file://${__dirname}/index.html`);
	win.on('closed', onClosed);

	return win;
}

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', function () {
	mainWindow = createMainWindow();


	// Collider
	//

  var project = {};
	var projectDir = '';
	var projectRunning = false;

	var gulp = null;


	// EVENTS
	//

	ipcMain.on('project-open', function () {
		dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }, function (dir) {

      // If a dir. wasn't selected, don't
      // attempt to load 'collider.json'.
      if (!dir) return;

      // Reduce 'dir' from array to string.
      dir = dir[0];

      collider.load(dir, function (err, data) {
        if (!err) {
          projectDir = dir;
          mainWindow.webContents.send('did-open-project', projectDir, data);
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            buttons: ['Okay'],
            defaultId: 0,
            message: "Unable to open the selected directory.",
            detail: "Please make sure it's a Collider project.",
          });
        }
      });
		});
	});

  ipcMain.on('project-new', function () {
    dialog.showSaveDialog(mainWindow, {
      defaultPath: os.homedir(),
      buttonLabel: 'Create'
    }, function (filename) {

      // If user clicked cancel, do nothing.
      if (!filename) return;

      // To do: verify 'filename' is a valid directory
      //        name before setting 'newProjectDir'.
      var newProjectDir = filename;
      var newProjectDirParsed = path.parse(newProjectDir);

      var cmd = cmds.new({
        name: newProjectDirParsed.name,
        dir: newProjectDirParsed.dir,
        author: 'Unknown',
        matterLibs: [],
      }, function (err) {
        if (err) throw err;

        collider.load(newProjectDir, function (err, data) {
          if (err) throw err;

          // Update 'projectDir' and open
          // the new project in the GUI.
          projectDir = newProjectDir;
          mainWindow.webContents.send('did-open-project', projectDir, data);
        });
      });

      cmd.on('download:progress', function (progress) {
        mainWindow.webContents.send('download:progress', progress);
      });

      cmd.on('extract:progress', function (progress) {
        mainWindow.webContents.send('extract:progress', progress);
      });
    });
  })

	ipcMain.on('project-run-stop', function () {

    // TO DO: Run button needs to have an in process state,
    //        that prevents people from clicking it
    //        repeatedly, to prevent errors.

    if (projectRunning) {

      gulp.kill();

    } else {

      // Intermediate state.
      mainWindow.webContents.send('starting-project');

      // Start.
      var cmd = cmds.run(projectDir, function (err, _gulp) {
        if (err) throw err;

        gulp = _gulp;
        projectRunning = true;
        mainWindow.webContents.send('did-run-project');
      });

      // On Stop.
      cmd.on('run:gulp-close', function (code, signal) {
        gulp = null;
        projectRunning = false;
        mainWindow.webContents.send('did-stop-project', code, signal);
      });

      // Log events.
      cmd.on('run:gulp-stdout', function (str) {
        mainWindow.webContents.send('logOut', str);
      });

      cmd.on('run:gulp-stderr', function (str) {
        mainWindow.webContents.send('logErr', str);
      });

      // Process error.
      // - The process could not be spawned, or
      // - The process could not be killed
      cmd.on('run:gulp-error', function (err) {
        throw err;
      });

    }
	});

  ipcMain.on('matter:add', function (e, libId) {
    collider.load(projectDir, function (err, project) {
      if (err) throw err;

      project.matterLibs.push(libId);
      collider.save(projectDir, project, function (err) {
        if (err) throw err;
        mainWindow.webContents.send('project:updated', project);
      });
    });
  });

  ipcMain.on('matter:remove', function (e, libId) {
    collider.load(projectDir, function (err, project) {
      if (err) throw err;

      matter.getLibIndex(function (err, matterLibIndex) {
        var libInfo = matter.getLibInfo(matterLibIndex, libId);

        matter.clean(projectDir, libInfo, function (err) {
          _.remove(project.matterLibs, function (item) {
            return item === libId;
          });

          collider.save(projectDir, project, function (err) {
            if (err) throw err;
            mainWindow.webContents.send('project:updated', project);
          });
        });
      });
    });
  });

});
