const fs = require("fs");
const csv = require("csv-parser");
const { expect } = require("chai");
const { ethers } = require("hardhat");

function readConstituencyNames(file) {
  return new Promise((resolve, reject) => {
    const constituencies = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on('data', (row) => {
        if (row["Constituency name"]) {
          constituencies.push({
            constituencyName: ethers.encodeBytes32String(row["Constituency name"].substring(0, 31)),
            votes: [row["Con"], row["Lab"], row["LD"], row["RUK"], row["Green"], row["SNP"], row["PC"], row["DUP"], row["SF"], row["SDLP"], row["UUP"], row["APNI"]]
          })
        }
      })
      .on('end', () => resolve(constituencies))
      .on('error', (error) => reject(error));
  });
}

describe("FPTP Contract", function () {
  let Election, election, admin, voter, constituencyNames, candidateNames;
  
  before(async function () {
    constituencies = await readConstituencyNames("./test/UK-2024-Election-Results.csv");

    // Taken from the UK 2024 General Election
    candidateNames = [
      ethers.encodeBytes32String("Conservative and Unionist Party"),
      ethers.encodeBytes32String("Labour Party"),
      ethers.encodeBytes32String("Liberal Democrats"),
      ethers.encodeBytes32String("Reform UK"),
      ethers.encodeBytes32String("Green Party"),
      ethers.encodeBytes32String("Scottish National Party"),
      ethers.encodeBytes32String("Plaid Cymru"),
      ethers.encodeBytes32String("Democratic Unionist Party"),
      ethers.encodeBytes32String("Sinn Fein"),
      ethers.encodeBytes32String("Social Democratic and Labour Pa"),
      ethers.encodeBytes32String("Ulster Unionist Party"),
      ethers.encodeBytes32String("Alliance Party of Nortern Irela"),
    ];
  })

  beforeEach(async function () {
    // Get the signers: the deployer will act as admin and another account as a voter
    [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

    // Deploy the Election contract
    Election = await ethers.getContractFactory("FPTP", admin);
    election = await Election.deploy();

    for (let i = 0; i < constituencies.length; i++) {
      await election.addConstituency(constituencies[i].constituencyName, candidateNames);
    }

    await election.waitForDeployment();
  });

  // Pass
  it("should return all the election constituencies", async function () {
    const constituencyNames = await election.getConstituencyNames();
    expect(constituencyNames.length).to.equal(650);

    for (let i = 0; i < constituencyNames.length; i++) {
      expect(constituencyNames[i]).to.equal(constituencies[i].constituencyName);
    }
  })

  it("should return the candidates for each constituency", async function () {
    for (let i = 0; i < constituencies.length; i++) {
      const constituencyCandidates = await election.getCandidateNamesByConstituency(constituencies[i].constituencyName);

      for (let j = 0; j < candidateNames.length; j++) {
        expect(constituencyCandidates[j]).to.equal(candidateNames[j]);
      }
    }
  })

  // it("should simulate an Aberafan Maesteg constituency vote", async function () {
  //   this.timeout(1000000);

  //   const signers = await ethers.getSigners();

  //   for (let j = 0; j < constituencies[0].votes.length; j++) {
  //     for (let i = 0; i < constituencies[0].votes[j]; i++) {
  //       const voter = ethers.Wallet.createRandom().connect(ethers.provider);
  //       await admin.sendTransaction({
  //         to: voter.address,
  //         value: ethers.parseEther("0.005")
  //       });

  //       await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
  //       await election.connect(voter).vote(j);
  //     }
  //   }

  //   // Retrieve the candidates for the first constituency
  //   const candidates = await election.getCandidatesByConstituency(constituencies[0].constituencyName);

  //   // Verify that the candidates have the right amount of votes
  //   for (let i = 0; i < candidates.length; i++) {
  //     expect(candidates[i].voteCount).to.equal(constituencies[0].votes[i]);
  //   }

  //   // Verify that the winner is the Labour party
  //   await election.endElection();
  //   const constituencyWinner = await election.getConstituencyWinner(constituencies[0].constituencyName);

  //   expect(constituencyWinner).to.equal(ethers.encodeBytes32String("Labour Party"));
  // })

  // it("should simulate an Aberdeen North constituency vote", async function () {
  //   this.timeout(1000000);

  //   const signers = await ethers.getSigners();

  //   for (let j = 0; j < constituencies[1].votes.length; j++) {
  //     for (let i = 0; i < constituencies[1].votes[j]; i++) {
  //       const voter = ethers.Wallet.createRandom().connect(ethers.provider);
  //       await admin.sendTransaction({
  //         to: voter.address,
  //         value: ethers.parseEther("0.005")
  //       });

  //       await election.giveRightToVote(voter.address, constituencies[1].constituencyName);
  //       await election.connect(voter).vote(j);
  //     }
  //   }

  //   // Retrieve the candidates for the first constituency
  //   const candidates = await election.getCandidatesByConstituency(constituencies[1].constituencyName);

  //   // Verify that the candidates have the right amount of votes
  //   for (let i = 0; i < candidates.length; i++) {
  //     expect(candidates[i].voteCount).to.equal(constituencies[1].votes[i]);
  //   }

  //   // Verify that the winner is the Labour party
  //   await election.endElection();
  //   const constituencyWinner = await election.getConstituencyWinner(constituencies[1].constituencyName);

  //   expect(constituencyWinner).to.equal(ethers.encodeBytes32String("Scottish National Party"));
  // })

  it("should add a voter successfully", async function () {
    // Admin gives the right to vote to the voter with a specific constituency.
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);

    // Retrieve voter information from the contract
    const voterInfo = await election.voters(voter.address);
    
    // Check that the voter has been assigned a weight of 1
    expect(voterInfo.weight).to.equal(1);
    // Ensure the constituency is set correctly
    expect(voterInfo.constituency).to.equal(constituencies[0].constituencyName);
    // The voter should not have voted yet
    expect(voterInfo.voted).to.equal(false);
  });

  it("should retrieve the voters constituency", async function () {
    // Admin gives the right to vote to the voter with a specific constituency.
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);

    // Retrieve voter information from the contract
    const voterConstituency = await election.getVoterConstituency(voter.address);

    expect(voterConstituency).to.equal(constituencies[0].constituencyName);
  });

  it("should return all eligible voters", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[1].constituencyName);

    const eligibleVoters = await election.getEligibleVoters();

    expect(eligibleVoters[0]).to.equal(voter.address);
    expect(eligibleVoters[1]).to.equal(voter2.address);
  })

  it("should return the constituency of all eligible voters", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[1].constituencyName);

    const voterConstituencies = await election.getEligibleVotersConstituencies();

    expect(voterConstituencies[0]).to.equal(constituencies[0].constituencyName);
    expect(voterConstituencies[1]).to.equal(constituencies[1].constituencyName);
  })

  it("should return the address and constituency of all eligible voters", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[1].constituencyName);

    const [eligibleVoters, voterConstituencies] = await election.getEligibleVotersAndConstituency();

    expect(eligibleVoters[0]).to.equal(voter.address);
    expect(eligibleVoters[1]).to.equal(voter2.address);

    expect(voterConstituencies[0]).to.equal(constituencies[0].constituencyName);
    expect(voterConstituencies[1]).to.equal(constituencies[1].constituencyName);
  })

  it("should end the election", async function () {
    await election.endElection();
    
    const electionStatus = await election.electionEnded();
    
    expect(electionStatus).to.equal(true);
  });

  it("should cast a vote", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    
    await election.connect(voter).vote(0);

    const constituencyCandidates = await election.getCandidatesByConstituency(constituencies[0].constituencyName);
    
    expect(constituencyCandidates[0].voteCount).to.equal(1);
    expect(constituencyCandidates[1].voteCount).to.equal(0);
    expect(constituencyCandidates[2].voteCount).to.equal(0);
    expect(constituencyCandidates[3].voteCount).to.equal(0);
    expect(constituencyCandidates[4].voteCount).to.equal(0);
  })

  it("should return all voters who have not voted", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[0].constituencyName);

    const votersWhoHaveNotVoted = await election.getVotersWhoHaveNotVoted();

    expect(votersWhoHaveNotVoted[0]).to.equal(voter.address);
    expect(votersWhoHaveNotVoted[1]).to.equal(voter2.address);
  })

  it("should return all voters who have voted", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[0].constituencyName);

    await election.connect(voter).vote(0);
    await election.connect(voter2).vote(0);

    const votersWhoHaveVoted = await election.getVotersWhoHaveVoted();

    expect(votersWhoHaveVoted[0]).to.equal(voter.address);
    expect(votersWhoHaveVoted[1]).to.equal(voter2.address);
  })
  
  it("should return the winner of a given constituency", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[0].constituencyName);

    await election.connect(voter).vote(0);
    await election.connect(voter2).vote(0);

    await election.endElection();
    const constituencyWinner = await election.getConstituencyWinner(constituencies[0].constituencyName);

    expect(constituencyWinner).to.equal(ethers.encodeBytes32String("Conservative and Unionist Party"));
  })

  it("should return the overall winner of an election", async function () {
    await election.giveRightToVote(voter.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter2.address, constituencies[0].constituencyName);
    await election.giveRightToVote(voter3.address, constituencies[1].constituencyName);
    await election.giveRightToVote(voter4.address, constituencies[1].constituencyName);

    await election.connect(voter).vote(0) // Conservative - Aberafan
    await election.connect(voter2).vote(1) // Labour - Aberafan
    await election.connect(voter3).vote(0) // Conservative - Aberdeen
    await election.connect(voter4).vote(0) // Conservative - Aberdeen

    await election.endElection();

    const aberafanWinner = await election.getConstituencyWinner(constituencies[0].constituencyName);
    expect(aberafanWinner).to.equal(candidateNames[0]);

    const aberdeenWinner = await election.getConstituencyWinner(constituencies[1].constituencyName);
    expect(aberdeenWinner).to.equal(candidateNames[0]);
    
    const electionWinner = await election.getElectionWinner();
    expect(electionWinner).to.equal(candidateNames[0]);
  })
});
