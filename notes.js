// Usage

var proxy = require('kinda-proxy').create();

proxy.start();

// Config

var config = {
  "kinda-proxy": {
    routes: [
      { from: 'http://dev.kinda.io:80', to: 'http://localhost:8101' },
      { from: 'http://api.dev.kinda.io:80', to: 'http://localhost:8102' }
    ]
  }
};
