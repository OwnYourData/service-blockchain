'use strict';

const noncePreferenceStrategy = require('./constants').noncePreferenceStrategy;

var _port;
var _privatekey;
var _nodeApikey;
var _noncePreference;

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

var assertNoncePreference = function() {
  if(_noncePreference === noncePreferenceStrategy.blockchain) {
    console.log("In case of conflict the blockchain nonce will be favored over the local nonce.");
  } else if (_noncePreference === noncePreferenceStrategy.local) {
    console.log("In case of conflict the local nonce will be favored over the blockchain nonce.");
  } else if (_noncePreference === noncePreferenceStrategy.higher) {
    console.log("In case of conflict between the blockchain and the local nonce the higher value will be favored.");
  } else if (_noncePreference === noncePreferenceStrategy.lower) {
    console.log("In case of conflict between the blockchain and the local nonce the lower value will be favored.");
  } else {
    console.error('Optional parameter >noncepreference< must be one of: blockchain, local, higher or lower. But was:',
     _noncePreference);
    process.exit(1);
  }
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
    { name: 'nodeapikey', alias : 'a', type: String},
    { name: 'noncepreference', alias : 'n', type: String}
  ]);
  _port = options.port || process.env.npm_package_config_port;
  assertPort();
  _privatekey = options.privatekey;
  assertPrivatekey();
  _nodeApikey = options.nodeapikey;
  assertNodeApiKey();
  _noncePreference = (options.noncepreference || process.env.npm_package_config_noncePreference).trim().toLowerCase();
  assertNoncePreference(options.noncepreference);
})();



exports.port = _port;

exports.privatekey = _privatekey;

exports.nodeApikey = _nodeApikey;

exports.noncePreference = _noncePreference;
