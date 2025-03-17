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

describe("Election", function () {
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
        Election = await ethers.getContractFactory("Election", admin);
        election = await Election.deploy(candidateNames);

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

    it("should cast a vote", async function () {
        await election.giveRightToVote(voter.address);

        await election.connect(voter).vote(0);

        const votersWhoHaveVoted = await election.getVotersWhoHaveVoted();
        expect(votersWhoHaveVoted).to.include(voter.address);

        await election.endElection();

        const electionWinner = await election.getElectionWinner();
        expect(electionWinner).to.equal(candidateNames[0]);
    })
})