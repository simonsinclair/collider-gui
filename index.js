// index.js
//

'use strict';

var pkg = require('./package.json');

// Electron.
var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;

var tildify = require('tildify');
var Vue = require('vue');
var $ = require('jquery');

Vue.config.devtools = true;
Vue.config.debug = true;


// STATE
//

var state = {
  isRunning: false,
  isLoaded: false,

  location: '',

  logText: '',

  // 'collider.json' contents.
  project: {},

  showingNewProjectModal: false,

  workspaceView: 'matter',
};


// VIEWS
//

Vue.component('workspace-matter', {
  template: '#workspace-matter-tpl',
});

Vue.component('workspace-generate', {
  template: '#workspace-generate-tpl',
});

Vue.component('workspace-log', {
  template: '#workspace-log-tpl',
  data: function () {
    return { text: '' }
  },
  methods: {
    updateScrollTop: function () {
      this.$el.scrollTop = this.$el.offsetHeight;
    }
  },
  events: {
    'log-change': function (str) {
      this.text += str;

      // Wait for Vue to update the DOM
      // before calling updateScrollTop().
      this.$nextTick(function () {
        this.updateScrollTop();
      });
    }
  }
});


// COMPONENTS
//

Vue.component('modal', {
  template: '#modal-tpl',
});


// APP
//

var app = new Vue({
  el: '#app',

  data: {
    state: state,
    collider: {
      version: pkg.version
    },
  },

  methods: {
    send: ipcRenderer.send
  },
});



// EVENTS
//

// Fired on:
// - New, and
// - Open
ipcRenderer.on('did-open-project', function (e, dir, data) {
	state.isLoaded = true;
  state.location = {
    rel: tildify(dir),
    abs: dir,
  };
  state.project = data;
});

ipcRenderer.on('did-run-project', function (e, args) {
	state.isRunning = true;
});

ipcRenderer.on('did-stop-project', function (e, args) {
	state.isRunning = false;
});

// Log.
ipcRenderer.on('logOut', function (e, str) {
  app.$broadcast('log-change', str);
});

ipcRenderer.on('logErr', function (e, str) {
  app.$broadcast('log-change', str);
});
