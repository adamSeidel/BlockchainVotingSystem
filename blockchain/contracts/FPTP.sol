/// SPDX-License-Idenfifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title First Past the Post election contract
/// @author Adam G. Seidel
contract FPTP {
    // Voter structure
    struct Voter {
        // Flag to indicate if the voter has voted yet or not
        bool voted;
        // Constituency the voter belongs too
        bytes32 constituency;
    }

    // Party structure
    struct Party {
        // Name of the party
        bytes32 name;
        // Number of seats for that party
        uint electedSeats;
    }

    // Constituency Candidate structure
    struct Candidate {
        // Name of Candidate
        bytes32 name;
        // Party that the Candidate belongs to
        bytes32 party;
        // Constituency the Candidate is standing in
        bytes32 constituency;
        // Number of votes for the Candidate
        uint votes;
    }

    // Election Constituency structure
    struct Constituency {
        // Name of Constituency
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
    address public admin;

    // Flags
    bool electionStarted;
    bool electionEnded;
    bool resultsCalculated;

    // Arrays
    Voter[] public voters;
    address[] public voterAddresses;
    Constituency[] public constituencies;
    Party[] public electionParties;

    // Mappings
    mapping (bytes32 => uint) public constituencyIndexs;
    mapping (bytes32 => bool) public constituencyExists;
    mapping (address => uint) public voterIndexs;
    mapping (address => bool) public registeredVoters;
    mapping (bytes32 => uint) public partyIndexs;
    mapping (bytes32 => bool) public partyExists;

    // Events
    event ElectionStarted();
    event ElectionEnded();
    event ConstituencyAdded(bytes32 constituencyName);
    event CandidateAdded(bytes32 candidateName, bytes32 party, bytes32 constituencyName);
    event VoterAdded(address voterAddress, bytes32 constituencyName);
    event VoteCast(address voterAddress);
    event ConstituencyWinner(bytes32 constituencyName, bytes32 winningCandidateName, bytes32 winningCandidatePartyName);
    event AllConstituencyWinnersCalculated();
    event ElectionResultsCalculated();
    event PartyResults(bytes32 party, uint electedSeats);
    event ElectionWinner(bytes32 electionWinner, uint electedSeats);

    // Modifiers
    // Admin only access modifier
    modifier onlyAdmin()  {
        require(msg.sender == admin, 
        "Only the election admin can perform this action");
        _;
    }

    // Election started modifier
    modifier electionHasStarted() {
        require(electionStarted,
        "The election has not started so it is not possible to perform this action");
        _;
    }

    // Election not started modifier
    modifier electionHasNotStarted() {
        require(!electionStarted, 
        "The election has already started so it is not possible to perform this action");
        _;
    }

    // Election has ended modifer
    modifier electionHasEnded() {
        require(electionEnded, "The election has ended yet so it is not possible to perform this action");
        _;
    }

    // Election has not ended modifer
    modifier electionHasNotEnded() {
        require(!electionEnded,
        "The election has already ended so it is not possible to perform this action");
        _;
    }

    // Results have not been calculated modifier
    modifier resultsHaveNotBeenCalculated() {
        require(!resultsCalculated, "The election results have already been calculated so it is not possible to perform this action");
        _;
    }

    modifier resultsHaveBeenCalculated() {
        require(resultsCalculated, "The election results have not been calculated so it is not possible to perform this action");
        _;
    }

    // Constituency must not exist modifier
    modifier constituencyMustNotExist(bytes32 constituencyName) {
        require(!constituencyExists[constituencyName], "Constituency already exists");
        _;
    }

    // Constituency must exist modifier
    modifier constituencyMustExist(bytes32 constituencyName) {
        require(constituencyExists[constituencyName], "Constituency does not exist");
        _;
    }

    // Voter must not exist modifier
    modifier voterMustNotExist(address voterAddress) {
        require(!registeredVoters[voterAddress], 
            "This voter is already registered to vote");
        _;
    }

    // Voter must exist modifier
    modifier voterMustExist(address voterAddress) {
        require(registeredVoters[voterAddress], "This voter is not registered to vote");
        _;
    }

    // Candidate must exist modifier
    modifier candiateMustExist(bytes32 constituencyName, bytes32 candidateName) {
        uint constituencyIndex = constituencyIndexs[constituencyName];

        require(constituencies[constituencyIndex].candidateExistance[candidateName],
            "This candidate does not exist");
        _;
    }

    // Candidate must not exist modifier
    modifier candiateMustNotExist(bytes32 constituencyName, bytes32 candidateName) {
        uint constituencyIndex = constituencyIndexs[constituencyName];

        require(!constituencies[constituencyIndex].candidateExistance[candidateName],
            "This candidate already exists");
        _;
    }

    // Party must exist modifer
    modifier partyMustExist(bytes32 partyName) {
        require(partyExists[partyName], "This party does not exist");
        _;
    }

    // Contract Constructor
    constructor () {
        // Initialise the election admin
        admin = msg.sender;
        // Initialise the election started flag
        electionStarted = false;
        // Initialise the elected ended flag
        electionEnded = false;
        // Initialise the results calculated flag
        resultsCalculated = false;
    }

    // Constituency Functions
    /// @notice Add a new election constituency
    /// @param constituencyName The name of the new constituency to be added
    function addConstituency(bytes32 constituencyName)
        external
        onlyAdmin
        electionHasNotStarted
        constituencyMustNotExist(constituencyName)
        returns (bool)
    {
        // Add the new constituency
        constituencies.push();
        Constituency storage newConstituency = constituencies[constituencies.length - 1];
        // Record the name of the new constituency
        newConstituency.name = constituencyName;

        // Record the index of the constiteuncy in the constitecy indexs mapping
        constituencyIndexs[constituencyName] = constituencies.length - 1;

        // Record that the constituency exists in the constituency existance mapping
        constituencyExists[constituencyName] = true;

        // Record that a new constituency has been added
        emit ConstituencyAdded(constituencyName);
        return true;
    }

    /// @notice Add a new candidate to a constituency
    /// @param candidateName The name (bytes32) of the candidate to be added
    /// @param candidateParty The party (bytes32) that the candidate to be added represents
    /// @param candidateConstituency The name of the constituency (bytes32) that the candidate to be added is standing in
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

        // Add new candidate to constituency
        constituencies[constituencyIndex].candidates.push(Candidate({
            // Record the name of the new candidate
            name: candidateName,
            // Record the party that the new candidte represents
            party: candidateParty,
            // Record the constituency that the new candidate is standing in
            constituency: candidateConstituency,
            // Initialise the number of votes for the new candidate
            votes: 0
        }));

        // Record the existance of a new candidate for this constituency
        constituencies[constituencyIndex].candidateExistance[candidateName] = true;

        // Record the index of the new candidate in the constituencies candidates array
        uint candidateIndex = constituencies[constituencyIndex].candidates.length - 1;
        constituencies[constituencyIndex].candidateIndexs[candidateName] = candidateIndex;

        // Record a new party if the party is new to this election
        if (!partyExists[candidateParty]) {
            // Record new party in party array
            electionParties.push(Party({
                name: candidateParty,
                electedSeats: 0
            }));
            // Record the party index in the party array
            partyIndexs[candidateParty] = electionParties.length - 1;
            // Record party existance in the mapping
            partyExists[candidateParty] = true;
        }

        // Record that a new candidate has been added
        emit CandidateAdded(candidateName, candidateParty, candidateConstituency);
        return true;
    }

    // Potentially not needed if event emits work
    /// @notice Retrieve the names of all the constituencies in the election
    /// @return constituencyNames The names (bytes32) of all the constituencies in the election
    function getConstituencies()
        external
        view
        returns (bytes32[] memory)
    {
        // Initialse an array to hold the constituency names
        bytes32[] memory constituencyNames = new bytes32[](constituencies.length);

        // Add constituency name to the array for each constituency
        for (uint i = 0; i < constituencies.length; i++) {
            constituencyNames[i] = constituencies[i].name;
        }

        return constituencyNames;
    }

    /// Potentiall not needed if event emits work
    /// @notice Retrieve the names of all the parties in the election
    /// @return partyNames The names (bytes32) of all the parties in the election
    function getPartyNames()
        external
        view
        returns (bytes32[] memory)
    {
        // Initialise an array to hold the party names
        bytes32[] memory partyNames = new bytes32[](electionParties.length);

        // Add party
        for (uint i = 0; i < electionParties.length; i++) {
            partyNames[i] = electionParties[i].name;
        }

        return partyNames;
    }

    /// Testing function
    /// @notice Retrieve a partys information
    /// @return name The name (bytes32) of the party
    /// @return electedSeats The number (uint) of elected seats for that party
    function getParty(bytes32 partyName)
        external
        view
        onlyAdmin
        partyMustExist(partyName)
        returns (bytes32 name, uint electedSeats)
    {
        // Retrieve the index of the party
        uint partyIndex = partyIndexs[partyName];

        // Retrieve the party data
        Party storage party = electionParties[partyIndex];

        // Return the party data
        return (party.name, party.electedSeats);
    }

    /// Test function
    /// @notice Retrieve the index of a party from the party index mapping
    /// @param partyName The name (bytes32) of the party to retrieve the index of
    /// @return partyIndex The index (uint) of the party in the party array
    function getPartyIndex(bytes32 partyName)
        external
        view
        partyMustExist(partyName)
        returns (uint)
    {
        return partyIndexs[partyName];
    }

    /// Test function
    /// @notice Retrieve the existence of a party in the election
    /// @param partyName The name (bytes32) of the party to check the existence of
    /// @return partyExists Bool indicating whether the party exists
    function getPartyExistance(bytes32 partyName)
        external
        view
        returns (bool)
    {
        return partyExists[partyName];
    }

    // Potentially not needed if event emits work
    /// @notice Retrieve all the candidates standing in a constituency
    /// @param constituencyName The name (bytes32) of the constituency to return the candidates of
    /// @return candidates Array (bytes32) of all candidates in the constituency
    function getConstituencyCandidates(bytes32 constituencyName)
        external
        view
        constituencyMustExist(constituencyName)
        returns (bytes32[] memory)
    {
        // The index of the constituency in the constituency array
        uint constituencyIndex = constituencyIndexs[constituencyName];
        // Retrieve the constituency data
        Constituency storage constituency = constituencies[constituencyIndex];

        // Initialise new array to hold the names (bytes32) of all the candidates
        bytes32[] memory candidates = new bytes32[](constituency.candidates.length);

        // Add the names of each candidate to the candidates array
        for (uint i = 0; i < constituency.candidates.length; i++) {
            candidates[i] = constituency.candidates[i].name;
        }

        return candidates;
    }

    /// Testing function only
    /// @notice Returns the candidate data of a constituency
    /// @param constituencyName The name (bytes32) of the constituency to retrieve the candidate from
    /// @param candidateName The name (bytes32) of the candidate to retrieve the data of
    function getCandidate(bytes32 constituencyName, bytes32 candidateName)
        external
        view
        onlyAdmin
        constituencyMustExist(constituencyName)
        candiateMustExist(constituencyName, candidateName)
        returns (bytes32 name, bytes32 party, bytes32 constituency, uint votes)
    {
        // Retrieve the index of the constituency
        uint constituencyIndex = constituencyIndexs[constituencyName];

        // Retrieve the index of the candidate within the constituency
        uint candidateIndex = constituencies[constituencyIndex].candidateIndexs[candidateName];

        // Retrieve the candidate data
        Candidate storage candidate = constituencies[constituencyIndex].candidates[candidateIndex];

        // Return the candidate data
        return (candidate.name, candidate.party, candidate.constituency, candidate.votes);
    }

    // Test function only
    /// @notice Returns the index of a constituency
    /// @param constituencyName The name (bytes32) of the constituency to get the index of
    /// @return constituencyIndex The index (uint) of the constituency in the constituency array
    function getConstituencyIndex(bytes32 constituencyName)
        external
        view
        constituencyMustExist(constituencyName)
        returns (uint)
    {
        return constituencyIndexs[constituencyName];
    }

    // Test function only
    /// @notice Returns the index of a constituency candidate
    /// @param constituencyName The name (bytes32) of the constituency the candidate belong to
    /// @param candidateName The name (bytes32) of the candidate to get the index of
    function getCandidateIndex(bytes32 constituencyName, bytes32 candidateName)
        external
        view
        constituencyMustExist(constituencyName)
        candiateMustExist(constituencyName, candidateName)
        returns (uint)
    {
        uint constituencyIndex = constituencyIndexs[constituencyName];

        return constituencies[constituencyIndex].candidateIndexs[candidateName];
    }

    /// Test function only
    /// @notice Returns the existance of a constituency
    /// @param constituencyName The name (bytes32) of the constituency to check the existance of
    /// @return constutuencyExistance Bool of the existance of the constituency
    function getConstituencyExistance(bytes32 constituencyName)
        external
        view
        returns (bool)
    {
        return constituencyExists[constituencyName];
    }

    // Voter Functions
    /// @notice Add a new voter to the election
    /// @param voterAddress The address of the voter to be added
    /// @param voterConstituency The constituency that the voter is eligible to vote in
    function addVoter(address voterAddress, bytes32 voterConstituency) 
        external
        onlyAdmin
        electionHasNotStarted
        voterMustNotExist(voterAddress)
        constituencyMustExist(voterConstituency)
        returns (bool)
    {
        // Add the new voter
        voters.push(Voter({
            // Record that the voter has not yet voted
            voted: false,
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

    // Potentially not needed if event emits work
    /// @notice Retrieve a voters information
    /// @param voterAddress The address of the voter to be retrieved
    /// @return voted If the voter has voted yet or not
    /// @return constituency The constituency of the voter
    function getVoter(address voterAddress) 
        external 
        view
        onlyAdmin 
        voterMustExist(voterAddress) 
        returns (bool voted, bytes32 constituency)
    {
        Voter storage voter = voters[voterIndexs[voterAddress]];
        return (voter.voted, voter.constituency);
    }

    // Test function
    /// @notice Retrieve the index of the voter in the voter index mapping
    /// @param voterAddress The address of the voter to retrieve the index of
    /// @return voterIndex The index of the voter in the voter index mapping
    function getVoterIndex(address voterAddress)
        external
        view
        onlyAdmin
        voterMustExist(voterAddress)
        returns (uint)
    {
        return voterIndexs[voterAddress];
    }

    function getVoterExistance(address voterAddress)
        external
        view
        onlyAdmin
        returns (bool)
    {
        return registeredVoters[voterAddress];
    }

    /// @notice Cast a vote
    /// @param candidateName The name of the candidate that the voter intends to vote for
    function castVote(bytes32 candidateName)
        external
        electionHasStarted
        electionHasNotEnded
        candiateMustExist(voters[voterIndexs[msg.sender]].constituency, candidateName)
        voterMustExist(msg.sender)
        returns (bool)
    {
        // Retrieve the voters information
        Voter storage voter = voters[voterIndexs[msg.sender]];

        // Ensure the voter has not yet voted
        require(!voter.voted, "You have already voted");

        // Retrieve the constituency information
        Constituency storage constituency = constituencies[constituencyIndexs[voter.constituency]];

        // Retrieve the index of the candidate the voter intends to vote for
        uint candidateIndex = constituency.candidateIndexs[candidateName];

        // Add the voters vote
        constituency.candidates[candidateIndex].votes += 1;

        // Record that the voter has now voted
        voter.voted = true;

        // Record that the vote has been cast
        emit VoteCast(msg.sender);
        
        return true;
    }

    // Potentially not needed if event emits work
    /// @notice Retrieve the address of all voters in the election
    /// @dev This is inefficient for large number of voters
    function getAllVoters()
        external
        view
        onlyAdmin
        returns (address[] memory)
    {
        return voterAddresses;
    }

    // Election management Functions
    /// @notice Start the election
    /// @dev Start the election by making the election started flag true
    function startElection() 
        external 
        onlyAdmin 
        electionHasNotStarted
        returns (bool)
    {
        electionStarted = true;

        emit ElectionStarted();
        return true;
    }

    /// @notice Get wether the election has started yet or not
    /// @return electionStarted Bool of wether the election has started or not
    function getElectionStartedStatus()
        external
        view
        returns (bool)
    {
        return electionStarted;
    }

    /// @notice Calculate the winning candidate for each constituency
    function calculateConstituencyWinners()
        internal
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated
    {
        // Add error handling for when no candidates or constituencies exist?

        for (uint i = 0; i < constituencies.length; i++) {
            // Retrieve the current constituencies data
            Constituency storage constituency = constituencies[i];

            // Maximumum number of votes for a candidate in this constituency
            uint maxVotes = 0;
            // The index of the candidate to have won in this constituency
            uint winningCandidateIndex = 0;

            // Find the candidate with the most votes
            for (uint j = 0; j < constituency.candidates.length; j++) {
                if (constituency.candidates[j].votes > maxVotes) {
                    // Record the number of votes of the top candidate so far
                    maxVotes = constituency.candidates[j].votes;
                    // Record the index of the candidate with the most votes so far
                    winningCandidateIndex = j;
                }
            }

            // Record the elected candidate for that constituency
            constituency.electedCandidateIndex = winningCandidateIndex;

            // Record the winner of this constituency
            // Record the elected candidate index for the constituency
            constituency.electedCandidateIndex = winningCandidateIndex;

            emit ConstituencyWinner(constituency.name, constituency.candidates[winningCandidateIndex].name, constituency.candidates[winningCandidateIndex].party);
        }

        // Record that all constituency winners have been calculated
        emit AllConstituencyWinnersCalculated();
    }

    /// @notice Calculate the election results
    function calculateElectionResults() 
        public
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated
    {
        // Calculate the winning candidate in each constituency
        calculateConstituencyWinners();

        // Calculate the number of elected seats for each party
        for (uint i = 0; i < constituencies.length; i++) {
            // Retrieve the current constituency data
            Constituency storage constituency = constituencies[i];

            // Index of the winning candidates party
            uint partyIndex = partyIndexs[constituency.candidates[constituency.electedCandidateIndex].party];

            // Record that the party has been elected another seat
            electionParties[partyIndex].electedSeats += 1;
        }

        // Change the results calculated flag
        resultsCalculated = true;

        // Record that the election results have been calculated
        emit ElectionResultsCalculated();

        // Index of the party with the most elected seats
        uint winningPartyIndex = 0;
        // Number of elected seats for the winning party
        uint maxElectedSeats = 0;

        // Record the number of elected seats for each party in the election
        for (uint i = 0; i < electionParties.length; i++) {
            Party storage party = electionParties[i];

            emit PartyResults(party.name, party.electedSeats);

            if (party.electedSeats > maxElectedSeats) {
                winningPartyIndex = i;
                maxElectedSeats = party.electedSeats;
            }
        }

        if (electionParties.length > 0) {
            Party storage winningParty = electionParties[winningPartyIndex];

            emit ElectionWinner(winningParty.name, winningParty.electedSeats);
        }
    }

    /// @notice End the election
    /// @dev End the election by making the election ended flag true
    function endElection()
        external
        onlyAdmin
        electionHasStarted
        electionHasNotEnded
        returns (bool)
    {
        // End the election
        electionEnded = true;

        emit ElectionEnded();

        // Calculate the results of the election
        calculateElectionResults();

        return true;
    }

    // Test function
    /// @notice Get wether the election has ended yet or not
    /// @return Bool of wether the election has ended yet or not
    function getElectionEndedStatus()
        external
        view
        returns (bool)
    {
        return electionEnded;
    }

    // Potentially not needed if event emits work
    /// @notice Get the elected candidate of a constituency
    /// @return name The name (bytes32) of the elected candidate
    /// @return party The party (bytes32) of the elected candidate
    function getConstituencyWinner(bytes32 constiteuncyName)
        external
        view
        electionHasEnded
        constituencyMustExist(constiteuncyName)
        resultsHaveBeenCalculated
        returns (bytes32, bytes32)
    {
        // Index of the consituency in the constituency array
        uint constituencyIndex = constituencyIndexs[constiteuncyName];

        // The current constituency data
        Constituency storage constituency = constituencies[constituencyIndex];

        Candidate storage electedCandidate = constituency.candidates[constituency.electedCandidateIndex];
        return (electedCandidate.name, electedCandidate.party);
    }

    // // Can be reworked if events emit work
    // /// @notice Get the winner of the election
    // /// @return winningParty The name (bytes32) of the party with the most elected seats
    // function getElectionWinner()
    //     external
    //     electionHasEnded
    //     resultsHaveBeenCalculated
    //     returns (bytes32)
    // {
    //     // Number of elected seats for the winning party
    //     uint maxSeats = 0;
    //     // Name of the party with the most elected seats
    //     bytes32 winningParty = bytes32(0);

    //     // Find the party with the most elected seats
    //     for (uint i = 0; i < electionParties.length; i++) {
    //         // Retrieve the current party informaiton
    //         Party storage party = electionParties[i];

    //         // Party has more elected seats than previous seen parties
    //         if (party.electedSeats > maxSeats) {
    //             // Record the number of elected seats
    //             maxSeats = party.electedSeats;

    //             // Record the name (bytes32) of the winning party
    //             winningParty = party.name;
    //         }
    //     }

    //     // Record the winning party of the election
    //     emit ElectionWinner(winningParty);

    //     return winningParty;
    // }
}