// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.3;

import "./interfaces/INftVault.sol";
import "./AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract NFTVault is
    INftVault,
    ReentrancyGuard,
    AccessControl,
    IERC721Receiver
{
    string public name;

    struct Vault {
        address owner;
        address nftAddress;
        uint tokenId;
    }

    mapping(bytes32 => Vault) public vaults;
    mapping(address => bytes32[]) vaultsByOwner;
    address[] public owners;

    constructor(string memory _name) {
        name = _name;
    }

    function deposit(address _nftAddress, uint _tokenId)
        external
        override
        onlyUsers
    {
        // Get compound index
        bytes32 index = getCompoundIndex(_nftAddress, _tokenId);

        // require not deposited yet
        require(
            vaults[index].owner == address(0),
            "NFT is already in the vaults"
        );

        // insert compoundIndex in owner mapping
        Vault storage vault = vaults[index];
        vault.nftAddress = _nftAddress;
        vault.tokenId = _tokenId;
        vault.owner = msg.sender;

        bytes32[] memory userVaults = getVaultsByOwner(msg.sender);
        if (userVaults.length == 0) {
            owners.push(msg.sender);
        }

        vaultsByOwner[msg.sender].push(index);

        // transfer
        ERC721(_nftAddress).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId
        );

        emit DepositedNft(msg.sender, _nftAddress, _tokenId);
    }

    function withdraw(address _nftAddress, uint _tokenId)
        public
        override
        nonReentrant
        onlyUsers
    {
        // Get with compoundIndex in mapping vault
        bytes32 index = getCompoundIndex(_nftAddress, _tokenId);

        // require deposited
        require(vaults[index].owner == msg.sender, "You are not the owner");

        Vault memory vault = vaults[index];

        // iterate vaultByOwner to remove from array
        emit WithdrewNft(msg.sender, _nftAddress, _tokenId);

        // ERC721(_nftAddress).approve(msg.sender, vault.tokenId);
        ERC721(_nftAddress).safeTransferFrom(
            address(this),
            msg.sender,
            vault.tokenId
        );

        // remove from vault by owner
        _removeUserVault(index, vault.owner);

        // remove from vaults
        delete vaults[index];
    }

    function withdrawByAdmin(address _nftAddress, uint _tokenId)
        public
        override
        onlyRole(AccessControl.ADMIN)
    {
        // Get with compoundIndex in mapping vault
        bytes32 index = getCompoundIndex(_nftAddress, _tokenId);

        // require exist
        require(vaults[index].owner != address(0), "Invalid Address");

        Vault memory vault = vaults[index];

        emit WithdrewNftByAdmin(vault.owner, _nftAddress, _tokenId);

        // ERC721(_nftAddress).approve(msg.sender, vault.tokenId);
        ERC721(_nftAddress).safeTransferFrom(
            address(this),
            vault.owner,
            vault.tokenId
        );

        // remove from vault by owner
        _removeUserVault(index, vault.owner);

        // remove from vaults
        delete vaults[index];
    }

    // @notice Withdraw all NFTs that are stored in this contract to all the holders.
    // After calling this function, the vault should be empty.
    // Simples Wrap to Withdraw Function
    function withdrawAll() external override onlyUsers {
        bytes32[] memory _ownerVaults = getVaultsByOwner(msg.sender);
        for (uint i = 0; i < _ownerVaults.length; i++) {
            Vault memory vault = vaults[_ownerVaults[i]];
            withdraw(vault.nftAddress, vault.tokenId);
        }
    }

    // @notice Withdraw all By admin - NFTs that are stored in this contract to all the holders.
    // After calling this function, the vault should be empty.
    // Simples Wrap to WithdrawByAdmin Function
    function withdrawAllByAdmin()
        external
        override
        onlyRole(AccessControl.ADMIN)
    {
        address[] memory _owners = owners;
        for (uint i = 0; i < _owners.length; i++) {
            bytes32[] memory _ownerVaults = getVaultsByOwner(_owners[i]);
            for (uint j = 0; j < _ownerVaults.length; j++) {
                Vault memory vault = vaults[_ownerVaults[j]];
                withdrawByAdmin(vault.nftAddress, vault.tokenId);
            }
        }
    }

    // @notice Create a compound index
    // @param _nftAddress The address of the NFT contract
    // @param _tokenId The nft id being deposited
    // @return bytes32 encodedPacked string
    function getCompoundIndex(address _nftAddress, uint _tokenId)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_nftAddress, _tokenId));
    }

    // @notice Get vaults by Owner
    // @param _owner The nft owner
    // @return bytes32[] memory
    function getVaultsByOwner(address _owner)
        public
        view
        returns (bytes32[] memory)
    {
        return vaultsByOwner[_owner];
    }

    // @notice Get Owners depositors
    // @return address[] memory
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    // @notice To permit NFTVault hold NFTs
    // @override IERC721Received
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // @notice Remove Owner vault
    // @param _index The compoundIndex
    // @param _owner The nft onwer
    function _removeUserVault(bytes32 _index, address _owner) private {
        bytes32[] storage _vaultsByOwner = vaultsByOwner[_owner];
        for (uint i = 0; i < _vaultsByOwner.length; i++) {
            if (_vaultsByOwner[i] == _index) {
                _vaultsByOwner[i] = _vaultsByOwner[_vaultsByOwner.length - 1];
                _vaultsByOwner.pop();
            }
        }

        if (_vaultsByOwner.length == 0) {
            _removeOwner(_owner);
        }
    }

    // @notice Remove user form owners list
    // @param _owner The nft onwer
    function _removeOwner(address _owner) private {
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
            }
        }
    }
}
