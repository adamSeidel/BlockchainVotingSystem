require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  networks: {
    hardhat: {
      blockGasLimit: 1000000000000,
    },
  },
  gasReporter: {
    enabled: true,
    offline: true,
    currency: "GBP",
    gasPrice: .35166,
    tokenPrice: "1204.46",
    token: "ETH",
    L1Etherscan: process.env.ETHERSCAN_API_KEY,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  }
};