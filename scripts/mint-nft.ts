import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { GameItem } from "../typechain-types";

require('dotenv').config();

const mnemonic: string = process.env.MNEMONIC?.toString() || "";

export const getAbi = () => {
    try {
        const dir = path.resolve(
            "./artifacts/contracts/GameItem.sol/GameItem.json"
        )
        const file = fs.readFileSync(dir, "utf8")
        const json = JSON.parse(file)
        const abi = json.abi
        return abi
    } catch (e) {
        console.log(`e`, e)
    }
}

export const getWalletForIndex = (index: any) => {
    return ethers.Wallet.fromMnemonic(
        mnemonic,
        `m/44'/60'/0'/0/${index}`
    );
};

export const deployContract = async (deployerIndex: number) : Promise<GameItem> => {
    let accounts = await ethers.getSigners();
    const addresses = accounts.map(({ address }) => address);
    const deployer = ethers.provider.getSigner(addresses[deployerIndex]);

    try {
        const GameItemContract = await ethers.getContractFactory("GameItem", deployer);
        const contract = await GameItemContract.deploy();
        return Promise.resolve(contract);
    } catch (error) {
        return Promise.reject(error);
    }    

}

export const mintNFT = async (deployerIndex: number, recipientIndex: number, tokenURI: string, gameItemContract: GameItem) => {
    let accounts = await ethers.getSigners();
    const addresses = accounts.map(({ address }) => address);

    const deployer = ethers.provider.getSigner(addresses[deployerIndex]);
    const recipientAddress = addresses[recipientIndex];

    const result = await gameItemContract.connect(deployer).mintNFT(recipientAddress, tokenURI);
    await result.wait();

    const counter = await gameItemContract._counter();

    const owner = await gameItemContract.ownerOf(counter.toNumber());
    // console.log('Counter:', counter.toNumber(), ", Owner:", owner);
    return { index: counter.toNumber(), owner }
};

// How to use
// Use deploy contract to mint NFT, TokenURI could be a IPFS with metas
    
// const deployerIndex = 0;
// const firstAccount = 1;
// const secondAccount = 2;
 
// deployContract(deployerIndex).then(async contract => {
//     await mintNFT(deployerIndex, firstAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2PS", contract);
//     await mintNFT(deployerIndex, secondAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2P2", contract);
//     await mintNFT(deployerIndex, firstAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2PS", contract);
//     await mintNFT(deployerIndex, secondAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2P2", contract);
//     await mintNFT(deployerIndex, firstAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2PS", contract);
//     await mintNFT(deployerIndex, secondAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2P2", contract);
//     await mintNFT(deployerIndex, firstAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2PS", contract);
//     await mintNFT(deployerIndex, secondAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2P2", contract);
//     await mintNFT(deployerIndex, firstAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2PS", contract);
//     await mintNFT(deployerIndex, secondAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2P2", contract);
//     await mintNFT(deployerIndex, firstAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2PS", contract);
//     await mintNFT(deployerIndex, secondAccount, "https://gateway.pinata.cloud/ipfs/QmZAh1JY5z4aBsRA1HbGqPAXh8uEGpsoeemGkfxcPgx2P2", contract);
// });