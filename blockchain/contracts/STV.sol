/// SPDX-License-Identifier: GPL-3.0
// https://www.electoral-reform.org.uk/latest-news-and-research/publications/how-to-conduct-an-election-by-the-single-transferable-vote-3rd-edition/
pragma solidity ^0.8.0;

/// @title Single Transferable Vote election contract
/// @author Adam G. Seidel
contract STV {
    // Voter structure
    struct Voter {
        // Flag to indicate if the voter has voted yet or not
        bool voted;
        // Constituency the voter belongs too
        bytes32 constituency;
        // Voters ranking of their constituencies candidates
        uint[] candidateRanking;
        // Index pointing to the candidate in there ranking currently recieving
        // their vote
        uint voteIndex;
    }

    // Party structure
    struct Party {
        // Name of the party
        bytes32 name;
        // Number of elected seats for that party
        uint electedSeats;
    }

    // Constituency Candidate structure
    struct Candidate {
        // Name of candidate
        bytes32 name;
        // Party that the Candidate belongs to
        bytes32 party;
        // Constituenucy the Candidate is standing in
        bytes32 constituency;
        // Number of votes for the Candidate
        uint votes;
        // Elected status
        bool elected;
        // Eliminated status
        bool eliminated;
    }

    // Election Constituency structure
    struct Constituency {
        // Name of Constituency
        bytes32 name;
        // Number of available seats
        uint numberOfSeats;
        // Number of votes cast
        uint numberOfVotes;
        // Candidates standing in the constituenucy
        Candidate[] candidates;
        // Mapping of candidate names to index
        mapping (bytes32 => uint) candidateIndexs;
        // Mapping of candidate names to existance
        mapping (bytes32 => bool) candidateExistance;
        // Elected candidates in the constituency
        uint[] electedCandidatesIndexes;
    }

    // Variables
    address private admin;

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
    event ConstituencyAdded(bytes32 constituencyName, uint numberOfSeats);
    event CandidateAdded(bytes32 candidateName, bytes32 party, bytes32 cosntituencyName);
    event PartyAdded(bytes32 partyName);
    event VoterAdded(address voterAddress, bytes32 constituencyName);
    event VoteCast(address voterAddress);
    event ConstituencyCandidateElected(bytes32 constituencyName, bytes32 winningCandidateName, bytes32 winningCandidatePartyName);
    event AllConstituencyWinnersCalculated();
    event ElectionResultsCalculated();
    event PartyResults(bytes32 party, uint electedSeats);
    event ElectionWinner(bytes32 electionWinner, uint electedSeats);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin,
        "Only the electon admin can perform this action");
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
    modifier constituencyMustExist(bytes32 constituencyName) {
        require(constituencyExists[constituencyName],
        "Constituency does not exist");
        _;
    }
    modifier constituencyMustNotExist(bytes32 constituencyName) {
        require(!constituencyExists[constituencyName],
        "Constituency already exists");
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
    modifier validateCandidateRankings(uint[] memory ranking, bytes32 constituencyName) {
        require(ranking.length > 0, "Candidate ranking cannot be empty");
        require(ranking.length <= constituencies[constituencyIndexs[constituencyName]].candidates.length, 
        "Ranking cannot exceed the number of candidates in the constituency");
        _;
    }
    modifier candidateMustNotExist(bytes32 constituencyName, bytes32 candidateName) {
        uint constituencyIndex = constituencyIndexs[constituencyName];
        require(!constituencies[constituencyIndex].candidateExistance[candidateName],
            "This candidate already exists");
        _;
    }
    modifier partyMustExist(bytes32 partyName) {
        require(partyExists[partyName],
            "This party does not exist");
        _;
    }
    modifier bytes32Validation(bytes32 argument) {
        require(argument != bytes32(0),
            "Argument cannot be empty");
        _;
    }

    // Contract constructor
    constructor () {
        // Initialise the election admin
        admin = msg.sender;
        // Initialise the election started flag
        electionStarted = false;
        // Initialise the election ended flag
        electionEnded = false;
        // Initialise the results calculated flag
        resultsCalculated = false;
    }

    // Constituency Functions
    /// @notice Add a new election constituency
    /// @param constituencyName The name of the new constituency to be added
    /// @param numberOfSeats The number of seats to be elected in the constituency
    function addConstituency(bytes32 constituencyName, uint numberOfSeats)
        external
        onlyAdmin
        electionHasNotStarted
        constituencyMustNotExist(constituencyName)
        bytes32Validation(constituencyName)
        returns (bool)
    {
        // Add the new constituency
        constituencies.push();
        Constituency storage newConstituency = constituencies[constituencies.length - 1];
        newConstituency.name = constituencyName;
        newConstituency.numberOfSeats = numberOfSeats;
        newConstituency.numberOfVotes = 0;

        // Record the index of the constituency in the constituency indexs mapping
        constituencyIndexs[constituencyName] = constituencies.length - 1;
        // Record that the constituency exists in the constituency existance mapping
        constituencyExists[constituencyName] = true;

        // Record that a new constituency has been added
        emit ConstituencyAdded(constituencyName, numberOfSeats);

        return true;
    }
    
    /// @notice Add a new candidate to a constituency
    /// @param candidateName The name (bytes32) of the candidate to be added
    /// @param candidateParty The party (bytes32) that the new canddiate represents
    /// @param candidateConstituency The name of the constituency (bytes32) that the new candidate is standing in
    function addConstituencyCandidate(bytes32 candidateName, bytes32 candidateParty, bytes32 candidateConstituency)
        external
        onlyAdmin
        electionHasNotStarted
        constituencyMustExist(candidateConstituency)
        candidateMustNotExist(candidateConstituency, candidateName)
        bytes32Validation(candidateName)
        bytes32Validation(candidateParty)
        bytes32Validation(candidateConstituency)
        returns (bool)
    {
        // Index of the constituency for reference
        uint constituencyIndex = constituencyIndexs[candidateConstituency];

        // Add new candidate to the constituency
        constituencies[constituencyIndex].candidates.push(Candidate({
            // Record the name of the new candidate
            name: candidateName,
            // Record the party that the new candidate respresents
            party: candidateParty,
            // Record the constituency that the new candidate is standing in
            constituency: candidateConstituency,
            // Initialise the number of votes for the new candidate to 0
            votes: 0,
            // Initialise elected status to no elected
            elected: false,
            // Initialise eliminated status to not eliminated
            eliminated: false
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
                // Initialise the number of elected seats for the new party to 0
                electedSeats: 0
            }));

            // Record the party index in the party index mapping
            partyIndexs[candidateParty] = electionParties.length - 1;
            // Record party existance in the party existance mapping
            partyExists[candidateParty] = true;

            // Record that a new party has been added
            emit PartyAdded(candidateParty);
        }

        return true;
    }

    /// Voter Functions
    /// @notice Add a new voter to the election
    /// @param voterAddress The address of the new voter
    /// @param voterConstituency The constituency that the new voter is eligible to vote in
    function addVoter(address voterAddress, bytes32 voterConstituency) 
        external
        onlyAdmin
        electionHasNotStarted
        voterMustNotExist(voterAddress)
        constituencyMustExist(voterConstituency)
        bytes32Validation(voterConstituency)
        returns (bool)
    {
        // Add the new voter to the voters array
        voters.push(Voter({
            // Record that the voter has not yet voted
            voted: false,
            // Record the voters constitency
            constituency: voterConstituency,
            // Initialise the voters ranking of their consituencies candidates
            candidateRanking: new uint[](0),
            // Initialise the index pointing to the candidate in their ranking
            // currently recieving their vote
            voteIndex: 0
        }));

        // Record the voters address
        voterAddresses.push(voterAddress);

        // Reocrd the voters index
        voterIndexs[voterAddress] = voters.length - 1;
        
        // Record that this voter is registered
        registeredVoters[voterAddress] = true;

        // Record that a new voter has been added
        emit VoterAdded(voterAddress, voterConstituency);

        return true;
    }

    /// @notice Cast a ranking of candidates
    /// @param ranking The voters ranking of candidates in their constituency
    function castVote(uint[] memory ranking) 
        external
        electionHasStarted
        electionHasNotEnded
        voterMustExist(msg.sender)
        voterHasNotVoted(msg.sender)
        validateCandidateRankings(ranking, voters[voterIndexs[msg.sender]].constituency)
        returns (bool)
     {
        // Retrieve the voters information
        Voter storage voter = voters[voterIndexs[msg.sender]];

        // Retrieve the constituency informaiton
        Constituency storage constituency = constituencies[constituencyIndexs[voter.constituency]];

        // Record the voters ranking of candidates in their constituency
        voter.candidateRanking = ranking;

        // Set the index of the candidate recieveing the voters vote to point
        // to the first candidate in their ranking
        voter.voteIndex = 0;

        // Record that the voter has voted
        voter.voted = true;

        // Increment the global vote count
        constituency.numberOfVotes += 1;

        // Record that the voter has cast their vote
        emit VoteCast(msg.sender);

        return true;
    }

    // Election management functions
    /// @notice Start the election
    function startElection() 
        external
        onlyAdmin
        electionHasNotStarted
        returns (bool)
    {
        // Set the election started flag
        electionStarted = true;

        // Record that the election has started
        emit ElectionStarted();

        return true;
    }

    /// @notice Calculate the winning candidate for each constituency
    function calculateConstituencyWinners()
        internal
        onlyAdmin
        electionHasEnded
        resultsHaveNotBeenCalculated
    {
        for (uint i = 0; i < constituencies.length; i++) {
            // Retrieve the current constituencies data
            Constituency storage constituency = constituencies[i];

            // Number of elected candidates in the constituency
            uint numberOfElectedCandidates = 0;

            // Droop Quota
            uint droopQuota = (constituency.numberOfVotes / (constituency.numberOfSeats + 1));

            while (numberOfElectedCandidates < constituency.numberOfSeats) {
                // Candidate elected flag
                bool candidateElected = false;

                // Reset vote counts for each candidate
                for (uint j = 0; j < constituency.candidates.length; j++) {
                    constituency.candidates[j].votes = 0;
                }

                // Calculate the number of votes each candidate has
                // Voter addresses array needs ot be shuffled to support random
                // vote reassignment
                for (uint j = 0; j < voterAddresses.length; j++) {
                    // Retrieve the current voters data
                    Voter storage voter = voters[voterAddresses[j]];

                    // Assign each voters current preference candidate a vote
                    if (!voter.voteIndex == -1) {
                        constituency.candidates[voter.candidateRanking[voter.voteIndex]].voteCount  += 1;
                    }
                }

                // Check if any candidate has reached the Droop Quota
                for (uint j = 0; j < constituency.candidates.length; j++) {
                    // Retrieve the candidates data
                    Candidate storage candidate = constituency.candidates[j];

                    // Droop quota reached & candidate has not yet been elected
                    if (candidate.voteCount >= droopQuota
                        && !candidate.elected
                        && !candidate.eliminated
                        && numberOfElectedCandidates < constituency.numberOfSeats) 
                    {
                        // Record that a candidate has been elected
                        candidateElected = true;
                        numberOfElectedCandidates += 1;

                        // Elect the candidate
                        candidate.elected = true;

                        // Record the elected candidates index in the constituencies
                        // elected candidate indexs array
                        constituency.electedCandidatesIndexes.push(j);

                        // Record that the candidate has been elected
                        emit ConstituencyCandidateElected(constituency.name, candidate.name, candidate.party);

                        // Remove excess votes above the droop quota from the
                        // candidates vote count
                        uint excessVotes = candidate.voteCount - droopQuota;

                        // Number of votes from from the candidate
                        uint votesRemoved = 0;

                        for (uint k = 0; k < voterAddresses.length; k++) {
                            // Retrieve the currents voters data
                            Voter storage voter = voters[voterAddresses[k]];

                            // Vote for elected candidate found
                            if (voter.candidateRanking[voter.voteIndex] == i) {
                                // Remove the vote from the candidate
                                if (voter.voteIndex < voter.candidateRanking.length - 1) {
                                    // Assign the voters vote to the next candidate in
                                    // their vote ranking
                                    voter.voteIndex += 1;
                                }
                                else {
                                    // No more candidates to assign vote to so
                                    // record vote as invalid
                                    voter.voteIndex = -1;
                                }

                                // Record that a vote has been removed
                                votesRemoved += 1;

                                // Stop when all excess votes have been removed
                                if (votesRemoved == excessVotes) {
                                    break;
                                }
                            }
                        }

                        // Record the reduction of votes for the elected candidate
                        candidate.voteCount = droopQuota;
                    }
                }

                // No candidate has been elected this round so remove the
                // candidate with the lowest number of votes
                if (!candidateElected) {
                    // Remove the candidate with the lowest amount of votes
                    // *** Bound check needed and tie break logic required ***
                    uint lowestVoteCount = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
                    uint lowestCandidateIndex = 0;

                    // Find candidate with the least votes
                    for (uint j = 0; j < constituency.candidates.length; j++) {
                        // Retrieve the current candidates data
                        Candidate storage candidate = constituency.candidates[j];

                        // Ensure the candidate is still in the election
                        if (!candidate.elected && !candidate.eliminated) {
                            // Candidate has the least votes seen so far
                            if (candidate.voteCount < lowestVoteCount) {
                                // Record the number of votes for the candidate
                                lowestVoteCount = candidate.voteCount;
                                // Record index of the candidate with the lowest
                                // number of votes
                                lowestCandidateIndex = i;
                            }
                        }
                    }

                    // Remove the candidate with the least votes
                    constituency.candidates[lowestCandidateIndex].eliminated = true;
                }
            }
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

            // Record each elected candidate
            for (uint j = 0; j < constituency.electedCandidatesIndexes; j++) {
                // Index of the elected candidates party
                uint partyIndex = partyIndexs[constituency.electedCandidatesIndexes[j].party];

                // Record that the party has been elected a seat
                electionParties[partyIndex].electedSeats += 1;
            }
        }

        // Record that the election results have been calculated
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

            emit PartyResults(party.name, party.electedSears);

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
    function endElection()
        external
        onlyAdmin
        electionHasStarted
        electionHasNotEnded
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