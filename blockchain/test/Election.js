const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Election Contract", function () {
  let Election, election, admin, voter;

  beforeEach(async function () {
    // Get the signers: the deployer will act as admin and another account as a voter
    [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

    // Convert string values to bytes32 using ethers.utils.formatBytes32String
    const constituencyNames = [
      ethers.encodeBytes32String("Aberafan Maesteg"),
      ethers.encodeBytes32String("Aberdeen North")
    ];

    const candidateNames = [
      ethers.encodeBytes32String("Conservative and Unionist Party"),
      ethers.encodeBytes32String("Labour Party"),
      ethers.encodeBytes32String("Liberal Democrats"),
      ethers.encodeBytes32String("Reform UK"),
      ethers.encodeBytes32String("Green Party"),
    ];

    // Deploy the Election contract
    Election = await ethers.getContractFactory("Election", admin);
    election = await Election.deploy(constituencyNames, candidateNames);
    await election.waitForDeployment();
  });

  it("should add a voter successfully", async function () {
    // Admin gives the right to vote to the voter with a specific constituency.
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));

    // Retrieve voter information from the contract
    const voterInfo = await election.voters(voter.address);
    
    // Check that the voter has been assigned a weight of 1
    expect(voterInfo.weight).to.equal(1);
    // Ensure the constituency is set correctly
    expect(voterInfo.constituency).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"));
    // The voter should not have voted yet
    expect(voterInfo.voted).to.equal(false);
  });

  it("should retrieve the voters constituency", async function () {
    // Admin gives the right to vote to the voter with a specific constituency.
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));

    // Retrieve voter information from the contract
    const voterConstituency = await election.getVoterConstituency(voter.address);

    expect(voterConstituency).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"));
  });

  it("should return all eligible voters", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberdeen North"));

    const eligibleVoters = await election.getEligibleVoters();

    expect(eligibleVoters[0]).to.equal(voter.address);
    expect(eligibleVoters[1]).to.equal(voter2.address);
  })

  it("should return the constituency of all eligible voters", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberdeen North"));

    const voterConstituencies = await election.getEligibleVotersConstituencies();

    expect(voterConstituencies[0]).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"));
    expect(voterConstituencies[1]).to.equal(ethers.encodeBytes32String("Aberdeen North"));
  })

  it("should return the address and constituency of all eligible voters", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberdeen North"));

    const [eligibleVoters, voterConstituencies] = await election.getEligibleVotersAndConstituency();

    expect(eligibleVoters[0]).to.equal(voter.address);
    expect(eligibleVoters[1]).to.equal(voter2.address);

    expect(voterConstituencies[0]).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"));
    expect(voterConstituencies[1]).to.equal(ethers.encodeBytes32String("Aberdeen North"));
  })

  it("should return all the election constituencies", async function () {
    const constituencies = await election.getConstituencyNames();

    expect(constituencies[0]).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"));
    expect(constituencies[1]).to.equal(ethers.encodeBytes32String("Aberdeen North"));
  })

  it("should return the candidates for a constituency", async function () {
    const constituencyCandidates = await election.getCandidateNamesByConstituency(ethers.encodeBytes32String("Aberafan Maesteg"));

    expect(constituencyCandidates[0]).to.equal(ethers.encodeBytes32String("Conservative and Unionist Party"));
    expect(constituencyCandidates[1]).to.equal(ethers.encodeBytes32String("Labour Party"));
    expect(constituencyCandidates[2]).to.equal(ethers.encodeBytes32String("Liberal Democrats"));
    expect(constituencyCandidates[3]).to.equal(ethers.encodeBytes32String("Reform UK"));
    expect(constituencyCandidates[4]).to.equal(ethers.encodeBytes32String("Green Party"));
  })

  it("should end the election", async function () {
    await election.endElection();
    
    const electionStatus = await election.electionEnded();
    
    expect(electionStatus).to.equal(true);
  });

  it("should cast a vote", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    
    await election.connect(voter).vote(0);

    const constituencyCandidates = await election.getCandidatesByConstituency(ethers.encodeBytes32String("Aberafan Maesteg"));
    
    expect(constituencyCandidates[0].voteCount).to.equal(1);
    expect(constituencyCandidates[1].voteCount).to.equal(0);
    expect(constituencyCandidates[2].voteCount).to.equal(0);
    expect(constituencyCandidates[3].voteCount).to.equal(0);
    expect(constituencyCandidates[4].voteCount).to.equal(0);
  })

  it("should return all voters who have not voted", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberafan Maesteg"));

    const votersWhoHaveNotVoted = await election.getVotersWhoHaveNotVoted();

    expect(votersWhoHaveNotVoted[0]).to.equal(voter.address);
    expect(votersWhoHaveNotVoted[1]).to.equal(voter2.address);
  })

  it("should return all voters who have voted", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberafan Maesteg"));

    await election.connect(voter).vote(0);
    await election.connect(voter2).vote(0);

    const votersWhoHaveVoted = await election.getVotersWhoHaveVoted();

    expect(votersWhoHaveVoted[0]).to.equal(voter.address);
    expect(votersWhoHaveVoted[1]).to.equal(voter2.address);
  })
  
  it("should return the winner of a given constituency", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberafan Maesteg"));

    await election.connect(voter).vote(0);
    await election.connect(voter2).vote(0);

    await election.endElection();
    const constituencyWinner = await election.getConstituencyWinner(ethers.encodeBytes32String("Aberafan Maesteg"));

    expect(constituencyWinner).to.equal(ethers.encodeBytes32String("Conservative and Unionist Party"));
  })

  it("should return the overall winner of an election", async function () {
    await election.giveRightToVote(voter.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter2.address, ethers.encodeBytes32String("Aberafan Maesteg"));
    await election.giveRightToVote(voter3.address, ethers.encodeBytes32String("Aberdeen North"));
    await election.giveRightToVote(voter4.address, ethers.encodeBytes32String("Aberdeen North"));

    await election.connect(voter).vote(0) // Conservative - Aberafan
    await election.connect(voter2).vote(1) // Labour - Aberafan
    await election.connect(voter3).vote(0) // Conservative - Aberdeen
    await election.connect(voter4).vote(0) // Conservative - Aberdeen

    await election.endElection();

    const aberafanWinner = await election.getConstituencyWinner(ethers.encodeBytes32String("Aberafan Maesteg"));
    expect(aberafanWinner).to.equal(ethers.encodeBytes32String("Conservative and Unionist Party"));

    const aberdeenWinner = await election.getConstituencyWinner(ethers.encodeBytes32String("Aberdeen North"));
    expect(aberdeenWinner).to.equal(ethers.encodeBytes32String("Conservative and Unionist Party"));
    
    const electionWinner = await election.getElectionWinner();
    expect(electionWinner).to.equal(ethers.encodeBytes32String("Conservative and Unionist Party"));
  })
});
