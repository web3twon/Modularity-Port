// apis.js

// Constants for Rarity Farming
const RARITY_FARMING_FUNCTION = '0xea20c3c6';
// Obfuscated API Key (this is a basic obfuscation, not secure for client-side use)
const _0x5a8e = ['4e524e4d3347465456', '52131', '4e524654393933464b4641364634594d31424d4734504b434b'];
(function(_0x39cef8, _0x5a8eb9) {
  const _0x41cf84 = function(_0x2839fc) {
    while (--_0x2839fc) {
      _0x39cef8.push(_0x39cef8.shift());
    }
  };
  _0x41cf84(++_0x5a8eb9);
}(_0x5a8e, 0xf3));
const _0x41cf = function(_0x39cef8, _0x5a8eb9) {
  _0x39cef8 = _0x39cef8 - 0x0;
  let _0x41cf84 = _0x5a8e[_0x39cef8];
  return _0x41cf84;
};
const POLYGONSCAN_API_KEY = (_0x41cf('0x0') + _0x41cf('0x2') + _0x41cf('0x1')).replace(/(.{2})/g, function(_0x2839fc) {
  return String.fromCharCode(parseInt(_0x2839fc, 0x10));
});

// Aavegotchi DAO/Project Payout Address
const AAVEGOTCHI_PAYOUT_ADDRESS = '0x821049b2273b0cCd34a64D1B08A3346F110eCAe2';

// Function to fetch rarity farming deposits
async function fetchRarityFarmingDeposits(escrowAddress) {
  const GHST_CONTRACT = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7'; // GHST token on Polygon
  const currentTime = Math.floor(Date.now() / 1000);
  const oneYearAgo = currentTime - 365 * 24 * 60 * 60;
  const url = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${escrowAddress}&startblock=0&endblock=999999999&sort=desc&apikey=${POLYGONSCAN_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '0' && data.message === 'No transactions found') {
      console.log(`No transactions found for address: ${escrowAddress}`);
      return [];
    }

    if (data.status !== '1') {
      throw new Error(`API request failed: ${data.message}`);
    }

    const deposits = data.result.filter(tx =>
      tx.to.toLowerCase() === escrowAddress.toLowerCase() &&
      tx.from.toLowerCase() === AAVEGOTCHI_PAYOUT_ADDRESS.toLowerCase() &&
      tx.contractAddress.toLowerCase() === GHST_CONTRACT.toLowerCase() &&
      parseInt(tx.timeStamp) >= oneYearAgo
    );

    return deposits.map(tx => ({
      hash: tx.hash,
      value: parseFloat(ethers.formatUnits(tx.value, 18)).toFixed(2),
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString()
    }));
  } catch (error) {
    console.error('Error fetching rarity farming deposits:', error);
    return [];
  }
}

console.log('apis.js loaded');