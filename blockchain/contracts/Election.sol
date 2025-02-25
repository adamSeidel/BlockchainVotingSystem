pragma solidity ^0.8.0;

contract Election {
    struct Voter {
        bool voted;
        uint weight;
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

    function getElectionCandidates() public view returns (Candidate[] memory) {
        return candidates;
    }

    function giveRightToVote(address voter) public {
        if (msg.sender != admin) {
            revert("Only the Election Admin can give the right to vote");
        }

        if (voters[voter].voted) {
            revert("The voter has already voted");
        }

        if (voters[voter].weight == 1) {
            revert("This voter already has the right to vote");
        }

        voters[voter].weight = 1;
    }

    function vote(uint candidate) public {
        Voter storage sender = voters[msg.sender];

        if (electionEnded) {
            revert("The election has ended");
        }

        if (sender.weight == 0) {
            revert("You do not have the right to vote");
        }

        if (sender.voted) {
            revert("You have already voted");
        }

        sender.voted = true;

        candidates[candidate].voteCount += 1;
    }
}