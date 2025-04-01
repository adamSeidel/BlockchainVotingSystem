// https://www.electoral-reform.org.uk/voting-systems/types-of-voting-system/additional-member-system/
pragma solidity ^0.8.0;

contract AMS {
    struct Voter {
        bool voted;
        bytes32 constituency;
    }

    struct Candidate {
        bytes32 name;
        uint voteCount;
    }

    struct Constituency {
        bytes32 name;
        Candidate[] candidates;
        uint winningCandidateIndex;
    }

    struct Party {
        bytes32 name;
        uint voteCount;
        uint popularVote;
        uint regionalSeats;
        uint additionalSeats;
        uint numberOfSeats;
    }

    address public admin;

    mapping (address => Voter) public voters;
    mapping (bytes32 => uint) public constituencyNameToIndex;
    mapping (bytes32 => uint) public partyNameToIndex;
    
    address[] public voterAddresses;

    Constituency[] public constituencies;

    Party[] public parties;

    bool public electionEnded;

    uint public numberOfSeats;
    uint public numberOfConstituencies;
    uint public totalVotes;

    constructor (uint _numberOfSeats, uint _numberOfConstituencies) {
        electionEnded = false;
        admin = msg.sender;

        numberOfSeats = _numberOfSeats;
        numberOfConstituencies = _numberOfConstituencies;
    }

    // Tested
    function getNumberOfSeats() public view returns (uint) {
        return numberOfSeats;
    }

    // Tested
    function getNumberOfConstituencies() public view returns (uint) {
        return numberOfConstituencies;
    }

    // Tested
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

    // Tested
    function addParty(bytes32 partyName) public {
        uint index = parties.length;
        parties.push();

        Party storage party = parties[index];
        party.name = partyName;
        party.voteCount = 0;

        partyNameToIndex[partyName] = index;
    }

    // Tested
    function getConstituencyNames() public view returns (bytes32[] memory) {
        bytes32[] memory names = new bytes32[](constituencies.length);
        for (uint i = 0; i < constituencies.length; i++) {
            names[i] = constituencies[i].name;
        }
        return names;
    }

    // Tested
    function getPartyNames() public view returns (bytes32[] memory) {
        bytes32[] memory names = new bytes32[](parties.length);
        for (uint i = 0; i < parties.length; i++) {
            names[i] = parties[i].name;
        }
        return names;
    }

    // Tested
    function getCandidateNamesByConstituency(bytes32 constituencyName) public view returns (bytes32[] memory) {
        uint constituencyIndex = constituencyNameToIndex[constituencyName];

        bytes32[] memory candidateNames = new bytes32[](constituencies[constituencyIndex].candidates.length);
        for (uint i = 0; i < constituencies[constituencyIndex].candidates.length; i++) {
            candidateNames[i] = constituencies[constituencyIndex].candidates[i].name;
        }

        return candidateNames;
    }

    // Tested
    function giveRightToVote(address voter, bytes32 voterConstituency) public {
        if (electionEnded) {
            revert("Election has ended");
        }

        if (msg.sender != admin) {
            revert("Only admin can give right to vote");
        }

        if (voters[voter].voted) {
            revert("Voter has already voted");
        }

        if (voters[voter].constituency != bytes32(0)) {
            revert("Voter already has the right to vote");
        }

        voters[voter].constituency = voterConstituency;
        voters[voter].voted = false;

        voterAddresses.push(voter);
    }

    // Tested
    function vote(uint candidate, uint party) public {
        Voter storage sender = voters[msg.sender];

        if (electionEnded) {
            revert("The election has ended");
        }

        if (sender.constituency == bytes32(0)) {
            revert("Voter already has the right to vote");
        }

        if (sender.voted) {
            revert("You have already voted");
        }

        sender.voted = true;

        uint constituencyIndex = constituencyNameToIndex[sender.constituency];
        uint partyIndex = partyNameToIndex[parties[party].name];

        constituencies[constituencyIndex].candidates[candidate].voteCount += 1;
        parties[partyIndex].voteCount += 1;

        totalVotes++;
    }

    // Tested
    function getVoterConstituency(address voter) public view returns (bytes32) {
        return voters[voter].constituency;
    }

    // Tested
    function getCandidatesByConstituency(bytes32 constituencyName) public view returns (Candidate[] memory) {
        uint constituencyIndex = constituencyNameToIndex[constituencyName];

        return constituencies[constituencyIndex].candidates;
    }

    // Tested
    function getPartys() public view returns (Party[] memory) {
        return parties;
    }

    // Tested
    function getEligibleVoters() public view returns(address[] memory) {
        return voterAddresses;
    }

    // Tested
    function getEligibleVotersConstituencies() public view returns(bytes32[] memory) {
        bytes32[] memory voterConstituencies = new bytes32[](voterAddresses.length);
        
        for (uint i = 0; i < voterAddresses.length; i++) {
            voterConstituencies[i] = voters[voterAddresses[i]].constituency;
        }
        return voterConstituencies;
    }

    // Tested
    function getEligibleVotersAndConstituency() public view returns(address[] memory, bytes32[] memory) {
        bytes32[] memory voterConstituencies = new bytes32[](voterAddresses.length);
        
        for (uint i = 0; i < voterAddresses.length; i++) {
            voterConstituencies[i] = voters[voterAddresses[i]].constituency;
        }
        return (voterAddresses, voterConstituencies);
    }

    // Tested
    function endElection() public {
        if (electionEnded) {
            revert("The election has already ended");
        }

        if (msg.sender != admin) {
            revert("Only the Election Admin can end the election");
        }

        electionEnded = true;
    }

    function calculateConstituencyWinners() public {
        if (!electionEnded) {
            revert("The election has not ended yet");
        }

        // Constituency Seats
        // Calculate winning candidate for each constituency
        for (uint i = 0; i < constituencies.length; i++) {
            uint maxVotes = 0;
            uint winningCandidateIndex = 0;

            for (uint j = 0; j < constituencies[i].candidates.length; j++) {
                if (constituencies[i].candidates[j].voteCount > maxVotes) {
                    maxVotes = constituencies[i].candidates[j].voteCount;
                    winningCandidateIndex = j;
                }
            }

            // Record the winning candidate for a given constituency
            constituencies[i].winningCandidateIndex = winningCandidateIndex;

            // Record the constituency win against the candidates party
            parties[winningCandidateIndex].regionalSeats += 1;
        }
    }

    function calculatePopularVote() public {
        if (!electionEnded) {
            revert("The election has not ended yet");
        }

        // Popular vote is x100 due to integer division in Solidity
        for (uint i = 0; i < parties.length; i++) {
            parties[i].popularVote = (parties[i].voteCount * 100) / totalVotes;
        }
    }

    function calculateAdditionalSeats() public {
        uint regionalSeats = numberOfSeats - numberOfConstituencies;
        uint popularVoteShare = 0;

        // Calculate the number of additional seats per party
        for (uint i = 0; i < parties.length; i++) {
            uint proportionalSeatNumber = parties[i].popularVote * numberOfConstituencies / 100;

            if (proportionalSeatNumber > parties[i].regionalSeats) {
                popularVoteShare += parties[i].popularVote;
            }
        }

        for (uint i = 0; i < parties.length; i++) {
            uint proportionalSeatNumber = parties[i].popularVote * numberOfConstituencies / 100;

            if (proportionalSeatNumber > parties[i].regionalSeats) {
                parties[i].additionalSeats = regionalSeats * (parties[i].popularVote * 100 / popularVoteShare) / 100;
            }
            else {
                parties[i].additionalSeats = 0;
            }
        }
    }

    function calculateFinalResults() public {
        for (uint i = 0; i < parties.length; i++) {
            parties[i].numberOfSeats = parties[i].regionalSeats + parties[i].additionalSeats;
        }
    }

}