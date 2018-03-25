'use strict';

var _port;
var _privatekey;
var _nodeApikey;
var _isTestnet;

var assertPort = function() {
  if(!_port) {
    console.error('Error: No port given.');
    process.exit(1);
  }
  if(!Number(_port)) {
    console.error('Error:' + _port + ' is not a valid port number.');
    process.exit(1);
  }
};

var assertPrivatekey = function() {
  if(!_privatekey) {
    console.error('Error: No private key given.');
    process.exit(1);
  }
};

var assertNodeApiKey = function() {
  if(!_nodeApikey) {
    console.error('Error: No API key given.');
    process.exit(1);
  }
};

(function () {
  const commandLineArgs = require('command-line-args');
  const options = commandLineArgs([
    { name: 'port', alias: 'p', type: Number },
    { name: 'privatekey', alias : 'k', type: String},
    { name: 'nodeapikey', alias : 'a', type: String}
  ]);
  _port = options.port || process.env.npm_package_config_port;
  assertPort();
  _privatekey = options.privatekey;
  assertPrivatekey();
  _nodeApikey = options.nodeapikey;
  assertNodeApiKey();
})();



exports.port = _port;

exports.privatekey = _privatekey;

exports.nodeApikey = _nodeApikey;
