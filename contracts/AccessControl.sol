// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.3;

contract AccessControl {

    event GrantAccess(string role, address account);
    event RevokeAccess(string role, address account);
    
    string public constant ADMIN = "ADMIN";
    string public constant USER = "USER";

    mapping( string => mapping ( address => bool)) public roles;

    constructor () {
        _grantAccess(ADMIN, msg.sender);
    }

    function _grantAccess(string memory _role, address _account) internal {
        roles[_role][_account] = true;
        emit GrantAccess(_role, _account);
    }

    function grantAccess(string memory _role, address _account) external onlyRole(ADMIN) {
        _grantAccess(_role, _account);
    }

    function revokeAccess(string memory _role, address _account) external onlyRole(ADMIN) {
        roles[_role][_account] = false;
        emit RevokeAccess(_role, _account);
    }

     modifier onlyRole(string memory _role) {
        require(roles[_role][msg.sender], "Not authorized");
        _;
    }

    modifier onlyUsers() {
        string[2] memory _roles;
        _roles = [ADMIN, USER];
        
        bool hasAccess = false;
        for (uint i = 0; i < _roles.length; i++) {
            if (roles[_roles[i]][msg.sender]) {
                hasAccess = true;
                break;
            }
        }
        require(hasAccess, "Not authorized");
        _;
    }
}