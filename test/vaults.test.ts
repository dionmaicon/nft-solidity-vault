
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { toBN } from "web3-utils";
import { mintNFT, deployContract } from "../scripts/mint-nft";
import chai from "./setupChai";

const { expect } = chai;

const ACCOUNTS_INDEX = {
    DEPLOYER: 0,
    FIRST_ACCOUNT: 1,
    SECOND_ACCOUNT: 2,
}

const deployNFTVault = async (name: string) => {

    const [owner,] = await ethers.getSigners();

    const NFTVault = await ethers.getContractFactory("NFTVault", owner);
    const vault = await NFTVault.deploy(name);

    return { vault };
}

const getMintNFTFixture = async () => {
    const nfts: any[] = [];
    let gameItem: Contract | any = null;

    gameItem = await deployContract(ACCOUNTS_INDEX.DEPLOYER);

    nfts.push(await mintNFT(ACCOUNTS_INDEX.DEPLOYER, ACCOUNTS_INDEX.FIRST_ACCOUNT, "https://gateway.pinata.cloud/ipfs/QmZAh_FIRST_ACCOUNT", gameItem));
    nfts.push(await mintNFT(ACCOUNTS_INDEX.DEPLOYER, ACCOUNTS_INDEX.FIRST_ACCOUNT, "https://gateway.pinata.cloud/ipfs/QmZAh_FIRST_ACCOUNT", gameItem));
    nfts.push(await mintNFT(ACCOUNTS_INDEX.DEPLOYER, ACCOUNTS_INDEX.SECOND_ACCOUNT, "https://gateway.pinata.cloud/ipfs/QmZAh_SECOND_ACCOUNT", gameItem));
    nfts.push(await mintNFT(ACCOUNTS_INDEX.DEPLOYER, ACCOUNTS_INDEX.SECOND_ACCOUNT, "https://gateway.pinata.cloud/ipfs/QmZAh_SECOND_ACCOUNT", gameItem));


    return { gameItem, nfts: nfts }
}

