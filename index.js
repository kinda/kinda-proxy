"use strict";

var http = require('http');
var nodeURL = require('url');
var _ = require('lodash');
var httpProxy = require('http-proxy');
var KindaObject = require('kinda-object');
var util = require('kinda-util').create();
var config = require('kinda-config').get('kinda-proxy');

var proxy = httpProxy.createProxyServer({});

var KindaProxy = KindaObject.extend('KindaProxy', function() {
  this.setCreator(function() {
    this.routes = [];
    this.listeningPorts = [];
    _.forEach(config.routes, function(route) {
      var parsedFrom = nodeURL.parse(route.from);
      var hostname = parsedFrom.hostname;
      if (!hostname)
        throw new Error("hostname is missing in '" + route.from + "'");
      var port = parseInt(parsedFrom.port) || 80;
      if (port === 80 && process.getuid() !== 0) {
        util.log(route.from + ' ignored because you are not root');
        return;
      }
      this.routes.push({
        from: { hostname: hostname, port: port },
        to: route.to
      });
      if (this.listeningPorts.indexOf(port) === -1)
        this.listeningPorts.push(port);
    }, this);
  });

  this.start = function() {
    _.forEach(this.listeningPorts, function(port) {
      var server = http.createServer(this.handler.bind(this));
      server.on('listening', function() {
        util.log('Listening on port ' + port);
      });
      server.on('error', function(err) {
        util.error(err);
      });
      server.listen(port);
    }, this);
  };

  this.handler = function(req, res) {
    var hostname = req.headers.host || '';
    var index = hostname.indexOf(':');
    if (index !== -1) hostname = hostname.substr(0, index);
    var port = req.socket.localPort;
    var route = _.find(this.routes, function(route) {
      if (route.from.hostname === hostname && route.from.port === port)
        return true;
    });
    if (route) {
      proxy.web(req, res, { target: route.to }, function(err) {
        util.error(
          'Internal Error (' + err.message + '): ' +
          req.headers.host + req.url
        );
        res.statusCode = 500
        res.end('Internal Error');
      });
    } else {
      util.error('Not Found Error: ' + req.headers.host + req.url);
      res.statusCode = 404
      res.end('Not Found');
      return;
    }
  };
});

module.exports = KindaProxy;
