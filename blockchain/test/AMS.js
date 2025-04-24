const fs = require("fs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Additional Member System - Add Constituency", function () {
    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

        await election.waitForDeployment();
    })

    it("Must add a new constituency", async function  () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);
    })

    it("A constituency can only be added before the election has started", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);

        // Start the election
        await election.startElection();

        // Attemp to add a constituency after the election has started
        await expect(election.addConstituency(constituencyName))
            .to.be.revertedWith("The election has already started so it is not possible to perform this action");
    })

    it("Only the admin can add constituencies", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Add a constituency as the admin
        await expect(election.addConstituency(constituencyName))
        .to.emit(election, "ConstituencyAdded")
        .withArgs(constituencyName);

        // Attempt to add a constituency as a non-admin
        await expect(election.connect(voter).addConstituency(constituencyName))
            .to.be.revertedWith("Only the election admin can perform this action");
    })

    it("A duplicate constituency cannot be added", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Add the constituency
        await expect(election.addConstituency(constituencyName))
        .to.emit(election, "ConstituencyAdded")
        .withArgs(constituencyName);

        // Attempt to add the duplicate constituency
        await expect(election.addConstituency(constituencyName))
        .to.be.revertedWith("Constituency already exists");
    })

    it("Emits a constituency added event when a new constituency is added", async function () {
        // Test constituency name
        const constituencyName = ethers.encodeBytes32String("Test Constituency");

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);
    })

    it("Constituency name cannot be an empty string", async function  () {
        // Test constituency name
        let constituencyName = ethers.encodeBytes32String("");

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.be.revertedWith("Constituency name cannot be empty");
    })
})

describe("Additional Member System -  Add Constituency Candidate", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");
    
    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1)

        await election.waitForDeployment();

        // Add a constituency to the election before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);
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

describe("Additional Member System - Add Voter", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

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

describe("Additional Member System - Cast Vote", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

        await election.waitForDeployment();

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);
        
        // Add 3 candidates for testing
        // Candidate 1
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate1");
        // Test party name
        let partyName = ethers.encodeBytes32String("Test Party1");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Candidate 2
        // Test candidate name
        candidateName = ethers.encodeBytes32String("Test Candidate2");
        // Test party name
        partyName = ethers.encodeBytes32String("Test Party2");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Candidate 3
        // Test candidate name
        candidateName = ethers.encodeBytes32String("Test Candidate3");
        // Test party name
        partyName = ethers.encodeBytes32String("Test Party3");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");

        // Give a voter the right to vote for testing purposes
        // Add a new voter as an admin
        await expect(election.addVoter(voter.address, constituencyName))
        .to.emit(election, "VoterAdded")
        .withArgs(voter.address, constituencyName)
    })

    it("Vote must be cast", async function () {
        // Candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Start election
        await election.startElection();

        // Cast a valid vote
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);
    })

    it("Votes can only be added once the election has started", async function () {
        // Candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Attempt to cast a vote before the election has started
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.be.revertedWith("The election has not started so it is not possible to perform this action");

        // Start election
        await election.startElection();

        // Cast a vote once the election has started
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);
    })

    it("Votes can only be added before the election has ended", async function () {
        // Candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Start the election
        await election.startElection();

        // End the election
        await election.endElection();

        // Attempt to cast a vote before after the election has ended
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.be.revertedWith("The election has already ended so it is not possible to perform this action");
    })

    it("Only eligible voters can add votes", async function () {
        // Candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Start the election
        await election.startElection();

        // Attempt to cast a vote as the admin who is not eligible to vote
        await expect(election.castVote(voteCandidate, voteParty))
            .to.be.revertedWith("This voter is not registered to vote");

        // Cast a vote as a valid voter
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);
    })

    it("Voter cannot cast more than one vote", async function () {
        // Candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Start the election
        await election.startElection();

        // Cast a vote as a valid voter
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);

        // Attempt to cast a second vote
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.be.revertedWith("You have already voted")
    })

    it("Voter can only vote for candidates that exist", async function () {
        // Invalid candidate the voter will vote for
        let voteCandidate = ethers.encodeBytes32String("Test Candidate4");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Start the election
        await election.startElection();

        // Attempt to cast a vote for a candidate which does not exist
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.be.revertedWith("This candidate does not exist");


        // Valid candidate the voter will vote for
        voteCandidate = ethers.encodeBytes32String("Test Candidate1");
        // Cast a vote as a valid voter
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);
    })

    it("Voter can only vote for parties that exist", async function () {
        // Valid candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Invalid Party the voter will vote for
        let voteParty = ethers.encodeBytes32String("Test Party4");

        // Start the election
        await election.startElection();

        // Attempt to cast a vote for a candidate which does not exist
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.be.revertedWith("This party does not exist");


        // Valid party the voter will vote for
        voteParty = ethers.encodeBytes32String("Test Party2");
        // Cast a vote as a valid voter
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);
    })

    it("Voter must be recorded as having voted once a vote is cast", async function () {
        // Candidate the voter will vote for
        const voteCandidate = ethers.encodeBytes32String("Test Candidate1");

        // Party the voter will vote for
        const voteParty = ethers.encodeBytes32String("Test Party2");

        // Start election
        await election.startElection();

        // Cast a valid vote
        await expect(election.connect(voter).castVote(voteCandidate, voteParty))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, voteCandidate, voteParty);
    })
})

