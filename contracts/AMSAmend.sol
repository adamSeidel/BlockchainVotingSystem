/// SPDX-License-Identifier: GPL-3.0
// https://www.electoral-reform.org.uk/voting-systems/types-of-voting-system/additional-member-system/
pragma solidity ^0.8.0;

// *** Used for debugging ***
import "hardhat/console.sol";

/// @title Additional Member System election contract with the ability to ammend a vote
/// @author Adam G. Seidel
contract AMSAmend {
    // Voter structure
    struct Voter {
        // Flag to indicate of the voter has voted yet or not
        bool voted;
        // Name of candidate the voter is voting for
        bytes32 candidateVote;
        // Name of the party the voter is voting for
        bytes32 partyVote;
        // Constituency the voter belongs too
        bytes32 constituency;
    }

    // Party structure
    struct Party {
        // Name of the party
        bytes32 name;
        // Number of votes for the party
        uint votes;
        // Popular vote percentage
        uint popularVote;
        // Number of regional seats for the party
        uint regionalSeats;
        // Number of additional seats due to the party based on the popular vote
        uint additionalSeats;
        // Number of seats in total for the party
        uint numberOfSeats;
        // Number of seats the party would have if all seats were allocated
        // based on the popular vote share
        uint proportionalSeatNumber;
    }

    // Constituency Candidate structure
    struct Candidate {
        // Name of the Candidate
        bytes32 name;
        // Party that the Candidate belongs to
        bytes32 party;
        // Constituency that the Candidate is standing in
        bytes32 constituency;
        // Number of votes for the Candidate
        uint votes;
    }

    // Election Constituency structure
    struct Constituency {
        // Name of the Constituency
        bytes32 name;
        // Candidates standing in the Constituency
        Candidate[] candidates;
        // Mapping of candidate names to index
        mapping (bytes32 => uint) candidateIndexs;
        // Mapping of candidate names to existance
        mapping (bytes32 => bool) candidateExistance;
        // Elected candidate in the constituency
        uint electedCandidateIndex;
    }

    // Variables
    address private admin;
    uint private numberOfSeats;
    uint private numberOfConstituencies;
    uint private totalVotes;

    // Flags
    bool private electionStarted;
    bool private electionEnded;
    bool private resultsCalculated;

    // Arrays
    Voter[] private voters;
    address[] private voterAddresses;
    Constituency[] private constituencies;
    Party[] private electionParties;

    // Mappings
    mapping (bytes32 => uint) private constituencyIndexs;
    mapping (bytes32 => bool) private constituencyExists;
    mapping (address => uint) private voterIndexs;
    mapping (address => bool) private registeredVoters;
    mapping (bytes32 => uint) private partyIndexs;
    mapping (bytes32 => bool) private partyExists;

    // Events
    event ElectionStarted();
    event ElectionEnded();
    event ConstituencyAdded(bytes32 constituencyName);
    event CandidateAdded(bytes32 candidateName, bytes32 party, bytes32 constituencyName);
    event PartyAdded(bytes32 partyName);
    event VoterAdded(address voterAddress, bytes32 constituencyName);
    event VoteCast(address voterAddress, bytes32 candidateName, bytes32 partyName);
    event VoteAmended(address voterAddress, bytes32 candidateName, bytes32 partyName);
    event VotesTallied();
    event ConstituencyWinner(bytes32 constituencyName, bytes32 winningCandidateName, bytes32 winningCandidatePartyName);
    event PartyConstituencyResults(bytes32 party, uint constituencySeats);
    event AllConstituencyWinnersCalculated();
    event AdditionalSeatsAllocated(bytes32 partyName, uint numberOfSeats);
    event AllAdditionalSeatsAllocated();
    event ElectionResultsCalculated();
    event PartyResults(bytes32 party, uint electedSeats);
    event ElectionWinner(bytes32 electionWinner, uint electedSeats);

    // Modifiers
    modifier onlyAdmin()  {
        require(msg.sender == admin, 
            "Only the election admin can perform this action");
        _;
    }
    modifier electionHasStarted() {
        require(electionStarted,
            "The election has not started so it is not possible to perform this action");
        _;
    }
    modifier electionHasNotStarted() {
        require(!electionStarted, 
            "The election has already started so it is not possible to perform this action");
        _;
    }
    modifier electionHasEnded() {
        require(electionEnded,
            "The election has ended so it is not possible to perform this action");
        _;
    }
    modifier electionHasNotEnded() {
        require(!electionEnded,
            "The election has already ended so it is not possible to perform this action");
        _;
    }
    modifier voterMustExist(address voterAddress) {
        require(registeredVoters[voterAddress],
            "This voter is not registered to vote");
        _;
    }
    modifier voterMustNotExist(address voterAddress) {
        require(!registeredVoters[voterAddress], 
            "This voter is already registered to vote");
        _;
    }
    modifier voterHasNotVoted(address voterAddress) {
        Voter storage voter = voters[voterIndexs[msg.sender]];
        // Ensure the voter has not yet voted
        require(!voter.voted, "You have already voted");
        _;
    }
    modifier constituencyMustExist(bytes32 constituencyName) {
        require(constituencyExists[constituencyName], "Constituency does not exist");
        _;
    }
    modifier constituencyMustNotExist(bytes32 constituencyName) {
        require(!constituencyExists[constituencyName], 
            "Constituency already exists");
        _;
    }
    modifier candiateMustExist(bytes32 constituencyName, bytes32 candidateName) {
        uint constituencyIndex = constituencyIndexs[constituencyName];
        require(constituencies[constituencyIndex].candidateExistance[candidateName],
            "This candidate does not exist");
        _;
    }
    modifier partyMustExist(bytes32 partyName) {
        require(partyExists[partyName], 
            "This party does not exist");
        _;
    }
    modifier candiateMustNotExist(bytes32 constituencyName, bytes32 candidateName) {
        uint constituencyIndex = constituencyIndexs[constituencyName];
        require(!constituencies[constituencyIndex].candidateExistance[candidateName],
            "This candidate already exists");
        _;
    }
    modifier resultsHaveBeenCalculated() {
        require(resultsCalculated,
            "The election results have not been calculated so it is not possible to perform this action");
        _;
    }
    modifier resultsHaveNotBeenCalculated() {
        require(!resultsCalculated, 
            "The election results have already been calculated so it is not possible to perform this action");
        _;
    }

    // Contract Constructor
    constructor (uint _numberOfSeats) {
        // Initialise the election admin
        admin = msg.sender;
        // Initialise the election started flag
        electionStarted = false;
        // Initialise the election ended flag
        electionEnded = false;
        // Initilaise the results calculated flag
        resultsCalculated = false;
        // Initialise the total number of seats up for election
        numberOfSeats = _numberOfSeats;
        // Initialise the number of constituencies
        numberOfConstituencies = 0;
    }

    // Constituency Functions
    /// @notice Add a new election constituency
    function addConstituency(bytes32 constituencyName) 
        external
        onlyAdmin
        electionHasNotStarted
        constituencyMustNotExist(constituencyName)
        returns (bool)
    {
        // Ensure the constituency name is not empty
        require(constituencyName != bytes32(0), 
            "Constituency name cannot be empty");

        // Add the new constituency
        constituencies.push();
        Constituency storage newConstituency = constituencies[constituencies.length - 1];

        // Record the name of the new constituency
        newConstituency.name = constituencyName;
        // Record the index of the constituency in the constituency indexs mapping
        constituencyIndexs[constituencyName] = constituencies.length - 1;
        // Record that the constituency exists in the constituency existance mapping
        constituencyExists[constituencyName] = true;

        // Record that a new constitnecy has been added to the total
        // constitunecy count
        numberOfConstituencies += 1;

        // Record that a new constituency has been added
        emit ConstituencyAdded(constituencyName);
        return true;
    }

    /// @notice Add a new candidate to a constituency
    /// @param candidateName The name (bytes32) of the candidate to be added
    /// @param candidateParty The party (bytes32) that the new candidate represents
    /// @param candidateConstituency The name of the constituency (bytes32) that the new candidate is standing in
    function addConstituencyCandidate(bytes32 candidateName, bytes32 candidateParty, bytes32 candidateConstituency)
        external
        onlyAdmin
        electionHasNotStarted
        constituencyMustExist(candidateConstituency)
        candiateMustNotExist(candidateConstituency, candidateName)
        returns (bool)
    {
        // Index of the constituency for reference
        uint constituencyIndex = constituencyIndexs[candidateConstituency];

        // Add new canddiate to the constituency
        constituencies[constituencyIndex].candidates.push(Candidate({
            // Record the name of the new candidate
            name: candidateName,
            // Record the party that the new candidate represents
            party: candidateParty,
            // Record the constituency that the new candidate is standing in
            constituency: candidateConstituency,
            // Initialise the number of votes for the new candidate to 0
            votes: 0
        }));

        // Record the existance of a new candidate for this constituency
        constituencies[constituencyIndex].candidateExistance[candidateName] = true;

        // Index of the candidate in the constituencies candidates array
        uint candidateIndex = constituencies[constituencyIndex].candidates.length - 1;
        // Record the index of the new candidate in the constituencies candidates array
        constituencies[constituencyIndex].candidateIndexs[candidateName] = candidateIndex;

        // Record that a new candidate has been added
        emit CandidateAdded(candidateName, candidateParty, candidateConstituency);

        // Record a new party if the party is new to this election
        if (!partyExists[candidateParty]) {
            // Record new party in the party array
            electionParties.push(Party({
                // Record the name of the new party
                name: candidateParty,
                // Initialise the parties vote count to 0
                votes: 0,
                // Initialise the parties popular vote to 0;
                popularVote: 0,
                // Initialise the number of regional elected seats for the party to 0
                regionalSeats: 0,
                // Initialise the number of additional elected seats for the party to 0
                additionalSeats: 0,
                // Initialise the total number of elected seats for the party to 0
                numberOfSeats: 0,
                // Initialise the proportional seat number for the party to 0
                proportionalSeatNumber: 0
            }));

            // Record the party index in the party index mapping
            partyIndexs[candidateParty] = electionParties.length - 1;
            // Record party existacne in the party existance mapping
            partyExists[candidateParty] = true;

            // Record that a new party has been added
            emit PartyAdded(candidateParty);
        }

        return true;
    }

    // Voter Functions
    /// @notice Add a new voter to the election
    /// @param voterAddress The address of the new voter
    /// @param voterConstituency The constituency (bytes32) that the new voter is eligible to vote in
    function addVoter(address voterAddress, bytes32 voterConstituency)
        external
        onlyAdmin
        electionHasNotStarted
        voterMustNotExist(voterAddress)
        constituencyMustExist(voterConstituency)
        returns (bool)
    {
        // Add the new voter to the voters array
        voters.push(Voter({
            // Record that the voter has not yet voted
            voted: false,
            // Initialise the voters candidate vote as blank
            candidateVote: bytes32(0),
            // Initialise the voters party vote as blank
            partyVote: bytes32(0),
            // Record the voters constituency
            constituency: voterConstituency
        }));

        // Record the voters address
        voterAddresses.push(voterAddress);

        // Record the voters index
        voterIndexs[voterAddress] = voters.length - 1;

        // Record that this voter is registered
        registeredVoters[voterAddress] = true;

        // Record that a new voter has been added
        emit VoterAdded(voterAddress, voterConstituency);

        return true;
    }

    /// @notice Cast a vote with the ability to ammend a vote
    /// @param candidateName The name (bytes32) of the candidate that the voter intends to vote for
    /// @param partyName The name (bytes32) of the party that the voter intends to vote for
    function castVote(bytes32 candidateName, bytes32 partyName)
        external
        electionHasStarted
        electionHasNotEnded
        candiateMustExist(voters[voterIndexs[msg.sender]].constituency, candidateName)
        partyMustExist(partyName)
        voterMustExist(msg.sender)
        returns (bool)
    {
        // Retrieve the voters information
        Voter storage voter = voters[voterIndexs[msg.sender]];

        // Record the voters candidate vote against thier data structure
        voter.candidateVote = candidateName;

        // Record the voters party vote against thier data structure
        voter.partyVote = partyName;

        // Voter is voting for the first time
        if (!voter.voted) {
            // Record that the voter has cast thier first vote
            emit VoteCast(msg.sender, candidateName, partyName);
        // Voter is amending thier vote
        } else {
            // Record that the voter has ammended thier vote
            emit VoteAmended(msg.sender, candidateName, partyName);
        }

        // Record that the voter has now voted
        voter.voted = true;

        return true;
    }

    // Election management funcitons
    /// @notice Start the election
    function startElection()
        external
        onlyAdmin
        electionHasNotStarted
        returns (bool)
    {
        // *** Add check to ensure number of constituenices matches variable

        // Set the election started flag
        electionStarted = true;
        
        // Record that the election has started
        emit ElectionStarted();

        return true;
    }

    /// @notice Assign all the votes cast in the election to the correct party and candidates
    function tallyVotes()
        internal
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated
    {
        // Iterate through each voter in the election
        for (uint i = 0; i < voters.length; i++) {
            // Retrieve the current voters information
            Voter storage voter = voters[i];

            // Assign the voters votes if they have voted
            if (voter.voted) {
                // Retrieve the constituency information
                Constituency storage constituency = constituencies[constituencyIndexs[voter.constituency]];

                // Retrieve the index of the candidate the voter intends to vote for
                uint candidateIndex = constituency.candidateIndexs[voter.candidateVote];

                // Add the voters vote for their chosen candidate
                constituency.candidates[candidateIndex].votes += 1;

                // Retrieve the parties infromation
                Party storage party = electionParties[partyIndexs[voter.partyVote]];

                // Record the voters for for their chosen party
                party.votes += 1;

                // Record that a vote has been cast in the total number of votes
                totalVotes += 1;
            }
        }

        // Record that the votes have been tallied
        emit VotesTallied();
    }

    /// @notice Calculate the winning candidate for each constituency
    function calculateConstituencyWinners() 
        internal
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated
    {
        // Calculate the winning candidate for each constituency
        for (uint i = 0; i < constituencies.length; i++) {
            // Retrieve the current constituencies data
            Constituency storage constituency = constituencies[i];

            // Maximum number of votes for a candidate in this constituency
            uint maxVotes = 0;
            // The index of the candidate to have won in this constituency
            uint winningCandidateIndex = 0;

            // Find the candidate with the most votes in the current constituency
            for (uint j = 0; j < constituency.candidates.length; j++) {
                if (constituency.candidates[j].votes > maxVotes) {
                    // Record the number of votes of the top candidate so far
                    maxVotes = constituency.candidates[j].votes;
                    // Record the index of the candidate with the most votes so far
                    winningCandidateIndex = j;
                }
            }

            // Record the elected candidate for the current constituency
            constituency.electedCandidateIndex = winningCandidateIndex;

            // Record the elected candidate index for the current constituency
            constituency.electedCandidateIndex = winningCandidateIndex;

            // Record that the candidates party has been elected a constituency
            // seat
            Party storage winningParty = electionParties[partyIndexs[constituency.candidates[winningCandidateIndex].party]];
            winningParty.regionalSeats += 1;


            // Record the elected candidate for the current constituency
            emit ConstituencyWinner(constituency.name,
                constituency.candidates[winningCandidateIndex].name,
                constituency.candidates[winningCandidateIndex].party);
        }

        // Record the number of seats elected for each party by the
        // constituency vote
        for (uint i = 0; i < electionParties.length; i++) {
            // Retrieve the current party's information
            Party storage party = electionParties[i];

            emit PartyConstituencyResults(party.name, party.regionalSeats);
        }

        // Record that all constituency winners have been calculated
        emit AllConstituencyWinnersCalculated();
    }

    /// @notice Calculate the additonal seats that are allocated to parties based on thier popular vote share
    function calculateAdditionalSeats() 
        internal
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated 
    {
        // Calculate each parties popular vote share
        // Popular vote is x100 due to Solidity only supporting integer divison
        for (uint i = 0; i < electionParties.length; i++) {
            // Retrieve the currents parties infromation
            Party storage party = electionParties[i];

            // Calculate and assign the popular vote for the current party
            // Divison by zero guard
            if (totalVotes > 0) {
                // 8 s.f accuracy
                party.popularVote = (party.votes * 10000000) / totalVotes;
            }
        }

        // Calculate the number of regional seats that are to be allocated
        // based on a parties national popular vote share
        // Number of regional seats is the difference between the number of
        // available seats for election and the number of constituencies
        uint nationalSeats = numberOfSeats - numberOfConstituencies;

        // Popular vote share denominator for vote share calculation
        uint popularVoteShare = 0;

        // Calculate the number of additional seats for each party
        for (uint i = 0; i < electionParties.length; i++) {
            // Retrieve the current parties information
            Party storage party = electionParties[i];

            // Calculate the number of seats the party would have if all seats
            // were allocated based on the popular vote share
            // 8 s.f accruacy with nearest integer rounding
            party.proportionalSeatNumber = (party.popularVote * numberOfConstituencies + 5000000) / 10000000;

            // Party has been elected less seats from the constituency vote
            // than their popualar vote share warrants
            if (party.proportionalSeatNumber > party.regionalSeats) {
                // Record the parties popular vote share to the popular vote share
                // denominator
                popularVoteShare += party.popularVote;
            }
        }

        // Allocate additional seats between the parties with a lower number of 
        // seats than their popular vote share warrants
        for (uint i = 0; i < electionParties.length; i++) {
            // Retrieve the parties information
            Party storage party = electionParties[i];

            // Party has less seats from the constituency vote than warranted
            // by their popular vote share
            if (party.proportionalSeatNumber > party.regionalSeats) {
                // Calculate the number of additional seats due to the party
                // 8 s.f accruacy with nearest integer rounding
                party.additionalSeats = (nationalSeats * (party.popularVote * 10000000 / popularVoteShare) + 5000000) / 10000000;

                // Record that the party has been alloacted additional seats
                emit AdditionalSeatsAllocated(party.name, party.additionalSeats);
            }
        }

        // Record that the additional seats have been allocated
        emit AllAdditionalSeatsAllocated();
    }

    /// @notice Calculate the election results
    function calculateElectionResults() 
        public
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated
    {
        // Tally the election votes
        tallyVotes();

        // Calculate the winning candidate in each constituency
        calculateConstituencyWinners();

        // Calculate the number of additional seats for each party
        calculateAdditionalSeats();

        // Calculate the total number of elected seats for each party
        for (uint i = 0; i < electionParties.length; i++) {
            // Retrieve the current parties information
            Party storage party = electionParties[i];

            // Record the total number of elected seats for this party
            party.numberOfSeats = party.regionalSeats + party.additionalSeats;
        }

        // Record that the election results have been calculated
        resultsCalculated = true;

        // Record that the election results have been calculated
        emit ElectionResultsCalculated();

        // Index of the party wiht the most elected setas
        uint winningPartyIndex = 0;
        // Number of elected seats for the winning party
        uint maxElectedSeats = 0;

        // Record the number of elected seats for each party in the election
        for (uint i = 0; i < electionParties.length; i++) {
            // Retrieve the current parties information
            Party storage party = electionParties[i];

            // Record the number of seats elected for the current party
            emit PartyResults(party.name, party.numberOfSeats);

            // New winning party seen
            if (party.numberOfSeats > maxElectedSeats) {
                // Record the index of the new party with the most elected
                // seats
                winningPartyIndex = i;
                // Record the new most elected seats seen
                maxElectedSeats = party.numberOfSeats;
            }
        }

        // At least one party in the election
        if (electionParties.length > 0) {
            // Retrieve the winning parties information
            Party storage winningParty = electionParties[winningPartyIndex];

            // Record the overall winning party of the election
            emit ElectionWinner(winningParty.name, winningParty.numberOfSeats);
        }
    }

    /// @notice End the election
    function endElection()
        external
        onlyAdmin
        electionHasStarted
        electionHasNotEnded
        returns (bool)
    {
        // End the election
        electionEnded = true;

        // Record that the election has ended
        emit ElectionEnded();

        // Calculate the results of the election
        calculateElectionResults();

        return true;
    }

}