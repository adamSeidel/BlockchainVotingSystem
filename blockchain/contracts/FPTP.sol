pragma solidity ^0.8.0;

contract FPTP {
    struct Voter {
        bool voted;
        uint weight;
        bytes32 constituency;
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

    constructor () {
        electionEnded = false;

        admin = msg.sender;
    }

    function addConstituency(bytes32 constituencyName, bytes32[] memory candidateNames) public {
        uint index = constituencies.length;
        constituencies.push();
        Constituency storage constituency = constituencies[index];
        constituency.name = constituencyName;

        for (uint i = 0; i < candidateNames.length; i++) {
            Candidate memory candidate = Candidate({
                name: candidateNames[i],
                voteCount: 0
            });

            constituency.candidates.push(candidate);
        }

        constituencyNameToIndex[constituencyName] = index;
    }

    function getCandidateNamesByConstituency(bytes32 constituencyName) public view returns (bytes32[] memory) {
        uint constituencyIndex = constituencyNameToIndex[constituencyName];

        bytes32[] memory candidateNames = new bytes32[](constituencies[constituencyIndex].candidates.length);
        for (uint i = 0; i < constituencies[constituencyIndex].candidates.length; i++) {
            candidateNames[i] = constituencies[constituencyIndex].candidates[i].name;
        }

        return candidateNames;
    }

    function getConstituencyNames() public view returns (bytes32[] memory) {
        bytes32[] memory names = new bytes32[](constituencies.length);
        for (uint i = 0; i < constituencies.length; i++) {
            names[i] = constituencies[i].name;
        }
        return names;
    }

    function giveRightToVote(address voter, bytes32 voterConstituency) public {
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
        voters[voter].constituency = voterConstituency;

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

        uint constituencyIndex = constituencyNameToIndex[sender.constituency];

        constituencies[constituencyIndex].candidates[candidate].voteCount += 1;
    }

    function getCandidatesByConstituency(bytes32 constituencyName) public view returns (Candidate[] memory) {
        uint constituencyIndex = constituencyNameToIndex[constituencyName];

        return constituencies[constituencyIndex].candidates;
    }

    function getEligibleVoters() public view returns(address[] memory) {
        return voterAddresses;
    }

    function getVoterConstituency(address voter) public view returns(bytes32) {
        return voters[voter].constituency;
    }

    function getEligibleVotersConstituencies() public view returns(bytes32[] memory) {
        bytes32[] memory voterConstituencies = new bytes32[](voterAddresses.length);
        
        for (uint i = 0; i < voterAddresses.length; i++) {
            voterConstituencies[i] = voters[voterAddresses[i]].constituency;
        }
        return voterConstituencies;
    }

    function getEligibleVotersAndConstituency() public view returns(address[] memory, bytes32[] memory) {
        bytes32[] memory voterConstituencies = new bytes32[](voterAddresses.length);
        
        for (uint i = 0; i < voterAddresses.length; i++) {
            voterConstituencies[i] = voters[voterAddresses[i]].constituency;
        }
        return (voterAddresses, voterConstituencies);
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

    function getConstituencyWinner(bytes32 constituencyName) public view returns (bytes32) {
        if (!electionEnded) {
            revert("The election has not ended yet");
        }

        uint constituencyIndex = constituencyNameToIndex[constituencyName];

        uint maxVotes = 0;
        uint winningCandidateIndex = 0;

        for (uint i = 0; i < constituencies[constituencyIndex].candidates.length; i++) {
            if (constituencies[constituencyIndex].candidates[i].voteCount > maxVotes) {
                maxVotes = constituencies[constituencyIndex].candidates[i].voteCount;
                winningCandidateIndex = i;
            }
        }

        return constituencies[constituencyIndex].candidates[winningCandidateIndex].name;
    }

    function getElectionWinner() public view returns (bytes32) {
        if (!electionEnded) {
            revert("The election has not ended yet");
        }

        uint maxVotes = 0;
        uint winningCandidateIndex = 0;

        Candidate[] memory candidates = new Candidate[](constituencies[0].candidates.length);
        for (uint i = 0; i < candidates.length; i++) {
            candidates[i].name = constituencies[0].candidates[i].name;
            candidates[i].voteCount = 0;
        }

        for (uint i = 0; i < constituencies.length; i++) {

            for (uint j = 0; j < constituencies[i].candidates.length; j++) {
                if (constituencies[i].candidates[j].voteCount > maxVotes) {
                    maxVotes = constituencies[i].candidates[j].voteCount;
                    winningCandidateIndex = j;
                }
            }

            candidates[winningCandidateIndex].voteCount += 1;
        }

        maxVotes = 0;
        winningCandidateIndex = 0;

        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winningCandidateIndex = i;
            }
        }

        return candidates[winningCandidateIndex].name;
    }
}