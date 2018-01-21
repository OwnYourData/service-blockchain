'use strict';

module.exports = function(app, options) {
  var blockchain = require('../controllers/blockchainController');
  blockchain.setPrivatekey(options.privatekey);
  blockchain.setAddress(options.address);

/** create a blockchain transaction with the given hash as textual information. */
  app.route('/create')
    .post(blockchain.createTransaction);
};
