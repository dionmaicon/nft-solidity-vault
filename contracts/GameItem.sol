// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract GameItem is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;
    uint public _counter;

    constructor() ERC721("GAMI", "GameItem") {}

    function mintNFT(address _recipient, string memory _tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        tokenIds.increment();

        uint256 newItemId = tokenIds.current();
        _mint(_recipient, newItemId);
        _setTokenURI(newItemId, _tokenURI);
        _counter = newItemId;
        setApprovalForAll(address(this), true);

        return newItemId;
    }
}
