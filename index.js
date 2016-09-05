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

  matterLibs: [],

  // 'collider.json' contents.
  project: {},

  workspaceView: 'matter',

  download: {
    progress: 0
  },
};


// VIEWS
//

// ADD/REMOVE MATTER
//

Vue.component('workspace-matter', {
  template: '#workspace-matter-tpl',

  props: ['matterLibs'],

  methods: {
    addRemoveLib: function (id) {
      console.log(id);
    }
  },
});


// GENERATE MATTER
//

Vue.component('workspace-generate', {
  template: '#workspace-generate-tpl',

  data: function () {
    return {
      type: '',
      name: '',
      usesData: false,
      destLib: '',
    }
  },

  methods: {
    generate: function () {
      console.log(this.type, this.name, this.usesData, this.destLib);
    }
  },
});


// CONSOLE/LOG
//

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
  },
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

  // Lifecycle Hook -
  // At this stage all directives have been linked
  // so data changes will trigger DOM updates.
  compiled: function() {
    var app = this;
    $.get('http://getcollider.com/matter.json', function (data, status) {
      if (status === 'success') {
        app.state.matterLibs = data.libs;
      }
    }, 'json');
  },

  methods: {
    send: ipcRenderer.send,

    projectRunStop: function () {
      this.send('project-run-stop');

      // Switch to the log on project run.
      if (!this.state.isRunning) {
        this.state.workspaceView = 'log';
      }
    },
  },
});



// EVENTS
//

ipcRenderer.on('download:progress', function (e, progress) {
  state.download.progress = progress;
});

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
