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
            .withArgs(voter.address);
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
            .withArgs(voter.address);
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
            .withArgs(voter.address);
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
            .withArgs(voter.address);

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
            .withArgs(voter.address);
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
            .withArgs(voter.address);
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
            .withArgs(voter.address);
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