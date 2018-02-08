'use strict';

module.exports = function(app) {
  var blockchain = require('../controllers/blockchainController');
  /** create a blockchain transaction with the given hash as textual information. */
  app.route('/create')
    .post(blockchain.sendMessage);
  /** create a blockchain transaction in TESTNET with the given hash as textual information. */
  app.route('/createTestnet')
    .post(blockchain.sendMessageTestnet);
  /** get status of a blockchain transaction identified by its transaction hash. */
  app.route('/getTransactionStatus')
    .get(blockchain.getTransactionStatus);
  /** get status of a TESTNET blockchain transaction identified by its transaction hash. */
  app.route('/getTransactionStatusTestnet')
    .get(blockchain.getTransactionStatusTestnet);
  /** get the balance in ether of the used address (which is derived from the configured private key) */
  app.route('/getBalance')
    .get(blockchain.getBalance);
  /** get the balance in ether of the used TESTNET address (which is derived from the configured private key) */
  app.route('/getBalanceTestnet')
    .get(blockchain.getBalanceTestnet);
};
