import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
export const GHST_CONTRACT_ADDRESS = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7'; // GHST token address on Polygon

export const DIAMOND_ABI = [
  // Diamond facet for single transfer
  {
    inputs: [
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'address', name: '_erc20Contract', type: 'address' },
      { internalType: 'address', name: '_recipient', type: 'address' },
      { internalType: 'uint256', name: '_transferAmount', type: 'uint256' }
    ],
    name: 'transferEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Aavegotchi facet for batch transfer
  {
    inputs: [
      { internalType: 'uint256[]', name: '_tokenIds', type: 'uint256[]' },
      { internalType: 'address[]', name: '_erc20Contracts', type: 'address[]' },
      { internalType: 'address[]', name: '_recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: '_transferAmounts', type: 'uint256[]' }
    ],
    name: 'batchTransferEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'tokenIdsOfOwner',
    outputs: [{ internalType: 'uint32[]', name: 'tokenIds_', type: 'uint32[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint32[]', name: '_tokenIds', type: 'uint32[]' }],
    name: 'getAavegotchisBatch',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'randomNumber', type: 'uint256' },
          { internalType: 'uint256', name: 'status', type: 'uint256' },
          { internalType: 'int16[6]', name: 'numericTraits', type: 'int16[6]' },
          { internalType: 'int16[6]', name: 'modifiedNumericTraits', type: 'int16[6]' },
          { internalType: 'uint16[16]', name: 'equippedWearables', type: 'uint16[16]' },
          { internalType: 'address', name: 'collateral', type: 'address' },
          { internalType: 'address', name: 'escrow', type: 'address' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'minimumStake', type: 'uint256' },
          { internalType: 'uint256', name: 'kinship', type: 'uint256' },
          { internalType: 'uint256', name: 'lastInteracted', type: 'uint256' },
          { internalType: 'uint256', name: 'experience', type: 'uint256' },
          { internalType: 'uint256', name: 'toNextLevel', type: 'uint256' },
          { internalType: 'uint256', name: 'usedSkillPoints', type: 'uint256' },
          { internalType: 'uint256', name: 'level', type: 'uint256' },
          { internalType: 'uint256', name: 'hauntId', type: 'uint256' },
          { internalType: 'uint256', name: 'baseRarityScore', type: 'uint256' },
          { internalType: 'uint256', name: 'modifiedRarityScore', type: 'uint256' },
          { internalType: 'bool', name: 'locked', type: 'bool' },
          { internalType: 'address', name: 'lending', type: 'address' }
        ],
        internalType: 'struct AavegotchiInfo[]',
        name: 'aavegotchiInfos_',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "getAavegotchi",
    "outputs": [
      {
        components: [
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "randomNumber",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "status",
            "type": "uint256"
          },
          {
            "internalType": "int16[6]",
            "name": "numericTraits",
            "type": "int16[6]"
          },
          {
            "internalType": "int16[6]",
            "name": "modifiedNumericTraits",
            "type": "int16[6]"
          },
          {
            "internalType": "uint16[16]",
            "name": "equippedWearables",
            "type": "uint16[16]"
          },
          {
            "internalType": "address",
            "name": "collateral",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "escrow",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "stakedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minimumStake",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "kinship",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastInteracted",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "experience",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "toNextLevel",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "usedSkillPoints",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "level",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "hauntId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseRarityScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "modifiedRarityScore",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "locked",
            "type": "bool"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "locked",
                "type": "address"
              },
              {
                "internalType": "uint96",
                "name": "timeAgreed",
                "type": "uint96"
              },
              {
                "internalType": "address",
                "name": "originalOwner",
                "type": "address"
              }
            ],
            "internalType": "struct AavegotchiInfo.Lending",
            "name": "lending",
            "type": "tuple"
          }
        ],
        internalType: 'struct AavegotchiInfo.Aavegotchi',
        name: 'aavegotchi_',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint32', name: '_erc721TokenId', type: 'uint32' }],
    name: 'isAavegotchiLent',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
];

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

export const AddressZero = ethers.ZeroAddress;
