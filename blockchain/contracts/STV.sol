// https://www.electoral-reform.org.uk/latest-news-and-research/publications/how-to-conduct-an-election-by-the-single-transferable-vote-3rd-edition/
pragma solidity ^0.8.0;

contract STV {
    struct Voter {
        bool voted;
        uint weight;
        uint[] candidateRanking;
        uint voteIndex;
    }

    struct Candidate {
        bytes32 name;
        uint voteCount;
        bool elected;
        bool eliminated;
    }

    address public admin;

    mapping (address => Voter) public voters;

    address[] public voterAddresses;

    Candidate[] public candidates;

    uint public numberOfSeats;

    uint public numberOfVotes;

    bool public electionEnded;

    constructor (bytes32[] memory candidateNames, uint _numberOfSeats) {
        electionEnded = false;

        numberOfSeats = _numberOfSeats;

        numberOfVotes = 0;

        admin = msg.sender;

        for (uint i = 0; i < candidateNames.length; i++) {
            Candidate memory candidate = Candidate({
                name: candidateNames[i],
                voteCount: 0,
                elected: false,
                eliminated: false
            });

            candidates.push(candidate);
        }
    }
    
    // Tested
    function getElectionCandidates() public view returns (Candidate[] memory) {
        return candidates;
    }

    // Tested
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

    // Tested
    function vote(uint[] memory ranking) public {
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
        numberOfVotes += 1;

        // Record the voters ranking of the election candidates
        sender.candidateRanking = ranking;

        // Set the index of the current vote
        sender.voteIndex = 0;
    }

    // Tested
    function getVotersPreferences(address voter) public view returns (uint[] memory) {
        return voters[voter].candidateRanking;
    }

    // Tested
    function getEligibleVoters() public view returns(address[] memory) {
        return voterAddresses;
    }

    // Tested
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

    // Tested
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

    // Tested
    function getNumberOfSeats() public view returns (uint) {
        return numberOfSeats;
    }

    function getNumberOfVotes() public view returns (uint) {
        return numberOfVotes;
    }

    // Tested
    function getDroopQuota() public view returns (uint) {
        return (numberOfVotes / (numberOfSeats + 1));
    }

    function calculateElectionWinner() public {
        if (!electionEnded) {
            revert("The election has not ended");
        }

        if (msg.sender != admin) {
            revert("Only the Election Admin can calculate the election winner");
        }

        // Number of elected candidates
        uint numberOfElectedCandidates = 0;

        // Droop Quota
        // uint droopQuota = (numberOfVotes / (numberOfSeats + 1)) + 1;
        uint droopQuota = (numberOfVotes / (numberOfSeats + 1));

        while (numberOfElectedCandidates < numberOfSeats) {
        // for (uint k = 0; k < 2; k++) {

            // Candidate elected flag
            bool candidateElected = false;

            // Reset vote counts for each candidate
            for (uint i = 0; i < candidates.length; i++) {
                candidates[i].voteCount = 0;
            }

            // Calculate the number of votes each candidate has
            // Voter addresses array needs to be suffled to support random
            // vote reassignment
            for (uint i = 0; i < voterAddresses.length; i++) {
                Voter storage voter = voters[voterAddresses[i]];

                // Assign each voters current preference candidate a vote
                candidates[voter.candidateRanking[voter.voteIndex]].voteCount += 1;
            }

            // Check if any candidate has reached the Droop Quota
            for (uint i = 0; i < candidates.length; i++) {
                // Droop Quota Reached & candidate not yet elected
                if (candidates[i].voteCount >= droopQuota && !candidates[i].elected && !candidates[i].eliminated && numberOfElectedCandidates < numberOfSeats) {
                    // Record that a candidate has been elected
                    candidateElected = true;
                    numberOfElectedCandidates += 1;

                    // Elect candidate
                    candidates[i].elected = true;

                    // Remove excess votes above the quota from candidate
                    uint excessVotes = candidates[i].voteCount - droopQuota;

                    // Number of votes removed from the candiate
                    uint votesRemoved = 0;

                    for (uint j = 0; j < voterAddresses.length; j++) {
                        // Current voter
                        Voter storage voter = voters[voterAddresses[j]];

                        // Vote for elected candidate found
                        if (voter.candidateRanking[voter.voteIndex] == i) {
                            // Remove the vote from candidate
                            if (voter.voteIndex < voter.candidateRanking.length - 1) {
                                voter.voteIndex += 1;
                            }

                            // Record vote has been removed
                            votesRemoved += 1;

                            // Stop when all excess votes have been removed
                            if (votesRemoved == excessVotes) {
                                break;
                            }
                        }
                    }

                    // Record the reduction of votes for the elected candidate
                    candidates[i].voteCount = droopQuota;
                }
            }

            // No candidate elected this round so remove the candidate with the
            // lowest number of votes
            if (!candidateElected) {
                // Remove lowest candidate should no candidate be elected this round
                // *** Bound check needed and tie break logic required ***
                uint lowestVoteCount = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
                uint lowestCandidateIndex = 0;

                // Find candidate with the least votes
                for (uint i = 0; i < candidates.length; i++) {
                    // Ensure candidate is still in the election
                    if (!candidates[i].elected && !candidates[i].eliminated) {
                        // Candidate has least votes seen so far
                        if (candidates[i].voteCount < lowestVoteCount) {
                            // Record the number of votes for candidate
                            lowestVoteCount = candidates[i].voteCount;
                            // Record index of candidate
                            lowestCandidateIndex = i;
                        }
                    }
                }

                // Remove candidate with the least votes
                candidates[lowestCandidateIndex].eliminated = true;
            }
        }
    }

    // function getElectedCandidates() public view returns (bytes32[] memory) {
    //     bytes32[] memory electedCandidates = new bytes32[](numberOfSeats - 1);
    //     uint index = 0;

    //     for (uint i = 0; i < candidates.length; i++) {
    //         if (candidates[i].elected) {
    //             electedCandidates[index] = candidates[i].name;
    //             index += 1;
    //         }
    //     }

    //     return electedCandidates;
    // }

    function getElectedCandidates() public view returns (bytes32[] memory) {
        // Count the number of elected candidates
        uint electedCount = 0;
        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].elected) {
                electedCount++;
            }
        }

        // Create an array of the exact size needed
        bytes32[] memory electedCandidates = new bytes32[](electedCount);
        uint index = 0;

        // Populate the array with the names of elected candidates
        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].elected) {
                electedCandidates[index] = candidates[i].name;
                index++;
            }
        }

        return electedCandidates;
    }

    function getCandidateVotes(uint candidateIndex) public view returns (uint) {
        return candidates[candidateIndex].voteCount;
    }

    function getCandidateElectionStatus(uint candidateIndex) public view returns (bool) {
        return candidates[candidateIndex].elected;
    }
}