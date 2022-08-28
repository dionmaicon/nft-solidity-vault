import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require('solidity-coverage');
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/hardhat-runner/docs/advanced/create-task
task('accounts', 'Prints the list of accounts').setAction(
  async (_args, hre) => {
    const { ethers } = hre;

    const accounts = await ethers.getSigners()
    const provider = ethers.provider;

    for (const account of accounts) {
      const value = await provider.getBalance(account.address);
      console.log(account.address, ethers.utils.formatEther(value.toString()))
    }
  }
);

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10,
        passphrase: "",
      },
    },
  },
};

export default config;
