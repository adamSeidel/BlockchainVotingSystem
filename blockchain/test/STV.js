const fs = require("fs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Single Transferable Vote - Add Constituency", function () {
    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Must add a new constituency", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");
        
        // Test constituency number of seats available for election
        const numberOfSeats = 5;

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName, 5))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, numberOfSeats);
    })

    it("A constituency can only be added before the election has started", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");
        
        // Test constituency number of seats available for election
        const numberOfSeats = 5;

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName, numberOfSeats))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, numberOfSeats);

        // Start the election
        await election.startElection();

        // Attempt to add a constituency after the election has started
        await expect(election.addConstituency(constituencyName,  numberOfSeats))
            .to.be.revertedWith("The election has already started so it is not possible to perform this action");
    })

    it("Only the admin can add constituencies", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Test constituency number of seats available for election
        const numberOfSeats = 5;

        // Add a constituency as the admin
        await expect(election.addConstituency(constituencyName, numberOfSeats))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, numberOfSeats);

        // Attempt to add a constituency as a non-admin
        await expect(election.connect(voter).addConstituency(constituencyName, numberOfSeats))
            .to.be.revertedWith("Only the election admin can perform this action");
    })

    it("A duplicate constituency cannot be added", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Test constituency number of seats available for election
        const numberOfSeats = 5;

        // Add the constituency
        await expect(election.addConstituency(constituencyName, numberOfSeats))
        .to.emit(election, "ConstituencyAdded")
        .withArgs(constituencyName, numberOfSeats);

        // Attempt to add the duplicate constituency
        await expect(election.addConstituency(constituencyName, numberOfSeats))
        .to.be.revertedWith("Constituency already exists");
    })

    it("Emits a constituency added event when a new constituency is added", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Test constituency number of seats available for election
        const numberOfSeats = 5;

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName, numberOfSeats))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, numberOfSeats);
    })

    it("Constituency name cannot be an empty string", async function  () {
        // Test constituency name
        let constituencyName = ethers.encodeBytes32String("");

        // Test constituency number of seats available for election
        const numberOfSeats = 5;

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName, numberOfSeats))
            .to.be.revertedWith("Argument cannot be empty");
    })
})

describe("Single Transferable Vote - Add Constituency Candidate", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");

    // Test constituency number of seats available for election
    const numberOfSeats = 5;

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName, numberOfSeats))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, numberOfSeats);
    })

    it("Should add a new candidate", async function  () {
        // Test candidate name
        const candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded")
            .withArgs(candidateName, partyName, constituencyName);
    })

    it("Only the admin can add a constituency candidate", async function () {
        // Test candidate name
        const candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Attempt to add a constiteuncy candidate as a non admin
        await expect(election.connect(voter).addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.be.revertedWith("Only the election admin can perform this action");
    })

    it("Constituency candidate cannot be added once an election has started", async function () {
        // Test candidate name
        const candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Start election
        await election.startElection()

        // Attempt to add an election candidate after the election has started
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.be.revertedWith("The election has already started so it is not possible to perform this action");
    })

    it("Candidate can only be added to a valid constituency", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Attempt to add a constituency candidate to a constituency that does not exist
        const constituencyName2 = ethers.encodeBytes32String("Test Constituency 2");

        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName2))
            .to.be.revertedWith("Constituency does not exist");
    })

    it("Records candidate name", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded")
            .withArgs(candidateName, partyName, constituencyName);
    })

    it("Records candidate party", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded")
            .withArgs(candidateName, partyName, constituencyName);
    })

    it("Records candidate constituency", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded")
            .withArgs(candidateName, partyName, constituencyName);
    })

    it("Record new parties", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "PartyAdded")
            .withArgs(partyName);
    })

    it("Records the party name correclty", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        const partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "PartyAdded")
            .withArgs(partyName);
   })

   it("Should emit a candidate added event", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        let partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");
    })

    it("Multiple candidates with the same name cannot be added", async function () {
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate");
        // Test party name
        let partyName = ethers.encodeBytes32String("Test Party");

        // Add a constituency candidate
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Attempt to add the same candidate again
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
        .to.be.revertedWith("This candidate already exists");
    })
})

