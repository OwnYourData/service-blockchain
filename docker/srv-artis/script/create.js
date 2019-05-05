// Arguments
// args[2] - provider, e.g., https://rpc.tau1.artis.network
// args[3] - private key (0x...)
// args[4] - payload (0x...)

const args = process.argv;
const provider = args[2];
const privateKey = args[3];
const data = args[4];

const GAS_PRICE = 1000000000;
const Web3 = require('web3');
const web3 = new Web3(provider);
const sender = web3.eth.accounts.privateKeyToAccount(privateKey).address;

send();

async function send() {
  const txObj = {
    from: sender,
    to: sender,
    value: 0,
    gasPrice: GAS_PRICE,
    data: data
  };

  const gasEstimate = await web3.eth.estimateGas(txObj);
  txObj.gas = gasEstimate;

  const signedTxObj = await web3.eth.accounts.signTransaction(txObj, privateKey);

  web3.eth.sendSignedTransaction(signedTxObj.rawTransaction)
    .once('transactionHash', function (txHash) {
      console.log(txHash);
    })
    .on('error', function (err) {
      console.error(`token transfer transaction failed: ${err}`);
    });
}
