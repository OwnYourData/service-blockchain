exports.statusCodes = {
  'OK' : 200,
  'genericError' : 500,
  'unableToRetrieveGasPrice' : 501,
  'unableToRetrieveBalance' : 502,
  'insufficientFunds' : 503,
  'transactionNotOnBlockchain' : 504
 }

 exports.constants = {
   'safetyFactorGasLimit' : 1.0,
   'chainIdProduction' : 1,
   'chainIdTestnet' : 3,
   'nonceMinimumTestnet' : new Number(0x0)
 }
