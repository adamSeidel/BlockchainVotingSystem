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

    struct Constituency {
        bytes32 name;
        Candidate[] candidates;
    }

    address public admin;

    mapping (address => Voter) public voters;
    mapping (bytes32 => uint) public constituencyNameToIndex;

    address[] public voterAddresses;

    Constituency[] public constituencies;

    bool public electionEnded;

    constructor (bytes32[] memory constituencyNames, bytes32[] memory candidateNames) {
        electionEnded = false;

        admin = msg.sender;

        for (uint i = 0; i < constituencyNames.length; i++) {
            Constituency storage constituency = constituencies.push();
            constituency.name = constituencyNames[i];

            for (uint j = 0; j < candidateNames.length; j++) {
                Candidate memory candidate = Candidate({
                    name: candidateNames[j],
                    voteCount: 0
                });

                constituency.candidates.push(candidate);
            }

            constituencyNameToIndex[constituencyNames[i]] = i;
        }
    }

    function getCandidatesByConstituency(bytes32 constituencyName) public view returns (Candidate[] memory) {
        uint constituencyIndex = constituencyNameToIndex[constituencyName];
        return constituencies[constituencyIndex].candidates;
    }

    function getConstituencyNames() public view returns (bytes32[] memory) {
        bytes32[] memory names = new bytes32[](constituencies.length);
        for (uint i = 0; i < constituencies.length; i++) {
            names[i] = constituencies[i].name;
        }
        return names;
    }

    function getElectionCandidates() public view returns (Candidate[] memory) {
        return constituencies[0].candidates;
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

        // candidates[candidate].voteCount += 1;
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

        // for (uint i = 0; i < candidates.length; i++) {
        //     if (candidates[i].voteCount > maxVotes) {
        //         maxVotes = candidates[i].voteCount;
        //         winningCandidateIndex = i;
        //     }
        // }

        // return candidates[winningCandidateIndex].name;
        return "";
    }
}