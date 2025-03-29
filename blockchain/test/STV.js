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

describe("STV Election ", function () {
  let Election, election, admin, voter, constituencyNames, candidateNames;

  before(async function () {
      // Load the constituency names and candidate names
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

  this.beforeEach(async function () {
      // Get the signers: the deployer will act as admin and another account as voter
      [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

      // Deploy the contract
      Election = await ethers.getContractFactory("STV", admin);
      election = await Election.deploy(candidateNames, 3);

      await election.waitForDeployment();
  })

  it("should return the candidates for the election", async function () {
      const electionCandidates = await election.getElectionCandidates();

      for (let i = 0; i < electionCandidates.length; i++) {
          expect(electionCandidates[i].name).to.equal(candidateNames[i]);
      }
  })

  it("should give a voter the right to vote", async function () {
      await election.giveRightToVote(voter.address);

      const eligibleVoters = await election.getEligibleVoters();
      expect(eligibleVoters).to.include(voter.address);
  })

  it("should return the eligible voters", async function () {
      await election.giveRightToVote(voter.address);
      await election.giveRightToVote(voter2.address);
      await election.giveRightToVote(voter3.address);
      await election.giveRightToVote(voter4.address);

      const eligibleVoters = await election.getEligibleVoters();
      expect(eligibleVoters).to.include(voter.address);
      expect(eligibleVoters).to.include(voter2.address);
      expect(eligibleVoters).to.include(voter3.address);
      expect(eligibleVoters).to.include(voter4.address);
  })

  it("should end the election", async function () {
    await election.endElection();
  
    const electionStatus = await election.electionEnded();
    
    expect(electionStatus).to.equal(true);
  })

  it("should cast a vote", async function () {
    await election.giveRightToVote(voter.address);

    await election.connect(voter).vote([0, 1, 2, 3, 4]);

    const votersWhoHaveVoted = await election.getVotersWhoHaveVoted();
    expect(votersWhoHaveVoted).to.include(voter.address);

    const voterPreferences = await election.getVotersPreferences(voter.address);
    expect(voterPreferences).to.deep.equal([0, 1, 2, 3, 4]);
  })

  it("should return the voters who have voted", async function () {
    await election.giveRightToVote(voter.address);
    await election.giveRightToVote(voter2.address);
    await election.giveRightToVote(voter3.address);


    await election.connect(voter).vote([0, 1, 2, 3, 4]);
    await election.connect(voter2).vote([0, 1, 2, 3, 4]);

    const votersWhoHaveVoted = await election.getVotersWhoHaveVoted();
    expect(votersWhoHaveVoted).to.include(voter.address);
    expect(votersWhoHaveVoted).to.include(voter2.address);
    expect(votersWhoHaveVoted).to.not.include(voter3.address);
  })

  it("should return the voters who have not voted", async function () {
    await election.giveRightToVote(voter.address);
    await election.giveRightToVote(voter2.address);
    await election.giveRightToVote(voter3.address);

    await election.connect(voter).vote([0, 1, 2, 3, 4]);

    const votersWhoHaveNotVoted = await election.getVotersWhoHaveNotVoted();
    expect(votersWhoHaveNotVoted).to.include(voter2.address);
    expect(votersWhoHaveNotVoted).to.include(voter3.address);
    expect(votersWhoHaveNotVoted).to.not.include(voter.address);
  })

  it("should return the number of seats", async function () {
    const seats = await election.getNumberOfSeats();
    expect(seats).to.equal(3);
  })

  it("should return the droop quota", async function () {
    // Give 3 voters the right to vote
    await election.giveRightToVote(voter.address);
    await election.giveRightToVote(voter2.address);
    await election.giveRightToVote(voter3.address);

    // Cast votes for the 3 voters
    await election.connect(voter).vote([0, 1, 2, 3, 4]);
    await election.connect(voter2).vote([0, 1, 2, 3, 4]);
    await election.connect(voter3).vote([0, 1, 2, 3, 4]);

    // Calculate the droop quota
    const droopQuota = await election.getDroopQuota();
    // console.log(droopQuota);
    expect(droopQuota).to.equal(1)
  })

  it("should conduct a simple election", async function () {
    // 3 available seats

    await election.giveRightToVote(voter.address);
    await election.giveRightToVote(voter2.address);
    await election.giveRightToVote(voter3.address);
    await election.giveRightToVote(voter4.address);

    await election.connect(voter).vote([0, 1, 2, 3, 4]);
    await election.connect(voter2).vote([0, 1, 2, 3, 4]);
    await election.connect(voter3).vote([0, 1, 2, 3, 4]);
    await election.connect(voter4).vote([0, 1, 2, 3, 4]);

    await election.endElection();

    await election.calculateElectionWinner();

    const electedCandidates = await election.getElectedCandidates();
    // expect(electedCandidates).to.include(candidateNames[0]);
    // expect(electedCandidates).to.include(candidateNames[1]);
    // expect(electedCandidates).to.include(candidateNames[2]);
  })

  it("should conduct a more complex election", async function () {
    // Test of an exampe STV election from 
    // https://en.wikipedia.org/wiki/Droop_quota
    const signers = await ethers.getSigners();

    // Cast 45 votes of [Conservative, Labour, Liberal Democrats]
    for (let i = 0; i < 45; i++) {
      const voter = ethers.Wallet.createRandom().connect(ethers.provider);
      await admin.sendTransaction({
        to: voter.address,
        value: ethers.parseEther("0.005")
      });

      await election.giveRightToVote(voter.address);
      await election.connect(voter).vote([0, 1, 2]);
    }

    // Cast 20 votes of [Reform UK, Liberal Democrats, Conservative]
    for (let i = 0; i < 20; i++) {
      const voter = ethers.Wallet.createRandom().connect(ethers.provider);
      await admin.sendTransaction({
        to: voter.address,
        value: ethers.parseEther("0.005")
      });

      await election.giveRightToVote(voter.address);
      await election.connect(voter).vote([3, 2, 0]);
    }

    // Cast 25 votes of [Liberal, Reform UK, Conservative]
    for (let i = 0; i < 25; i++) {
      const voter = ethers.Wallet.createRandom().connect(ethers.provider);
      await admin.sendTransaction({
        to: voter.address,
        value: ethers.parseEther("0.005")
      });

      await election.giveRightToVote(voter.address);
      await election.connect(voter).vote([2, 3, 0]);
    }

    // Cast 10 votes of [Labour, Conservative, Liberal]
    for (let i = 0; i < 10; i++) {
      const voter = ethers.Wallet.createRandom().connect(ethers.provider);
      await admin.sendTransaction({
        to: voter.address,
        value: ethers.parseEther("0.005")
      });

      await election.giveRightToVote(voter.address);
      await election.connect(voter).vote([1, 0, 2]);
    }

    const numberOfSeats = await election.getNumberOfSeats();
    console.log("Number of Seats: ", numberOfSeats.toString());

    const totalVotes = await election.getNumberOfVotes();
    console.log("Total Votes: ", totalVotes.toString());

    const droopQuota = await election.getDroopQuota();
    console.log("Droop Quota: ", droopQuota.toString());

    // End the election
    await election.endElection();

    // Calculate the election winner
    await election.calculateElectionWinner();

    // Get the elected candidates
    const electedCandidates = await election.getElectedCandidates();
    console.log(ethers.decodeBytes32String(electedCandidates[0]));
    console.log(ethers.decodeBytes32String(electedCandidates[1]));
    console.log(ethers.decodeBytes32String(electedCandidates[2]));

  })





});
