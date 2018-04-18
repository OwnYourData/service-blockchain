'use strict';

const configuration = require('../../configuration');
const constants = require('../../constants').constants;
const statusCodes = require('../../constants').statusCodes;
const noncePreferenceStrategy = require('../../constants').noncePreferenceStrategy;
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

/**
get current transaction count for the configured address. */
var getTransactionCount = function (isTestnet) {
  var api = isTestnet ? apiTestnet : apiProduction;
  return api.proxy.eth_getTransactionCount(_myAddress);
}

var _nonceProduction;
var _nonceTestnet
//initialize nonce values for production and testnet.
(async function initializeNonce() {
  //Production Nonce
  try {
      var transactionCountResponse = await getTransactionCount(false);
      _nonceProduction = new Number(ethUtil.addHexPrefix(transactionCountResponse.result));
      console.log('Production Nonce initalised with value: ',_nonceProduction);
    }
    catch(err) {
      console.log("Unable to get Production Nonce for the address ",_myAddress, ".", err);
      process.exit(1);
    }
  //Testnet Nonce
  try {
      var transactionCountResponseTestnet = await getTransactionCount(true);
      var nonce = new Number(ethUtil.addHexPrefix(transactionCountResponseTestnet.result));
      nonce += constants.nonceMinimumTestnet;
      _nonceTestnet = nonce;
      console.log('Testnet Nonce initalised with value: ',_nonceTestnet);
    }
    catch(err) {
      //do not end process because test system issues must not kill production system.
      console.log("Unable to get Testnet Nonce for the address ",_myAddress, ".", err);
      _nonceTestnet = constants.nonceMinimumTestnet;
      console.log("Using fallback value of ",_nonceTestnet, " instead.");
    }
})();

/**
gets the current Nonce for the configured address. If the locally counted value differs from
the transaction count value on the blockchain, then the configured resolution strategy is applied.
*/
var getNonce = async function (isTestnet) {
  var localValue = isTestnet ? _nonceTestnet : _nonceProduction;
  try {
      var success = await getTransactionCount(isTestnet);
      var blockchainValue = new Number(ethUtil.addHexPrefix(success.result));
      var preferredNonce;

      if(configuration.noncePreference === noncePreferenceStrategy.blockchain) {
        preferredNonce = blockchainValue;
      } else if (configuration.noncePreference === noncePreferenceStrategy.local) {
        preferredNonce = localValue;
      } else if (configuration.noncePreference === noncePreferenceStrategy.higher) {
        preferredNonce = Math.max(blockchainValue,localValue);
      } else {
        preferredNonce = Math.min(blockchainValue,localValue);
      }

      if(isTestnet) {
        _nonceTestnet = preferredNonce;
      } else {
        _nonceProduction = preferredNonce;
      }
      return preferredNonce;
    } catch(err) {
      console.log("Unable to get blockchain Nonce for the address ",_myAddress, ".", err);
      console.error("Using local value of ", localValue, " for Nonce instead. Caution: This may lead to unmined transactions.");
      return localValue;
    }
}