describe("Single Transferable Vote - Add Voter", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");
    // Test constituency number of seats available for election
    const numberOfSeats = 5;

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("FPTP", admin);
        election = await Election.deploy();

        await election.waitForDeployment();

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);
    })

    it("Adds a new voter", async function () {
        // Add a new voter as an admin
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Only the admin can add new voters", async function () {
        // Attempt to add a new voter as a non-admin
        await expect(election.connect(voter).addVoter(voter.address, constituencyName))
            .to.be.revertedWith("Only the election admin can perform this action");

        // Add a new voter as an admin
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Voters can only be added before the election has started", async function () {
        // Add a new voter before election has started
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)

        // Start the election
        await election.startElection()

        // Attempt to add a new voter now that the election has started
        await expect(election.addVoter(voter.address, constituencyName))
        .to.be.revertedWith("The election has already started so it is not possible to perform this action");
    })

    it("Voter must not already exist", async function () {
        // Add a new voter
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)

        // Attempt to add the same voter again
        await expect(election.addVoter(voter.address, constituencyName))
        .to.be.revertedWith("This voter is already registered to vote");
    })

    it("Voters associated constituency must exist", async function () {
        // Constituency name that does not exist
        const constituencyName2 = ethers.encodeBytes32String("Test Constituency2");
        
        // Attempt to add a voter with a constituency that does not exist
        await expect(election.addVoter(voter.address, constituencyName2))
        .to.be.revertedWith("Constituency does not exist");

        // Add a new voter
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Initialises a new voter as having not yet voted", async function () {
        // Add a new voter
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Initialises a new voters constituency correctly", async function () {
        // Add a new voter
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Voter added event is emitted", async function () {
        // Add a new voter as an admin
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })
})

describe("Single Transferable Vote - Cast Vote", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");

    // Candidate 1
    // Test candidate name
    const candidateName1 = ethers.encodeBytes32String("Test Candidate1");
    // Test party name
    const partyName1 = ethers.encodeBytes32String("Test Party1");

    // Candidate 2
    // Test candidate name
    const candidateName2 = ethers.encodeBytes32String("Test Candidate2");
    // Test party name
    const partyName2 = ethers.encodeBytes32String("Test Party2");

    // Candidate 3
    // Test candidate name
    const candidateName3 = ethers.encodeBytes32String("Test Candidate3");
    // Test party name
    const partyName3 = ethers.encodeBytes32String("Test Party3");

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();

        // Test number of seats for election
        const numberOfSeats = 3;

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName, numberOfSeats))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, numberOfSeats);

        // Add 3 candidates for testing
        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName1, partyName1, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName2, partyName2, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName3, partyName3, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Give a voter the right to vote for testing purposes
        // Add a new voter as an admin
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Vote must be cast", async function () {
        // Start election
        await election.startElection();

        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, candidateName3];

        // Cast a valid vote
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);
    })

    it("Votes can only be added once the election has started", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, candidateName3];

        // Attempt to cast a vote before the election has started
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.be.revertedWith("The election has not started so it is not possible to perform this action");

        // Start election
        await election.startElection();

        // Cast a vote once the election has started
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);
    })

    it("Votes can only be added before the election has ended", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, candidateName3];

        // Start the election
        await election.startElection();

        // Cast a vote once the election has started
        await expect(election.connect(voter).castVote(candidateRanking))
        .to.emit(election, "VoteCast")
        .withArgs(voter.address);

        // End the election
        await election.endElection();

        // Attempt to cast a vote before after the election has ended
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.be.revertedWith("The election has already ended so it is not possible to perform this action");
    })

    it("Only eligible voters can add votes", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, candidateName3];

        // Start the election
        await election.startElection();

        // Attempt to cast a vote as the admin who is not eligible to vote
        await expect(election.castVote(candidateRanking))
            .to.be.revertedWith("This voter is not registered to vote");

        // Cast a vote as a valid voter
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);
    })

    it("Voter cannot cast more than one vote", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, candidateName3];

        // Start the election
        await election.startElection();

        // Cast a vote as a valid voter
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);

        // Attempt to cast a second vote
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.be.revertedWith("You have already voted")
    })

    it("Voter can only vote for candidates that exist", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, ethers.encodeBytes32String("TestCandidate4"), candidateName3];

        // Start the election
        await election.startElection();

        // Attempt to cast a vote for a candidate which does not exist
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.be.revertedWith("All candidates in the ranking must be valid");
    })

    it("Voter cannot cast an empty ranking", async function () {
        // Test candidate ranking
        const candidateRanking = [];

        // Start the election
        await election.startElection();

        // Attempt to cast a vote for a candidate which does not exist
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.be.revertedWith("Candidate ranking cannot be empty");
    })

    it("Voter cannot rank more than the number of candidates in the constituency", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, ethers.encodeBytes32String("TestCandidate4"), candidateName3];

        // Start the election
        await election.startElection();

        // Attempt to cast a vote for a candidate which does not exist
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.be.revertedWith("Ranking cannot exceed the number of candidates in the constituency");
    })

    it("Voter must be recorded as having voted once a vote is cast", async function () {
        // Test candidate ranking
        const candidateRanking = [candidateName1, candidateName2, candidateName3];

        // Start election
        await election.startElection();

        // Cast a valid vote
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);
    })
})

