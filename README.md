# Solidity - NFT Vault 

I used the last [Hardhat Toolbox](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox) release with many of the commons plugins such as:

- ethers.js
- hardhat-ethers
- mocha and mocha-as-promised
- solidity-coverage
- typechain for TypeScript
- hardhat-etherscan
- hardhat-gas-reporter

## RUN this Project

Create and .env file based in .env.example.
Remember to run:

```shell
# install dependencies
npm install
```

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
npx hardhat coverage
GAS_REPORT=true npx hardhat test
npx hardhat node
# npx hardhat run scripts/deploy.ts
```

## Solution 
First of all, I created a NFT Token (GameItem) with mandatories contracts/interfaces to handle the ERC-721 Token using @openzeppelin. After, I created a script to deploy the GameItem.sol and mint NFT's. So, I could run this script each time I want make a test for example.

I tested almost all the flow and the coverage print is appended bellow

i needed to implement an AccessControl.sol to handle with ADMIN and USER requirements. I thought that it would be better than use an Ownable contract. So, We can GRANT and REVOKE access to NFTVault.sol.

## NFTVault.sol

![NFTVault](https://user-images.githubusercontent.com/19849921/187093858-44e3d856-a81f-40cf-b26d-6f98a332d038.png)

## AccessControl.sol

![AccessControl](https://user-images.githubusercontent.com/19849921/187094195-c351fa88-f24b-4ef7-a34e-b19f17c8f434.png)

## Coverage 
![coverage](https://user-images.githubusercontent.com/19849921/187092880-b2e8327e-762d-4c7b-8d45-101b8e228124.png)
