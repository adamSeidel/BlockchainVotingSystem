pragma solidity ^0.8.0;

contract Election {
    struct Voter {
        bool voted;
        uint vote;
    }

    struct Candidate {
        bytes32 name;
        uint voteCount;
    }

    address public admin;

    mapping (address => Voter) public voters;

    Candidate[] public candidates;

    bool public electionEnded;

    constructor (bytes32[] memory candidateNames) {
        electionEnded = false;

        admin = msg.sender;

        for (uint i = 0; i < candidateNames.length; i++) {
            Candidate memory candidate = Candidate({
                name: candidateNames[i],
                voteCount: 0
            });

            candidates.push(candidate);
        }
    }

}