describe("Single Transferable Vote - Start Election", function () {
    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Only the admin can start and election", async function () {
        // Attempt to start the election as a non admin
        await expect(election.connect(voter).startElection())
            .to.be.revertedWith("Only the election admin can perform this action");

        // Start the election as an admin
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");
    })

    it("Election can only be started if the election has not already commenced", async function () {
        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");

        // Attempt to start the election again
        await expect(election.startElection())
            .to.be.revertedWith("The election has already started so it is not possible to perform this action");
    })

    it("Election should be marked as started", async function () {
        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");
    })

    it("Election started event is emitted", async function () {
        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");
    })
})

describe("Single Transferable Vote - End Election", function () {
    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Only the admin can end the election", async function () {
        // Start the election
        await election.startElection()

        // Attempt to end the election as a non admin
        await expect(election.connect(voter).endElection())
            .to.be.revertedWith("Only the election admin can perform this action");

        // End the election
        await expect(election.endElection())
            .to.emit(election, "ElectionEnded");
    })

    it("Election can only be ended after the election has started", async function () {
        // Attempt to end the election before the election has started
        await expect(election.endElection())
        .to.be.revertedWith("The election has not started so it is not possible to perform this action");

        // Start the election
        await election.startElection()

        // End the election
        await expect(election.endElection())
        .to.emit(election, "ElectionEnded");
    })

    it("Election cannot be ended after the election has already ended", async function () {
        // Start the election
        await election.startElection()

        // End the election
        await expect(election.endElection())
        .to.emit(election, "ElectionEnded");

        // End the election
        await expect(election.endElection())
        .to.be.revertedWith("The election has already ended so it is not possible to perform this action");
    })

    it("Election must be marked as ended once the election is ended", async function () {
        // Start the election
        await election.startElection()

        // End the election
        await expect(election.endElection())
            .to.emit(election, "ElectionEnded");
    })

    it("The election cannot be ended twice", async function () {
        // Start the election
        await election.startElection();

        // End the election
        await election.endElection();

        // Attempt to end the election again
        await expect(election.endElection())
            .to.be.revertedWith("The election has already ended so it is not possible to perform this action");
    })
})