var incrementNonce = function (isTestnet) {
  if(isTestnet) _nonceTestnet += 1;
  else _nonceProduction += 1;
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


var createSignedTransaction = async function(data, gasPriceHex,isTestnet) {
  var txParams = {
    "nonce":ethUtil.addHexPrefix(decimalToHex(await getNonce(isTestnet))),
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
  tx.sign(privatekey);
  return tx;
}

var sendSignedTransaction = async function(requestId,tx,res,isTestnet) {
  var txHex = ethUtil.addHexPrefix(tx.serialize().toString('hex'));
  try {
    var success = await getApi(isTestnet).proxy.eth_sendRawTransaction(txHex);
      incrementNonce(isTestnet);
      res.json({
        "id" : requestId,
        "transaction-id" :  success.result,
        "status" : statusCodes.OK
      });
      console.log('successfully created transaction ' + success.result + ' for request with id ' + requestId);
    }
    catch(err){
      console.error("Error sending signed transaction: ", err);
      res.statusCode = statusCodes.genericError;
      res.json({
        "id" : requestId,
        "status" : statusCodes.genericError,
        "error" : err
      });
    }
}

var checkFundsAndSendEthereumTransaction = async function(requestId,data,res,isTestnet) {
  try {
    var gasPriceResponse = await getApi(isTestnet).proxy.eth_gasPrice();
    var gasPriceHex;
    if(isTestnet) {
      gasPriceHex = decimalToHex(50000000000);//eth_gasPrice does not give correct value for testnet.
    } else {
      gasPriceHex = gasPriceResponse.result;
    }
    const tx = await createSignedTransaction(data, gasPriceHex,isTestnet);
    //verify if sufficient balance:
    try {
      var balanceResponse = await getApi(isTestnet).account.balance(_myAddress);
      var balance = balanceResponse.result;
      var baseFeeGas = tx.getBaseFee();
      var baseFeeWei = hexToDecimal(baseFeeGas)*hexToDecimal(gasPriceHex);
      console.log("base fee in gas: ", hexToDecimal(baseFeeGas));
      console.log("base fee in ether: ", ethUnits.convert(baseFeeWei,'wei','eth'));

      if(balance < baseFeeWei) {
        var errInsufficientFunds = "Insufficient Funds for transaction. Needed " + ethUnits.convert(baseFeeWei,'wei','eth') + " Ether but got " + ethUnits.convert(balance,'wei','eth');
        console.error(errInsufficientFunds);
        res.statusCode = statusCodes.insufficientFunds;
        res.json({
          "id" : requestId,
          "status" : statusCodes.insufficientFunds,
          "error" : errInsufficientFunds
        });
      } else {
        sendSignedTransaction(requestId,tx,res,isTestnet);
      }
    }
    catch(err){
      console.error(err);
      res.statusCode = statusCodes.unableToRetrieveBalance;
      res.json({
        "id" : requestId,
        "status" : statusCodes.unableToRetrieveBalance,
        "error" : err
      });
    }
  }
  catch(err){
    console.error(err);
    res.statusCode = statusCodes.unableToRetrieveGasPrice;
    res.json({
      "id" : requestId,
      "status" : statusCodes.unableToRetrieveGasPrice,
      "error" : err
    });
  }
}

var checkEthereumTransaction = async function(requestId, transactionHash, res, isTestnet) {
  try {
  var transactionReceiptResponse = await getApi(isTestnet).proxy.eth_getTransactionReceipt(transactionHash);
    console.log('Transaction found: ' , transactionReceiptResponse);
    if(transactionReceiptResponse.result != null) {
      try {
        var blockResponse = await getApi(isTestnet).proxy.eth_getBlockByNumber(transactionReceiptResponse.result.blockNumber, false);
        console.log('Block found: ' , blockResponse);
        if(blockResponse != null) {
          transactionReceiptResponse.result.blockTimestamp = blockResponse.result.timestamp;
        }
        else {
          transactionReceiptResponse.result.blockTimestamp = 'unknown';
        }
        console.log('Timestamp is: ' , blockResponse.result.timestamp);
        res.json({
          "id" : requestId,
          "transaction-status" :  transactionReceiptResponse.result,
          "status" : statusCodes.OK
        });
      }
      catch(blockErr) {
        console.error(blockErr);
        res.statusCode = statusCodes.genericError;
        res.json({
          "id" : requestId,
          "status" : statusCodes.genericError,
          "error" : 'could not retrieve block information. ' + blockErr
        });
      }
    }
    else {
      res.json({
        "id" : requestId,
        "transaction-status" :  transactionReceiptResponse.result,
        "status" : statusCodes.transactionNotOnBlockchain
      });
    }
  }
  catch(err){
    console.error(err);
    res.statusCode = statusCodes.genericError;
    res.json({
      "id" : requestId,
      "status" : statusCodes.genericError,
      "error" : 'Could not retrieve transaction-status. ' + err
    });
  }
}

var getBalance = async function(requestId,res,isTestnet) {
  try {
    var success = await getApi(isTestnet).account.balance(_myAddress)
    res.statusCode = statusCodes.OK;
    res.json({
      "id" : requestId,
      "balanceEther" : ethUnits.convert(success.result,'wei','eth'),
      "status" : statusCodes.OK
    });
  }
  catch(err){
    console.error(err);
    res.statusCode = statusCodes.genericError;
    res.json({
      "id" : requestId,
      "status" : statusCodes.genericError,
      "error" : err
    });
  }
}

exports.sendMessage = function(req, res) {
  checkFundsAndSendEthereumTransaction(req.body.id,req.body.hash,res, false);
};

exports.sendMessageTestnet = function(req, res) {
  checkFundsAndSendEthereumTransaction(req.body.id,req.body.hash,res, true);
};

exports.getTransactionStatus = function(req, res) {
  checkEthereumTransaction(req.body.id,req.body.hash,res, false);
};

exports.getTransactionStatusTestnet = function(req, res) {
  checkEthereumTransaction(req.body.id,req.body.hash,res, true);
};

exports.getBalance = function(req, res) {
  getBalance(req.body.id,res,false);
}
exports.getBalanceTestnet = function(req, res) {
  getBalance(req.body.id,res,true);
}
