'use strict';

module.exports = function(app) {
  var blockchain = require('../controllers/blockchainController');
/** create a blockchain transaction with the given hash as textual information. */
  app.route('/create')
    .post(blockchain.sendMessage);
/** create a blockchain transaction in TESTNET with the given hash as textual information. */
  app.route('/createTestnet')
    .post(blockchain.sendMessageTestnet);
};