const runtTests = () => {
    describe("NFTVault", async function () {
        let contractVault: Contract, contractGameItem: Contract, contractOwner: any, firstAccount: any, secondAccount: any = null;
        let accounts: (any)[] = [];

        beforeEach(async () => {

            const { gameItem, nfts: _nfts } = await getMintNFTFixture();
            contractGameItem = gameItem;

            accounts = await ethers.getSigners();
            [contractOwner, firstAccount, secondAccount] = accounts.map(({ address }) => address);

            const { vault } = await deployNFTVault("NFT Super Vaults");
            contractVault = vault;
        })

        describe("Deployment", async function () {

            it("Should set the right name", async function () {
                expect(await contractVault.name()).to.equal("NFT Super Vaults");
            });

        });

        describe("Create Vaults", async function () {

            it("Check Permission", async () => {
                // Try deposit without USER role access
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 123)).to.be.revertedWith(
                    "Not authorized"
                );

                // GRANT access as USER role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", firstAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address);

            })

            it("Deposit and Withdraw with USER", async function () {

                // GRANT access as USER role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", firstAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address);

                // Try Approve
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 1);
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 2);

                // Deposit NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 1))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 1);

                // Deposit same NFT twice
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 1)).to.be.revertedWith(
                    "NFT is already in the vaults"
                );

                let nftsFirstAccount = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(nftsFirstAccount.length).equal(1);

                // Deposit Second NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 2))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 2);

                // Value should be 2
                nftsFirstAccount = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(nftsFirstAccount.length).equal(2);

                let ownerAddress = await contractGameItem.ownerOf(1);

                // Vault should be the owner
                expect(ownerAddress).equal(contractVault.address);

                // Withdrew with wrong account access
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).withdraw(contractGameItem.address, 1)).to.be.revertedWith(
                    "Not authorized"
                );

                // GRANT access as USER role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", secondAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT].address);

                // Withdrew with wrong account No authorized
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).withdraw(contractGameItem.address, 1)).to.be.revertedWith(
                    "You are not the owner"
                );

                // Should withdraw with success for firstAccount
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).withdraw(contractGameItem.address, 1))
                    .to.emit(contractVault, "WithdrewNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 1);

                // FirsAccount should be the owner
                ownerAddress = await contractGameItem.ownerOf(1);
                expect(ownerAddress).equal(firstAccount);

                // Vault for token 1 should be empty
                const index1 = await contractVault.getCompoundIndex(contractGameItem.address, 1);
                const vault1 = await contractVault.vaults(index1);
                expect(vault1.tokenId).equal(toBN(0));

                // Vault for token 2 is ok
                const index2 = await contractVault.getCompoundIndex(contractGameItem.address, 2);
                const vault2 = await contractVault.vaults(index2);

                expect(vault2.owner).equal(firstAccount);


                const vaults = await contractVault.getVaultsByOwner(firstAccount);
                expect(vaults.length).equal(1);
            });

            it("Deposit and Withdraw with ADMIN", async function () {

                // GRANT access as USER role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", firstAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address);

                // Try Approve
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 1);
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 2);

                // Deposit NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 1))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 1);


                // Deposit Second NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 2))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 2);

                // Value should be 2
                const nftsFirstAccount = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(nftsFirstAccount.length).equal(2);

                // Vault should be the owner
                let ownerAddress = await contractGameItem.ownerOf(1);
                expect(ownerAddress).equal(contractVault.address);

                // Withdrew with wrong account access
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).withdrawByAdmin(contractGameItem.address, 1)).to.be.revertedWith(
                    "Not authorized"
                );

                // GRANT access as ADMIN role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("ADMIN", secondAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("ADMIN", accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT].address);

                // Should withdraw with success for secondAccount ADMIN
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).withdrawByAdmin(contractGameItem.address, 1))
                    .to.emit(contractVault, "WithdrewNftByAdmin")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 1);

                // FirsAccount should be the owner
                ownerAddress = await contractGameItem.ownerOf(1);
                expect(ownerAddress).equal(firstAccount);

                // Vault for token 1 should be empty
                const index1 = await contractVault.getCompoundIndex(contractGameItem.address, 1);
                const vault1 = await contractVault.vaults(index1);
                expect(vault1.tokenId).equal(toBN(0));

                // Vault for token 2 is ok
                const index2 = await contractVault.getCompoundIndex(contractGameItem.address, 2);
                const vault2 = await contractVault.vaults(index2);

                expect(vault2.owner).equal(firstAccount);

                const vaults = await contractVault.getVaultsByOwner(firstAccount);
                expect(vaults.length).equal(1);
            });

            it("Deposit and Withdraw BATCH with USER", async function () {

                // GRANT access as USER role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", firstAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address);

                // Try Approve
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 1);
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 2);

                // Deposit NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 1))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 1);


                // Deposit Second NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 2))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 2);

                // Value should be 2
                const nftsFirstAccount = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(nftsFirstAccount.length).equal(2);

                let ownerAddress = await contractGameItem.ownerOf(1);

                // Vault should be the owner
                expect(ownerAddress).equal(contractVault.address);

                // Withdrew with wrong account access
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).withdrawAll()).to.be.revertedWith(
                    "Not authorized"
                );

                // GRANT access as USER role
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", secondAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT].address);

                // Withdrew with wrong account shouldnt remove vaults
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).withdrawAll()).to.be.fulfilled;
                const vaultAtempt1 = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(vaultAtempt1.length).equal(2);


                // Withdrew with right account should remove vaults succesfully
                await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).withdrawAll();
                const vault1 = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(vault1.length).equal(0);

                // Should be removed all the owners
                const owners = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getOwners();
                expect(owners.length).equal(0);
            });

            it("Deposit and Withdraw BATCH with ADMIN", async function () {

                // GRANT access as ADMIN role for firstAccount
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("ADMIN", firstAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("ADMIN", firstAccount);

                // GRANT access as USER role for secondAccount
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.DEPLOYER]).grantAccess("USER", secondAccount))
                    .to.emit(contractVault, "GrantAccess")
                    .withArgs("USER", secondAccount);

                // Approve NFT transfers for 2 accounts
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 1);
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).approve(contractVault.address, 2);
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).approve(contractVault.address, 3);
                await contractGameItem.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).approve(contractVault.address, 4);

                // Deposit first NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 1))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 1);


                // Deposit Second NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).deposit(contractGameItem.address, 2))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT].address, contractGameItem.address, 2);

                // Deposit Third NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).deposit(contractGameItem.address, 3))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT].address, contractGameItem.address, 3);


                // Deposit Fourth NFT
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).deposit(contractGameItem.address, 4))
                    .to.emit(contractVault, "DepositedNft")
                    .withArgs(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT].address, contractGameItem.address, 4);


                // Value should be 2 for first account 
                const nftsFirstAccount = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(nftsFirstAccount.length).equal(2);

                // Value should be 2 for first account 
                const nftsSecondAccount = await contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).getVaultsByOwner(secondAccount);
                expect(nftsSecondAccount.length).equal(2);

                // Vault should be the onwer of all
                expect(await contractGameItem.ownerOf(1)).equal(contractVault.address);
                expect(await contractGameItem.ownerOf(2)).equal(contractVault.address);
                expect(await contractGameItem.ownerOf(3)).equal(contractVault.address);
                expect(await contractGameItem.ownerOf(4)).equal(contractVault.address);


                // The total of owners should be 2
                let owners = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getOwners();
                expect(owners.length).equal(2);

                // Withdrew with wrong account access
                await expect(contractVault.connect(accounts[ACCOUNTS_INDEX.SECOND_ACCOUNT]).withdrawAllByAdmin()).to.be.revertedWith(
                    "Not authorized"
                );

                // WithdrewAll with right account ADMIN should remove vaults succesfully
                await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).withdrawAllByAdmin();

                const vault1 = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(vault1.length).equal(0);
                const vault2 = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getVaultsByOwner(firstAccount);
                expect(vault2.length).equal(0);


                // // Should be removed all the owners
                owners = await contractVault.connect(accounts[ACCOUNTS_INDEX.FIRST_ACCOUNT]).getOwners();
                expect(owners.length).equal(0);
            });
        });
    });

}

const run = () => {

    runtTests()

}

run();