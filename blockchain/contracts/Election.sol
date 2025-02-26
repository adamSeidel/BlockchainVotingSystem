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

    address[] public voterAddresses;

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
        if (electionEnded) {
            revert("The election has ended");
        }

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

        voterAddresses.push(voter);
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

    function getEligibleVoters() public view returns(address[] memory) {
        return voterAddresses;
    }

    function getVotersWhoHaveVoted() public view returns (address[] memory) {
        uint count = 0;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].voted) {
                count++;
            }
        }

        address[] memory votersWhoHaveVoted = new address[](count);

        uint index = 0;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].voted) {
                votersWhoHaveVoted[index] = voterAddresses[i];
                index++;
            }
        }
        
        return votersWhoHaveVoted;
    }

    function getVotersWhoHaveNotVoted() public view returns (address[] memory) {
        uint count = 0;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (!voters[voterAddresses[i]].voted) {
                count++;
            }
        }
        address[] memory votersWhoHaveNotVoted = new address[](count);
        uint index = 0;

        for (uint i = 0; i < voterAddresses.length; i++) {
            if (!voters[voterAddresses[i]].voted) {
                votersWhoHaveNotVoted[index] = voterAddresses[i];
                index++;
            }
        }

        return votersWhoHaveNotVoted;
    }

    function endElection() public {
        if (electionEnded) {
            revert("The election has already ended");
        }

        if (msg.sender != admin) {
            revert("Only the Election Admin can end the election");
        }

        electionEnded = true;
    }

    function getElectionWinner() public view returns (bytes32) {
        if (!electionEnded) {
            revert("The election has not ended yet");
        }

        uint maxVotes = 0;
        uint winningCandidateIndex = 0;

        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winningCandidateIndex = i;
            }
        }

        return candidates[winningCandidateIndex].name;
    }
}