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

describe("AMS", function () {

    before(async function () {
        constituencies = await readConstituencyNames("./test/UK-2024-Election-Results.csv");

        // Taken from the UK 2024 General Election
        partyNames = [
            ethers.encodeBytes32String("Conservative and Unionist Party"),
            ethers.encodeBytes32String("Labour Party"),
            ethers.encodeBytes32String("Liberal Democrats"),
            ethers.encodeBytes32String("Reform UK"),
            // ethers.encodeBytes32String("Green Party"),
            // ethers.encodeBytes32String("Scottish National Party"),
            // ethers.encodeBytes32String("Plaid Cymru"),
            // ethers.encodeBytes32String("Democratic Unionist Party"),
            // ethers.encodeBytes32String("Sinn Fein"),
            // ethers.encodeBytes32String("Social Democratic and Labour Pa"),
            // ethers.encodeBytes32String("Ulster Unionist Party"),
            // ethers.encodeBytes32String("Alliance Party of Nortern Irela"),
        ];
    })

    this.beforeEach(async function () {
        // Get the signers: the deployer will act as admin and another account as a voter
        [admin, voter, voter2, voter3, voter4] = await ethers.getSigners();

        // Deploy the AMS contract
        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(100, 70);
        await election.waitForDeployment();

        // Add the partys for the popular vote
        for (let i = 0; i < partyNames.length; i++) {
            await election.addParty(partyNames[i]);
        }

        // Add 70 constituencies
        for (let i = 0; i < 70; i++) {
            await election.addConstituency(constituencies[i].constituencyName, partyNames);
        }
    })

    it("should return the number of seats", async function () {
        const numberOfSeats = await election.getNumberOfSeats();
        expect(numberOfSeats).to.equal(100);
    })

    it("should return the number of constituencies", async function () {
        const numberOfConstituencies = await election.getNumberOfConstituencies();
        expect(numberOfConstituencies).to.equal(70);
    })

    it("should return the parties for the popular vote", async function () {
        const parties = await election.getPartyNames();
        expect(parties.length).to.equal(partyNames.length);

        for (let i = 0; i < partyNames.length; i++) {
            expect(parties[i]).to.equal(partyNames[i]);
        }
    });

    it("should return the constituencies", async function () {
        const constituencyNames = await election.getConstituencyNames();
        expect(constituencyNames.length).to.equal(70);

        for (let i = 0; i < 70; i++) {
            expect(constituencyNames[i]).to.equal(constituencies[i].constituencyName);
        }
    })

    it("should return the candidates for each constituency", async function () {
        for (let i = 0; i < 100; i++) {
            const constituencyCandidates = await election.getCandidateNamesByConstituency(constituencies[i].constituencyName);

            for (let j = 0; j < partyNames.length; j++) {
                expect(constituencyCandidates[j]).to.equal(partyNames[j]);
            }
        }
    })

    it("should add a voter sucessfully", async function () {
        // Admin gives the right to vote to the voter with a specific constituency.
        await election.giveRightToVote(voter.address, constituencies[0].constituencyName);

        // Retrieve voter information from the contract
        const voterInfo = await election.voters(voter.address);
        
        // Ensure the constituency is set correctly
        expect(voterInfo.constituency).to.equal(constituencies[0].constituencyName);
        // The voter should not have voted yet
        expect(voterInfo.voted).to.equal(false);
    })

    it("should retrieve the voters constituency", async function () {
        // Admin gives the right to vote to the voter with a specific constituency.
        await election.giveRightToVote(voter.address, constituencies[0].constituencyName);

        // Retrieve voter information from the contract
        const voterConstituency = await election.getVoterConstituency(voter.address);

        expect(voterConstituency).to.equal(constituencies[0].constituencyName);
    })

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
        await election.giveRightToVote(voter.address, constituencies[0].constituencyName)

        await election.connect(voter).vote(0, 0)

        const constituencyCandidates = await election.getCandidatesByConstituency(constituencies[0].constituencyName)

        // Confirm constituency vote
        expect(constituencyCandidates[0].voteCount).to.equal(1);

        const partys = await election.getPartys()

        expect(partys[0].voteCount).to.equal(1);
    })

    it("simulate example election", async function () {
        // Test of an example AMS election from
        // https://en.wikipedia.org/wiki/Additional-member_system
        const signers = await ethers.getSigners();

        // Elect 54 Conservative constituencies with 5 party Conservative votes
        // in each of the following constituencies 1st - 53rd and 36 votes in
        // the 54th constituency
        for (let i = 0; i < 53; i++) {
            for (let j = 0; j < 5; j++) {
                const voter = ethers.Wallet.createRandom().connect(ethers.provider);
                await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005")
                });

                // Add 5 votes for conservative party for the first 53 constituencies
                await election.giveRightToVote(voter.address, constituencies[i].constituencyName);
                await election.connect(voter).vote(0, 0)
            }
        }

        // Add 36 votes to the 54th constituency
        for (let i = 0; i < 36; i++) {
            const voter = ethers.Wallet.createRandom().connect(ethers.provider);
            await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005")
            });
            await election.giveRightToVote(voter.address, constituencies[53].constituencyName);
            await election.connect(voter).vote(0, 0)
        }

        // Confirm votes have been allocated for the conservative candidates
        for (let i = 0; i < 53; i++) {
            // Get candidates for current constituency
            const constituencyCandidates = await election.getCandidatesByConstituency(constituencies[i].constituencyName)

            // Conservative votes should equal 5
            expect(constituencyCandidates[0].voteCount).to.equal(5);
            expect(constituencyCandidates[1].voteCount).to.equal(0);
            expect(constituencyCandidates[2].voteCount).to.equal(0);
            expect(constituencyCandidates[3].voteCount).to.equal(0);
        }

        let constituencyCandidates = await election.getCandidatesByConstituency(constituencies[53].constituencyName)
        // Conservative votes should equal 36
        expect(constituencyCandidates[0].voteCount).to.equal(36);
        expect(constituencyCandidates[1].voteCount).to.equal(0);
        expect(constituencyCandidates[2].voteCount).to.equal(0);
        expect(constituencyCandidates[3].voteCount).to.equal(0);


        // Elect 11 Labour constituencies with 26 party Labour votes in each of
        // the following constituencies 55th - 64th and 27 votes in the 65th
        // constituency
        for (let i = 0; i < 11; i++) {
            for (let j = 0; j < 26; j++) {
                const voter = ethers.Wallet.createRandom().connect(ethers.provider);
                await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005")
                });

                // Add vote for Labour party for the 55th - 65th constituencies
                await election.giveRightToVote(voter.address, constituencies[i+54].constituencyName);
                await election.connect(voter).vote(1, 1)
            }
        }

        // Add an extra vote to the 65th constituency to take total to 27 votes
        let voter = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({
            to: voter.address,
            value: ethers.parseEther("0.005")
        });
        await election.giveRightToVote(voter.address, constituencies[64].constituencyName);
        await election.connect(voter).vote(1, 1)

        // Confirm votes have been allocated for the labour candidates
        for (let i = 0; i < 10; i++) {
            // Get candidates for current constituency
            const constituencyCandidates = await election.getCandidatesByConstituency(constituencies[i+54].constituencyName)

            // Labour votes should equal 26
            expect(constituencyCandidates[0].voteCount).to.equal(0);
            expect(constituencyCandidates[1].voteCount).to.equal(26);
            expect(constituencyCandidates[2].voteCount).to.equal(0);
            expect(constituencyCandidates[3].voteCount).to.equal(0);
        }

        constituencyCandidates = await election.getCandidatesByConstituency(constituencies[64].constituencyName)
        // Labour votes should equal 27
        expect(constituencyCandidates[0].voteCount).to.equal(0);
        expect(constituencyCandidates[1].voteCount).to.equal(27);
        expect(constituencyCandidates[2].voteCount).to.equal(0);
        expect(constituencyCandidates[3].voteCount).to.equal(0);

        // Add 91 Liberal votes without electing any candidates to acheive
        // popular representation of 13% by adding 11 votes to the 55th - 62nd
        // constituencies and 3 votes to the 63rd constituency
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 11; j++) {
                const voter = ethers.Wallet.createRandom().connect(ethers.provider);
                await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005")
                });

                // Add vote for Liberal party for the 55th - 62nd constituencies
                await election.giveRightToVote(voter.address, constituencies[i+54].constituencyName);
                await election.connect(voter).vote(2, 2)
            }
        }

        // Add 3 liberal votes to the 63rd constituency
        for (let j = 0; j < 3; j++) {
            const voter = ethers.Wallet.createRandom().connect(ethers.provider);
            await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005")
            });

            // Add vote for Liberal party for the 55th - 62nd constituencies
            await election.giveRightToVote(voter.address, constituencies[62].constituencyName);
            await election.connect(voter).vote(2, 2)
        }

        // Confirm votes have been allocated for the liberal candidates
        for (let i = 0; i < 8; i++) {
            // Get candidates for current constituency
            const constituencyCandidates = await election.getCandidatesByConstituency(constituencies[i+54].constituencyName)

            // Liberal votes should equal 11
            expect(constituencyCandidates[0].voteCount).to.equal(0);
            expect(constituencyCandidates[1].voteCount).to.equal(26);
            expect(constituencyCandidates[2].voteCount).to.equal(11);
            expect(constituencyCandidates[3].voteCount).to.equal(0);
        }

        constituencyCandidates = await election.getCandidatesByConstituency(constituencies[62].constituencyName)
        // Liberal votes should equal 3
        expect(constituencyCandidates[0].voteCount).to.equal(0);
        expect(constituencyCandidates[1].voteCount).to.equal(26);
        expect(constituencyCandidates[2].voteCount).to.equal(3);
        expect(constituencyCandidates[3].voteCount).to.equal(0);
        
        // Elect 5 Reform seats with 4 votes in the 66th - 69th constituencies
        // and 5 votes in the 70th constituency
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 4; j++) {
                const voter = ethers.Wallet.createRandom().connect(ethers.provider);
                await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005")
                });

                // Add vote for Reform party for the 66th - 70th constituencies
                await election.giveRightToVote(voter.address, constituencies[i+65].constituencyName);
                await election.connect(voter).vote(3, 3)
            }
        }

        // Add an extra Reform vote to the 70th constituency
        voter = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({
            to: voter.address,
            value: ethers.parseEther("0.005")
        });
        await election.giveRightToVote(voter.address, constituencies[69].constituencyName);
        await election.connect(voter).vote(3, 3)

        // Confirm votes have been allocated for the reform candidates
        for (let i = 0; i < 4; i++) {
            // Get candidates for current constituency
            const constituencyCandidates = await election.getCandidatesByConstituency(constituencies[i+65].constituencyName)

            // Reform votes should equal 4
            expect(constituencyCandidates[0].voteCount).to.equal(0);
            expect(constituencyCandidates[1].voteCount).to.equal(0);
            expect(constituencyCandidates[2].voteCount).to.equal(0);
            expect(constituencyCandidates[3].voteCount).to.equal(4);
        }

        constituencyCandidates = await election.getCandidatesByConstituency(constituencies[69].constituencyName)
        // Reform votes should equal 5
        expect(constituencyCandidates[0].voteCount).to.equal(0);
        expect(constituencyCandidates[1].voteCount).to.equal(0);
        expect(constituencyCandidates[2].voteCount).to.equal(0);
        expect(constituencyCandidates[3].voteCount).to.equal(5);

        await election.endElection()

        // Confirm constituency seats and popular vote
        await election.calculateConstituencyWinners();
        await election.calculatePopularVote();

        let parties = await election.getPartys();

        // Confirm the constituency seats
        expect(parties[0].regionalSeats).to.equal(54);
        expect(parties[1].regionalSeats).to.equal(11);
        expect(parties[2].regionalSeats).to.equal(0);
        expect(parties[3].regionalSeats).to.equal(5);

        // Confirm the popular vote
        expect(parties[0].popularVote).to.equal(43);
        expect(parties[1].popularVote).to.equal(41);
        expect(parties[2].popularVote).to.equal(13);
        expect(parties[3].popularVote).to.equal(3);

        // Confirm the additional seats
        await election.calculateAdditionalSeats();
        parties = await election.getPartys();

        expect(parties[0].additionalSeats).to.equal(0);
        expect(parties[1].additionalSeats).to.equal(22);
        expect(parties[2].additionalSeats).to.equal(7);
        expect(parties[3].additionalSeats).to.equal(0);

        // Confirm the final number of seats
        await election.calculateFinalResults();
        parties = await election.getPartys();

        expect(parties[0].numberOfSeats).to.equal(54);
        expect(parties[1].numberOfSeats).to.equal(33);
        expect(parties[2].numberOfSeats).to.equal(7);
        expect(parties[3].numberOfSeats).to.equal(5);
    })


    
})