describe("Additional Member System - Start Election", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

        await election.waitForDeployment();

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);
    })

    it("Only the admin can start an election", async function () {
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

describe("Additional Member System - End Election", function () {
    // Test constituency name
    const constituencyName = ethers.encodeBytes32String("Test Constituency");

    beforeEach(async function () {
        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

        await election.waitForDeployment();

        // Add a constituency before the election has started
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);

        // Candidate 1
        // Test candidate name
        let candidateName = ethers.encodeBytes32String("Test Candidate1");
        // Test party name
        let partyName = ethers.encodeBytes32String("Test Party1");

        // Add a constituency candidate as an admin
        await expect(election.addConstituencyCandidate(candidateName, partyName, constituencyName))
            .to.emit(election, "CandidateAdded");
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
})

describe("Additional Member System - Calculate Election Results", function () {
    it("Election results cannot be calculated twice", async function () {
        [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

        await election.waitForDeployment();

        // Start the election
        await election.startElection();

        // End the election
        await election.endElection();
        
        await expect(election.calculateElectionResults())
            .to.be.revertedWith("The election results have already been calculated so it is not possible to perform this action");
    })

    it("Should correclty calculate the winner for a single constituency", async function () {
        [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(1);

        await election.waitForDeployment();
        
        // Add a constituency for testing purposes
        const constituency1 = ethers.encodeBytes32String("Harrogate");
        await election.addConstituency(constituency1);

        // Add 3 candidates to the test constituency
        const candidate1 = ethers.encodeBytes32String("Conservative");
        await election.addConstituencyCandidate(candidate1, candidate1, constituency1)

        const candidate2 = ethers.encodeBytes32String("Labour");
        await election.addConstituencyCandidate(candidate2, candidate2, constituency1)

        const candidate3 = ethers.encodeBytes32String("Reform");
        await election.addConstituencyCandidate(candidate3, candidate3, constituency1)

        // Add 5 elgibile voters for testing purposes
        await election.addVoter(admin.address, constituency1)
        await election.addVoter(voter.address, constituency1)
        await election.addVoter(voter2.address, constituency1)
        await election.addVoter(voter3.address, constituency1)
        await election.addVoter(voter4.address, constituency1)

        // Start the election
        await election.startElection();

        // Cast vote for Conservative Party as admin voter
        await expect(election.castVote(candidate1, candidate1))
            .to.emit(election, "VoteCast")
            .withArgs(admin.address, candidate1, candidate1);

        // Cast vote for Conservative Party as voter
        await expect(election.connect(voter).castVote(candidate1, candidate1))
            .to.emit(election, "VoteCast")
            .withArgs(voter.address, candidate1, candidate1);

        // Cast vote for Labour Party as voter2
        await expect(election.connect(voter2).castVote(candidate2, candidate2))
        .to.emit(election, "VoteCast")
        .withArgs(voter2.address, candidate2, candidate2);

        // Cast vote for Reform Party as vote3
        await expect(election.connect(voter3).castVote(candidate3, candidate3))
        .to.emit(election, "VoteCast")
        .withArgs(voter3.address, candidate3, candidate3);

        // End election
        await expect(election.endElection())
            .to.emit(election, "ConstituencyWinner")
            .withArgs(constituency1, candidate1, candidate1)
    })

    it("Should correctly calculate the election winner - Wikipedia AMS Example", async function () {
        // Test of an example AMS election from
        // https://en.wikipedia.org/wiki/Additional-member_system
        [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(100);

        await election.waitForDeployment();

        const party1 = ethers.encodeBytes32String("Conservative");
        const party2 = ethers.encodeBytes32String("Labour Party");
        const party3 = ethers.encodeBytes32String("Liberal");
        const party4 = ethers.encodeBytes32String("Reform");

        // Add 70 constituencies
        for (let i = 0; i < 70; i++) {
            // Name of the ith constituency
            let constituencyName = ethers.encodeBytes32String("Constituency" + i);
            // Add the constituency
            await election.addConstituency(constituencyName)

            // Add the 4 candidates to the ith constituency
            await election.addConstituencyCandidate(party1, party1, constituencyName);
            await election.addConstituencyCandidate(party2, party2, constituencyName);
            await election.addConstituencyCandidate(party3, party3, constituencyName);
            await election.addConstituencyCandidate(party4, party4, constituencyName);
        }

        // Conservative voters
        const conservativeVoters = []
        // Add 5 voters to the first 53 constituencies
        for (let i = 0; i < 53; i++) {
            for (let j = 0; j < 5; j++) {
                const voter = ethers.Wallet.createRandom();
                conservativeVoters.push(voter);

                // Fund the voter waller with some Ether
                const tx = await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005"),
                });
                await tx.wait();

                // Add the voter to the election
                constituencyName = ethers.encodeBytes32String("Constituency" + i)
                await expect(election.addVoter(voter.address, constituencyName))
                    .to.emit(election, "VoterAdded")
                    .withArgs(voter.address, constituencyName);
            }
        }
        // Add 36 voters to the 54th constituency
        for (let j = 0; j < 36; j++) {
            const voter = ethers.Wallet.createRandom();
            conservativeVoters.push(voter);

            // Fund the voter waller with some Ether
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"),
            });
            await tx.wait();

            // Add the voter to the election
            constituencyName = ethers.encodeBytes32String("Constituency" + 53)
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }

        // Labour Voters
        const labourVoters = []
        // Add 26 votes to each of the following constituencies 55th - 64th
        for (let i = 0; i < 11; i++) {
            for (let j = 0; j < 26; j++) {
                const voter = ethers.Wallet.createRandom();
                labourVoters.push(voter);

                // Fund the voter waller with some Ether
                const tx = await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005"),
                });
                await tx.wait();

                // Add the voter to the election
                constituencyName = ethers.encodeBytes32String("Constituency" + (i+54))
                await expect(election.addVoter(voter.address, constituencyName))
                    .to.emit(election, "VoterAdded")
                    .withArgs(voter.address, constituencyName);
            }
        }
        // Add an extra voter to the 65th constituency
        voter = ethers.Wallet.createRandom();
        labourVoters.push(voter);

        // Fund the voter waller with some Ether
        let tx = await admin.sendTransaction({
            to: voter.address,
            value: ethers.parseEther("0.005"),
        });
        await tx.wait();

        // Add the voter to the election
        constituencyName = ethers.encodeBytes32String("Constituency" + 64)
        await expect(election.addVoter(voter.address, constituencyName))
            .to.emit(election, "VoterAdded")
            .withArgs(voter.address, constituencyName);

        // Liberal Voters
        const liberalVoters = []
        // Add 11 voters to each of the following constituencies 55th - 62nd
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 11; j++) {
                const voter = ethers.Wallet.createRandom();
                liberalVoters.push(voter);

                // Fund the voter waller with some Ether
                const tx = await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005"),
                });
                await tx.wait();

                // Add the voter to the election
                constituencyName = ethers.encodeBytes32String("Constituency" + (i+54))
                await expect(election.addVoter(voter.address, constituencyName))
                    .to.emit(election, "VoterAdded")
                    .withArgs(voter.address, constituencyName);
            }
        }
        // Add 3 voters to the 63rd constituency
        for (let j = 0; j < 3; j++) {
            const voter = ethers.Wallet.createRandom();
            liberalVoters.push(voter);

            // Fund the voter waller with some Ether
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"),
            });
            await tx.wait();

            // Add the voter to the election
            constituencyName = ethers.encodeBytes32String("Constituency" + 62)
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }

        // Reform voters
        const reformVoters = []
        // Add 4 reform voters to each of the following constituencies 66th - 69th
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 4; j++) {
                const voter = ethers.Wallet.createRandom();
                reformVoters.push(voter);

                // Fund the voter waller with some Ether
                const tx = await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005"),
                });
                await tx.wait();

                // Add the voter to the election
                constituencyName = ethers.encodeBytes32String("Constituency" + (i+65))
                await expect(election.addVoter(voter.address, constituencyName))
                    .to.emit(election, "VoterAdded")
                    .withArgs(voter.address, constituencyName);
            }
        }
        // Add an extra reform voter to the 70th constituency
        voter = ethers.Wallet.createRandom();
        reformVoters.push(voter);

        // Fund the voter waller with some Ether
        tx = await admin.sendTransaction({
            to: voter.address,
            value: ethers.parseEther("0.005"),
        });
        await tx.wait();

        // Add the voter to the election
        constituencyName = ethers.encodeBytes32String("Constituency" + 69)
        await expect(election.addVoter(voter.address, constituencyName))
            .to.emit(election, "VoterAdded")
            .withArgs(voter.address, constituencyName);

        // Start the election
        await election.startElection();

        // Elect 54 conservative constituencies with 5 party conservative votes
        // in each of the following constituencies 1st - 53rd and 36 votes in
        // the 54th constituency
        let conservativeIndex = 0;
        for (let i = 0; i < 53; i++) {
            for (let j = 0; j < 5; j++) {
                const voterWallet = conservativeVoters[conservativeIndex].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(party1, party1))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, party1, party1);

                conservativeIndex += 1;
            }
        }
        // Add 36 votes to the 54th constituency
        for (let i = 0; i < 36; i++) {
            const voterWallet = conservativeVoters[conservativeIndex].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(party1, party1))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, party1, party1);

                conservativeIndex += 1;
        }

        // Elect 11 labour constituencies with 26 party labour votes in each of
        // the following constituencies 55th - 64th and 27 votes in the 65th
        // constituency
        let labourIndex = 0;
        for (let i = 0; i < 11; i++) {
            for (let j = 0; j < 26; j++) {
                const voterWallet = labourVoters[labourIndex].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(party2, party2))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, party2, party2);

                labourIndex += 1;
            }
        }
        // Add an extra vote to the 65th constituency to take the total to 27 votes
        let voterWallet = labourVoters[labourIndex].connect(ethers.provider);

        await expect(election.connect(voterWallet).castVote(party2, party2))
            .to.emit(election, "VoteCast")
            .withArgs(voterWallet.address, party2, party2);

        labourIndex += 1;

        // Add 91 liberal votes without electing any candidates to acheive
        // popular representation of 13% by adding 11 votes to the 55th - 62nd
        // constituencies and 3 votes to the 63rd constituency
        let liberalIndex = 0;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 11; j++) {
                const voterWallet = liberalVoters[liberalIndex].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(party3, party3))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, party3, party3);

                liberalIndex += 1;
            }
        }
        // Add 3 liberal votes to the 63rd constituency
        for (let j = 0; j < 3; j++) {
            const voterWallet = liberalVoters[liberalIndex].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(party3, party3))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, party3, party3);

                liberalIndex += 1;
        }

        // Elect 5 reform seats with 4 votes in the 66th - 69th constituencies
        // and 5 votes in the 70th constituency
        let reformIndex = 0;
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 4; j++) {
                const voterWallet = reformVoters[reformIndex].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(party4, party4))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, party4, party4);

                reformIndex += 1;
            }
        }
        // Add an extra reform vote to the 70th constituency
        voterWallet = reformVoters[reformIndex].connect(ethers.provider);

        await expect(election.connect(voterWallet).castVote(party4, party4))
            .to.emit(election, "VoteCast")
            .withArgs(voterWallet.address, party4, party4);

        reformIndex += 1;

        // End the election
        tx = await election.endElection();
        const result = await tx.wait();
        const eventLog = result.logs;

        // // Print the fragment name and index of each event in the log
        // eventLog.forEach((log, index) => {
        //     console.log(`Index: ${index}, Event: ${log.fragment.name}`);
        // });

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // All Constituency Winners Calcualted Event
        expect(eventLog[75].fragment.name).to.equal("AllConstituencyWinnersCalculated");

        // Additional Seats Allocated Event
        expect(eventLog[76].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[76].args[0]).to.equal(party2);
        expect(eventLog[76].args[1]).to.equal(23);

        // Additional Seats Allocated Event
        expect(eventLog[77].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[77].args[0]).to.equal(party3);
        expect(eventLog[77].args[1]).to.equal(7);

        // All Additional Seats Allocated Event
        expect(eventLog[78].fragment.name).to.equal("AllAdditionalSeatsAllocated");

        // Election Results Calculated Event
        expect(eventLog[79].fragment.name).to.equal("ElectionResultsCalculated");

        // Party Results Event
        expect(eventLog[80].fragment.name).to.equal("PartyResults");
        expect(eventLog[80].args[0]).to.equal(party1);
        expect(eventLog[80].args[1]).to.equal(54);

        // Party Results Event
        expect(eventLog[81].fragment.name).to.equal("PartyResults");
        expect(eventLog[81].args[0]).to.equal(party2);
        expect(eventLog[81].args[1]).to.equal(34);

        // Party Results Event
        expect(eventLog[82].fragment.name).to.equal("PartyResults");
        expect(eventLog[82].args[0]).to.equal(party3);
        expect(eventLog[82].args[1]).to.equal(7);

        // Party Results Event
        expect(eventLog[83].fragment.name).to.equal("PartyResults");
        expect(eventLog[83].args[0]).to.equal(party4);
        expect(eventLog[83].args[1]).to.equal(5);

        // Election Winner
        expect(eventLog[84].fragment.name).to.equal("ElectionWinner");
        expect(eventLog[84].args[0]).to.equal(party1);
        expect(eventLog[84].args[1]).to.equal(54);
    })
})