describe("Single Transferable Vote - End Election", function () {
    beforeEach(async function () {
        [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Election results cannot be calculated twice", async function () {
        // Start the election
        await election.startElection();

        // End the elction
        await election.endElection();

        await expect(election.calculateElectionResults())
            .to.be.revertedWith("The election results have already been calculated so it is not possible to perform this action");
    })

    it("Should correclty calculate the winner for a single constituency with one available seat with single ranked votes", async function () {
        // Add a constituency for testing purposes
        const constituency1 = ethers.encodeBytes32String("Harrogate");
        const numberOfSeats = 1;
        await election.addConstituency(constituency1, numberOfSeats);

        // Add 3 candidates to the test constituency
        const candidate1 = ethers.encodeBytes32String("Conservative");
        await election.addConstituencyCandidate(candidate1, candidate1, constituency1)

        const candidate2 = ethers.encodeBytes32String("Labour");
        await election.addConstituencyCandidate(candidate2, candidate2, constituency1)

        const candidate3 = ethers.encodeBytes32String("Reform");
        await election.addConstituencyCandidate(candidate3, candidate3, constituency1)

        // Add 5 eligible voters for testing purposes
        await election.addVoter(admin.address, constituency1)
        await election.addVoter(voter.address, constituency1)
        await election.addVoter(voter2.address, constituency1)
        await election.addVoter(voter3.address, constituency1)
        await election.addVoter(voter4.address, constituency1)

        // Start the election
        await election.startElection();

        // Cast vote for Conservative Party as admin voter
        let candidateRanking = [candidate1]
        await expect(election.castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(admin.address);

        // Cast vote for Conservative Party as voter
        candidateRanking = [candidate1]
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);

        // Cast vote for Labour Party as voter2
        candidateRanking = [candidate2]
        await expect(election.connect(voter2).castVote(candidateRanking))
        .to.emit(election, "VoteCast")
        .withArgs(voter2.address);

        // Cast vote for Reform Party as vote3
        candidateRanking = [candidate3]
        await expect(election.connect(voter3).castVote(candidateRanking))
        .to.emit(election, "VoteCast")
        .withArgs(voter3.address);

        // End election
        await expect(election.endElection())
            .to.emit(election, "ConstituencyCandidateElected")
            .withArgs(constituency1, candidate1, candidate1);
    })

    it("Should correclty calculate the winner for a single constituency with two available seats and ranked votes", async function () {
        // Add a constituency for testing purposes
        const constituency1 = ethers.encodeBytes32String("Harrogate");
        const numberOfSeats = 2;
        await election.addConstituency(constituency1, numberOfSeats);

        // Add 3 candidates to the test constituency
        const candidate1 = ethers.encodeBytes32String("Conservative");
        await election.addConstituencyCandidate(candidate1, candidate1, constituency1)

        const candidate2 = ethers.encodeBytes32String("Labour");
        await election.addConstituencyCandidate(candidate2, candidate2, constituency1)

        const candidate3 = ethers.encodeBytes32String("Reform");
        await election.addConstituencyCandidate(candidate3, candidate3, constituency1)

        // Add 5 eligible voters for testing purposes
        await election.addVoter(admin.address, constituency1)
        await election.addVoter(voter.address, constituency1)
        await election.addVoter(voter2.address, constituency1)
        await election.addVoter(voter3.address, constituency1)
        await election.addVoter(voter4.address, constituency1)

        // Start the election
        await election.startElection();

        // Cast vote for Conservative Party then Labour as admin voter
        let candidateRanking = [candidate1, candidate2]
        await expect(election.castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(admin.address);

        // Cast vote for Conservative Party then Labour as voter
        candidateRanking = [candidate1, candidate2]
        await expect(election.connect(voter).castVote(candidateRanking))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address);

        // Cast vote for Labour Party then Reform as voter2
        candidateRanking = [candidate2, candidate3]
        await expect(election.connect(voter2).castVote(candidateRanking))
        .to.emit(election, "VoteCast")
        .withArgs(voter2.address);

        // Cast vote for Reform Party as vote3
        candidateRanking = [candidate3]
        await expect(election.connect(voter3).castVote(candidateRanking))
        .to.emit(election, "VoteCast")
        .withArgs(voter3.address);

        // End election
        await expect(election.endElection())
            .to.emit(election, "ConstituencyCandidateElected")
            .withArgs(constituency1, candidate1, candidate1)
            .to.emit(election, "ConstituencyCandidateElected")
            .withArgs(constituency1, candidate2, candidate2);
    })

    it("Should correctly calculate the winner in an election with multiple constituencies and single ranked votes", async function () {
        // Number of seats available for election
        const numberOfSeats = 1;

        // Add 4 constituencies
        // Constituency 1
        const constituency1 = ethers.encodeBytes32String("Harrogate");
        await election.addConstituency(constituency1, numberOfSeats);
        // Constituency 2
        const constituency2 = ethers.encodeBytes32String("Knaresborough");
        await election.addConstituency(constituency2, numberOfSeats);
        // Constituency 3
        const constituency3 = ethers.encodeBytes32String("York");
        await election.addConstituency(constituency3, numberOfSeats);
        // Constituency 4
        const constituency4 = ethers.encodeBytes32String("Leeds");
        await election.addConstituency(constituency4, numberOfSeats);

        // Add 3 candidates to each constituency
        // Add 3 candidates to the Harrogate constituency
        // Jim, Conservative, Harrogate
        let candidateName = ethers.encodeBytes32String("Jim");
        let candidateParty = ethers.encodeBytes32String("Conservatives");
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency1);

        // Anna, Labour, Harrogate
        candidateName = ethers.encodeBytes32String("Anna");
        candidateParty = ethers.encodeBytes32String("Labour")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency1);

        // Bill, Reform, Harrogate
        candidateName = ethers.encodeBytes32String("Bill");
        candidateParty = ethers.encodeBytes32String("Reform")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency1);
        
        // Add 3 candidates to the Knaresborough constituency
        // Steve, Conservative, Knaresborough
        candidateName = ethers.encodeBytes32String("Steve");
        candidateParty = ethers.encodeBytes32String("Conservatives");
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency2);

        // Hope, Labour, Knaresborough
        candidateName = ethers.encodeBytes32String("Hope");
        candidateParty = ethers.encodeBytes32String("Labour")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency2);

        // Dave, Reform, Knaresborough
        candidateName = ethers.encodeBytes32String("Dave");
        candidateParty = ethers.encodeBytes32String("Reform")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency2);

        // Add 3 candidates to the York constituency
        // Angela, Conservative, York
        candidateName = ethers.encodeBytes32String("Angela");
        candidateParty = ethers.encodeBytes32String("Conservatives");
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency3);

        // Garry, Labour, York
        candidateName = ethers.encodeBytes32String("Garry");
        candidateParty = ethers.encodeBytes32String("Labour")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency3);

        // Finn, Reform, York
        candidateName = ethers.encodeBytes32String("Finn");
        candidateParty = ethers.encodeBytes32String("Reform")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency3);

        // Add 3 candidates to the Leeds constituency
        // Olivia, Conservative, Leeds 
        candidateName = ethers.encodeBytes32String("Olivia");
        candidateParty = ethers.encodeBytes32String("Conservatives");
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency4);

        // Tim, Labour, Leeds
        candidateName = ethers.encodeBytes32String("Tim");
        candidateParty = ethers.encodeBytes32String("Labour")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency4);

        // Jake, Reform, Leeds
        candidateName = ethers.encodeBytes32String("Jake");
        candidateParty = ethers.encodeBytes32String("Reform")
        await election.addConstituencyCandidate(candidateName, candidateParty, constituency4);

        // Add Harrogate Voters
        // Array to store Harrogate voter addresses
        const harrogateVoters = [];

        // Add 24 voters to the Harrogate constituency
        for (let i = 0; i < 24; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            harrogateVoters.push(voter); // Store the full wallet object in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituency1))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituency1);
        }

        // Add Knaresborough Voters
        // Array to store Knaresborough voter addresses
        const knaresboroughVoters = [];

        // Add 15 voters to the Knaresborough constituency
        for (let i = 0; i < 15; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            knaresboroughVoters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituency2))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituency2);
        }

        // Add York Voters
        // Array to store York voter addresses
        const yorkVoters = [];

        // Add 15 voters to the York constituency
        for (let i = 0; i < 15; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            yorkVoters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituency3))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituency3);
        }

        // Add Leeds Voters
        // Array to store York voter addresses
        const leedsVoters = [];

        // Add 24 voters to the Leeds constituency
        for (let i = 0; i < 27; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            leedsVoters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituency4))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituency4);
        }

        await election.startElection();

        // Cast Harrogate Votes
        // 10 votes for Jim - Conservative
        candidateName = ethers.encodeBytes32String("Jim")
        for (let i = 0; i < 10; i++) {
            const voterWallet = harrogateVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 5 votes for Anna - Labour
        candidateName = ethers.encodeBytes32String("Anna")
        for (let i = 10; i < 15; i++) {
            const voterWallet = harrogateVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 9 votes for Bill - Reform
        candidateName = ethers.encodeBytes32String("Bill")
        for (let i = 15; i < 24; i++) {
            const voterWallet = harrogateVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }

        // Cast Knaresborough Votes
        // 8 votes for Steve - Conservative
        candidateName = ethers.encodeBytes32String("Steve")
        for (let i = 0; i < 8; i++) {
            const voterWallet = knaresboroughVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 4 votes for Hope - Labour
        candidateName = ethers.encodeBytes32String("Hope")
        for (let i = 8; i < 12; i++) {
            const voterWallet = knaresboroughVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 3 votes for Dave - Reform
        candidateName = ethers.encodeBytes32String("Dave")
        for (let i = 12; i < 15; i++) {
            const voterWallet = knaresboroughVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }

        // Cast York Votes
        // 3 votes for Angela - Conservative
        candidateName = ethers.encodeBytes32String("Angela")
        for (let i = 0; i < 3; i++) {
            const voterWallet = yorkVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 10 votes for Garry - Labour
        candidateName = ethers.encodeBytes32String("Garry")
        for (let i = 3; i < 13; i++) {
            const voterWallet = yorkVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 2 votes for Finn - Reform
        candidateName = ethers.encodeBytes32String("Finn")
        for (let i = 13; i < 15; i++) {
            const voterWallet = yorkVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }

        // Cast Leeds Votes
        // 8 votes for Olivia - Conservative
        candidateName = ethers.encodeBytes32String("Olivia")
        for (let i = 0; i < 8; i++) {
            const voterWallet = leedsVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 9 votes for Tim - Labour
        candidateName = ethers.encodeBytes32String("Tim")
        for (let i = 8; i < 17; i++) {
            const voterWallet = leedsVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }
        // 10 votes for Jake - Reform
        candidateName = ethers.encodeBytes32String("Jake")
        for (let i = 17; i < 27; i++) {
            const voterWallet = leedsVoters[i].connect(ethers.provider);

            await expect(election.connect(voterWallet).castVote([candidateName]))
                .to.emit(election, "VoteCast")
                .withArgs(voterWallet.address);
        }

        // Confirm the correct events are emitted
        const tx = await election.endElection()
        const result = await tx.wait()
        const eventLog = result.logs

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Harrogate Constituency Winner Event
        expect(eventLog[1].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[1].args[0]).to.equal(ethers.encodeBytes32String("Harrogate"))
        expect(eventLog[1].args[1]).to.equal(ethers.encodeBytes32String("Jim"))
        expect(eventLog[1].args[2]).to.equal(ethers.encodeBytes32String("Conservatives"))

        // Knaresborough Constituency Winner Event
        expect(eventLog[2].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[2].args[0]).to.equal(ethers.encodeBytes32String("Knaresborough"))
        expect(eventLog[2].args[1]).to.equal(ethers.encodeBytes32String("Steve"))
        expect(eventLog[2].args[2]).to.equal(ethers.encodeBytes32String("Conservatives"))
        
        // York Constituency Winner Event
        expect(eventLog[3].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[3].args[0]).to.equal(ethers.encodeBytes32String("York"))
        expect(eventLog[3].args[1]).to.equal(ethers.encodeBytes32String("Garry"))
        expect(eventLog[3].args[2]).to.equal(ethers.encodeBytes32String("Labour"))

        // Leeds Constituency Winner Event
        expect(eventLog[4].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[4].args[0]).to.equal(ethers.encodeBytes32String("Leeds"))
        expect(eventLog[4].args[1]).to.equal(ethers.encodeBytes32String("Jake"))
        expect(eventLog[4].args[2]).to.equal(ethers.encodeBytes32String("Reform"))

        // All Constituency Winners Calculated Event
        expect(eventLog[5].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Election Results Calculated Event
        expect(eventLog[6].fragment.name).to.equal("ElectionResultsCalculated")

        // Conservative Party Results Event
        expect(eventLog[7].fragment.name).to.equal("PartyResults")
        expect(eventLog[7].args[0]).to.equal(ethers.encodeBytes32String("Conservatives"))
        expect(eventLog[7].args[1]).to.equal(2)
        
        // Labour Party Results Event
        expect(eventLog[8].fragment.name).to.equal("PartyResults")
        expect(eventLog[8].args[0]).to.equal(ethers.encodeBytes32String("Labour"))
        expect(eventLog[8].args[1]).to.equal(1)

        // Reform Party Results Event
        expect(eventLog[9].fragment.name).to.equal("PartyResults")
        expect(eventLog[9].args[0]).to.equal(ethers.encodeBytes32String("Reform"))
        expect(eventLog[9].args[1]).to.equal(1)

        // Election Winner Event
        expect(eventLog[10].fragment.name).to.equal("ElectionWinner")
        expect(eventLog[10].args[0]).to.equal(ethers.encodeBytes32String("Conservatives"))
        expect(eventLog[10].args[1]).to.equal(2)
    })
})
