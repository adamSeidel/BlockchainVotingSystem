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

describe("Election Contract", function () {
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

    // Get the signers: the deployer will act as admin and another account as a voter
    [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

    // Deploy the Election contract
    Election = await ethers.getContractFactory("Election", admin);
    election = await Election.deploy();

    for (let i = 0; i < constituencies.length; i++) {
      await election.addConstituency(constituencies[i].constituencyName, candidateNames);
    }

    await election.waitForDeployment();

    console.log("Begining Test")
  })

    it("should simulate an Aberafan Maesteg & Aberdeen North constituency vote", async function () {
        this.timeout(1000000);

        const votePromises = constituencies.slice(0, 2).map(async (constituency, index) => {
            console.log(`Simulating votes for ${ethers.decodeBytes32String(constituency.constituencyName)}`);
            
            for (let j = 0; j < constituency.votes.length; j++) {
            for (let i = 0; i < constituency.votes[j]; i++) {
                const voter = ethers.Wallet.createRandom().connect(ethers.provider);
                await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005")
                });

                await election.giveRightToVote(voter.address, constituency.constituencyName);
                await election.connect(voter).vote(j);
            }
            }

            // Retrieve the candidates for the constituency
            const candidates = await election.getCandidatesByConstituency(constituency.constituencyName);

            // Verify that the candidates have the right amount of votes
            for (let i = 0; i < candidates.length; i++) {
                expect(candidates[i].voteCount).to.equal(constituency.votes[i]);
            }

            console.log(`Finished simulating votes for ${ethers.decodeBytes32String(constituency.constituencyName)}`);
        });

        await Promise.all(votePromises);
    });


  after(async function () {
    it("should run after all tests have finished", async function () {
        // Add your test logic here
        console.log("All tests have finished.");
      });
  })
});
