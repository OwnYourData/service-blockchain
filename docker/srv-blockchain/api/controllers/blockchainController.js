'use strict';

const configuration = require('../../configuration');
const constants = require('../../constants').constants;
const errorcodes = require('../../constants').errorcodes;
const apiProduction = require('etherscan-api').init(configuration.nodeapikey);
const apiTestnet = require('etherscan-api').init(configuration.nodeapikey,'ropsten');
const ethTx = require('ethereumjs-tx');
const ethUtil = require('ethereumjs-util');
const ethUnits = require('ethereumjs-units');

// validate private key is hexadecimal.
(function() {
  if(!ethUtil.isHexString(ethUtil.addHexPrefix(configuration.privatekey))){
    console.error("Error: The given private key must be hexadecimal.");
    process.exit(1);
  }
})();

const privatekey = Buffer.from(configuration.privatekey, 'hex');
// validate private key is an ethereum private key.
(function() {
  if(!ethUtil.isValidPrivate(privatekey)){
    console.error("Error: The given private key is not a valid ethereum private key.");
    process.exit(1);
  } else {
    console.log("Configured private key accepted.")
  }
})();
const _myAddress = ethUtil.bufferToHex(ethUtil.privateToAddress(privatekey));
console.log("Using the following address for sending as well as receiving: " + _myAddress);

var _nonceProduction;
var _nonceTestnet
//initialize nonce values for production and testnet.
(function() {
  //production nonce
  apiProduction.proxy.eth_getTransactionCount(_myAddress)
  .then(function(success) {
    var _nonceProduction = ethUtil.addHexPrefix(success.result);
    console.log('nonce initalised with value: ',_nonceProduction);
  })
  .catch(function(err) {
    console.error("Unable to initialise Nonce for the address ",_myAddress, err);
    process.exit(1);
  });
  //testnet nonce
  apiTestnet.proxy.eth_getTransactionCount(_myAddress)
  .then(function(success) {
    var nonceHex = ethUtil.addHexPrefix(success.result);
    console.log(nonceHex)
   _nonceTestnet = new Number(nonceHex) + constants.nonceMinimumTestnet +3; //FIXME
    console.log('Testnet nonce initalised with value: ',_nonceTestnet);
  })
  .catch(function(err) {
    console.log("Unable to get Testnet Nonce for the address ",_myAddress, ". Using default value.", err);
    _nonceTestnet = constants.nonceMinimumTestnet;
  });
})();

var getNonce = function (isTestnet) {
  if(isTestnet) return _nonceTestnet;
  else return _nonceProduction;
}

var incrementNonce = function (isTestnet) {
  if(isTestnet) _nonceTestnet += 1;
  else nonceProduction += 1;
}

var getChainId = function (isTestnet) {
  if(isTestnet) return constants.chainIdTestnet;
  else return constants.chainIdProduction;
}

var getApi = function (isTestnet) {
  if(isTestnet) return apiTestnet;
  else return apiProduction;
}


var decimalToHex = function(dec) {
  return new Number(dec).toString(16);
}

var hexToDecimal = function(hex) {
    return new Number(ethUtil.addHexPrefix(hex)).toString();
}


var createSignedTransaction = function(data, gasPriceHex,isTestnet) {
  var txParams = {
    "nonce":ethUtil.addHexPrefix(decimalToHex(getNonce(isTestnet))),
    "gasPrice":ethUtil.addHexPrefix(gasPriceHex),
    "gasLimit":0,
    "to":_myAddress,
    "value":"0x0",
    "data":data,
    "chainId":getChainId(isTestnet)
  };
  const tx = new ethTx(txParams);
  tx.gasLimit = ethUtil.addHexPrefix(tx.getBaseFee().muln(constants.safetyFactorGasLimit).toString(16));
  console.log(txParams);
  console.log(tx.gasLimit);
  tx.sign(privatekey);
  return tx;
}

var sendSignedTransaction = function(requestId,tx,res,isTestnet) {
  var txHex = ethUtil.addHexPrefix(tx.serialize().toString('hex'));
  getApi(isTestnet).proxy.eth_sendRawTransaction(txHex)
    .then(function(success){
      incrementNonce(isTestnet);
      res.json({
        "id" : requestId,
        "transaction-id" :  success.result,
        "status" : 200
      });
      console.log('successfully created transaction ' + success.result + ' for request with id ' + requestId);
    })
    .catch(function(err){
      console.error(err);
      res.statusCode = 500;
      res.json({
        "id" : requestId,
        "status" : 501,
        "error" : err
      });
    });
}

var checkFundsAndSendEthereumTransaction = function(requestId,data,res,isTestnet) {
  getApi(isTestnet).proxy.eth_gasPrice()
  .then(function(success) {
    var gasPriceHex;
    //var correctedGasPriceHex = decimalToHex(hexToDecimal(gasPriceHex)*2);
    if(isTestnet) {
      gasPriceHex = decimalToHex(50000000000);//eth_gasPrice does not give correct value for testnet.
    } else {
      gasPriceHex = success.result;
    }
    const tx = createSignedTransaction(data, gasPriceHex,isTestnet);
    //verify if sufficient balance:
    getApi(isTestnet).account.balance(_myAddress)
    .then(function(success){
      var balance = success.result;
      var baseFeeGas = tx.getBaseFee();
      var baseFeeWei = hexToDecimal(baseFeeGas)*hexToDecimal(gasPriceHex);
      console.log("base fee in gas: ", hexToDecimal(baseFeeGas));
      console.log("base fee in ether: ", ethUnits.convert(baseFeeWei,'wei','eth'));

      if(balance < baseFeeWei) {
        var errInsufficientFunds = "Insufficient Funds for transaction. Needed " + ethUnits.convert(baseFeeWei,'wei','eth') + " Ether but got " + ethUnits.convert(balance,'wei','eth');
        console.error(errInsufficientFunds);
        res.statusCode = errorcodes.insufficientFunds;
        res.json({
          "id" : requestId,
          "status" : errorcodes.insufficientFunds,
          "error" : errInsufficientFunds
        });
      } else {
        sendSignedTransaction(requestId,tx,res,isTestnet);
      }
    })
    .catch(function(err){
      console.error(err);
      res.statusCode = errorcodes.unableToRetrieveBalance;
      res.json({
        "id" : requestId,
        "status" : errorcodes.unableToRetrieveBalance,
        "error" : err
      });
    })
  })
  .catch(function(err){
    console.error(err);
    res.statusCode = errorcodes.unableToRetrieveGasPrice;
    res.json({
      "id" : requestId,
      "status" : errorcodes.unableToRetrieveGasPrice,
      "error" : err
    });
  });

};

exports.sendMessage = function(req, res) {
    checkFundsAndSendEthereumTransaction(req.body.id,req.body.hash,res, false);
};

exports.sendMessageTestnet = function(req, res) {
    checkFundsAndSendEthereumTransaction(req.body.id,req.body.hash,res, true);
};
