/// *** Tests need to be ran individually due to memory requirements ***
const fs = require("fs");
const csv = require("csv-parser");
const { expect } = require("chai");
const { ethers } = require("hardhat");

function readConstituencyData(file) {
  return new Promise((resolve, reject) => {
    const constituencies = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on('data', (row) => {
        if (row["Constituency name"]) {
          constituencies.push({
            constituencyName: ethers.encodeBytes32String(row["Constituency name"].substring(0, 31)),
            votes: [Number(row["Con"]), Number(row["Lab"]), Number(row["LD"]), Number(row["RUK"]), Number(row["Green"]), Number(row["SNP"]), Number(row["PC"]), Number(row["DUP"]), Number(row["SF"]), Number(row["SDLP"]), Number(row["UUP"]), Number(row["APNI"])]
          })
        }
      })
      .on('end', () => resolve(constituencies))
      .on('error', (error) => reject(error));
  });
}

function winningCandidateIndex(voteArr) {
    let maxIndex = 0
    for (let i = 0; i < voteArr.length; i++) {
        if (voteArr[i] > voteArr[maxIndex]) {
            maxIndex = i
        }
    }
    return maxIndex;
}

describe.skip("First Past the Post - Simulate an Aberafan Maesteg constituency election", function () {
    // Uses the FPTP contract to simlate a single constituency election using
    // data from the Uk general election. This is used to determine the average
    // gas cost and time requirements for adding voters and casting a vote
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("FPTP", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Simulate an Aberafan Maesteg constituency election vote", async function () {
        this.timeout(1000000);

        // Add the Aberafan Maesteg Constituency
        const constituencyName = constituencyData[0].constituencyName
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);

        // Add the election candidates
        for (let i = 0; i < candidateNames.length; i++) {
            await expect(election.addConstituencyCandidate(candidateNames[i], candidateNames[i], constituencyName))
                .to.emit(election, "CandidateAdded")
                .withArgs(candidateNames[i], candidateNames[i], constituencyName);
        }

        // Add voters to the constituency
        const constiteuncyVotes = constituencyData[0].votes;
        let totalNumberOfVoters = 0

        for (let i = 0; i < constiteuncyVotes.length; i++) {
            totalNumberOfVoters += parseInt(constiteuncyVotes[i])
        }

        console.time("AddVoters")
        let voters = [];

        for (let i = 0; i < totalNumberOfVoters; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            voters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }
        console.timeEnd("AddVoters")

        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");


        console.time("Cast Votes")

        let k = 0

        // Cast Votes
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(candidateNames[i]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, candidateNames[i]);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Cast Votes")

        console.time("End Election")
        const tx = await election.endElection()
        console.timeEnd("End Election")

        const results = await tx.wait()
        const eventLog = results.logs

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Aberafan Maesteg Constituency Winner Event
        expect(eventLog[1].fragment.name).to.equal("ConstituencyWinner")
        expect(eventLog[1].args[0]).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"))
        expect(eventLog[1].args[1]).to.equal(ethers.encodeBytes32String("Labour Party"))
        expect(eventLog[1].args[2]).to.equal(ethers.encodeBytes32String("Labour Party"))
        
        // All Constituency Winners Calculated Event
        expect(eventLog[2].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Election Results Calculated Event
        expect(eventLog[3].fragment.name).to.equal("ElectionResultsCalculated")

        // Election Winner Event
        expect(eventLog[eventLog.length - 1].fragment.name).to.equal("ElectionWinner")
        expect(eventLog[eventLog.length - 1].args[0]).to.equal(ethers.encodeBytes32String("Labour Party"))
        expect(eventLog[eventLog.length - 1].args[1]).to.equal(1)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("First Past the Post - Simulating a full general election", function () {
    // This uses the FPTPSimulation contract which allows a single voter to add
    // more than one vote to a candidate to speed up the election process by
    // avoiding having to add 27,720,244 voters and cast the same number of
    // votes when simulating a general election. This is then used to estimate
    // the gas costs associated with caluclating the final results of a full
    // scale election using Uk general election data.
    let constituencyData;
    
    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("FPTPSimulation", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Simulate a full Uk General Election", async function () {
        this.timeout(1000000);

        // Voters array
        let voters = [];

        console.time("Add Constituencies")
        // Add all the election constiuencies
        for (let i = 0; i < constituencyData.length; i++) {
            // Add the constituency
            const constituencyName = constituencyData[i].constituencyName
            await expect(election.addConstituency(constituencyName))
                .to.emit(election, "ConstituencyAdded")
                .withArgs(constituencyName);
        }
        console.timeEnd("Add Constituencies")

        console.time("Add Candidates")
        for (let i = 0; i < constituencyData.length; i++) {
            const constituencyName = constituencyData[i].constituencyName
            // Add the candidates to the constituency
            for (let j = 0; j < candidateNames.length; j++) {
                await expect(election.addConstituencyCandidate(candidateNames[j], candidateNames[j], constituencyName))
                    .to.emit(election, "CandidateAdded")
                    .withArgs(candidateNames[j], candidateNames[j], constituencyName);
            }
        }
        console.timeEnd("Add Candidates")

        for (let i = 0; i < constituencyData.length; i++) {
            const constituencyName = constituencyData[i].constituencyName
            // Add the votes to each constituency
            for (let j = 0; j < candidateNames.length; j++) {
                const voter = ethers.Wallet.createRandom();
                voters.push(voter);

                // Fund the voter wallet with some Ether
                const tx = await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005"),
                });
                await tx.wait();

                // Add the voter to the election
                await expect(election.addVoter(voter.address, constituencyName))
                    .to.emit(election, "VoterAdded")
                    .withArgs(voter.address, constituencyName);
            }
        }

        console.time("Start Election")
        // Start the election
        await election.startElection();
        console.timeEnd("Start Election")

        // Voter index
        k = 0;

        // Cast votes in each constituency
        for (let i = 0; i < constituencyData.length; i++) {
            // Cast vote for each candidate of the correct size
            for (let j = 0; j < candidateNames.length; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Candidate name, Size of vote
                await expect(election.connect(voterWallet).castVote(candidateNames[j], constituencyData[i].votes[j]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, candidateNames[j]);
                
                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }

        // End the election
        console.time("Calculate Election Results")
        const tx = await election.endElection();
        console.timeEnd("Calculate Election Results")

        const results = await tx.wait();
        const eventLog = results.logs;

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Constiuency Winner Events
        for (let i = 0; i < constituencyData.length; i++) {
            // Index of the winning party in this constituency
            const constiteuncyWinningCandidateIndex = winningCandidateIndex(constituencyData[i].votes)

            expect(eventLog[i+1].fragment.name).to.equal("ConstituencyWinner");
            expect(eventLog[i+1].args[0]).to.equal(constituencyData[i].constituencyName)
            expect(eventLog[i+1].args[1]).to.equal(candidateNames[constiteuncyWinningCandidateIndex])
            expect(eventLog[i+1].args[2]).to.equal(candidateNames[constiteuncyWinningCandidateIndex])
        }

        // All Constituency Winners Calculated Event
        expect(eventLog[651].fragment.name).to.equal("AllConstituencyWinnersCalculated");

        // Election Results Calculated Event
        expect(eventLog[652].fragment.name).to.equal("ElectionResultsCalculated");

        // Party Results Events
        for (let i = 0; i < candidateNames.length; i++) {
            // Calculate the number of seats the party should have won
            let numberOfSeats = 0
            for (let j = 0; j < constituencyData.length; j++) {
                constiteuncyWinningCandidateIndex = winningCandidateIndex(constituencyData[j].votes)
                if (constiteuncyWinningCandidateIndex == i) {
                    numberOfSeats += 1;
                }
            }

            // Verify that the party has the correct number of elected seats
            expect(eventLog[i+653].fragment.name).to.equal("PartyResults");
            expect(eventLog[i+653].args[0]).to.equal(candidateNames[i]);
            expect(eventLog[i+653].args[1]).to.equal(numberOfSeats);
        }

        // Election Winner Event
        // Determine the election winner
        // Index of the winning party
        let winningParty = 0;
        // Number of seats of the winning party
        let maxSeats = 0;
        // Iterate the election parties
        for (let i = 0; i < candidateNames.length; i++) {
            // Number of seats for current party
            let numberOfSeats = 0
            // Calculate the number of seats the current party has won
            for (let j = 0; j < constituencyData.length; j++) {
                constiteuncyWinningCandidateIndex = winningCandidateIndex(constituencyData[j].votes)
                if (constiteuncyWinningCandidateIndex == i) {
                    numberOfSeats += 1;
                }
            }

            // New winning party seen
            if (numberOfSeats > maxSeats) {
                // Record new winning party index
                winningParty = i;
                // Record number of seats won by winning party
                maxSeats = numberOfSeats
            }
        }

        // Confirm the election winner event
        expect(eventLog[665].fragment.name).to.equal("ElectionWinner");
        expect(eventLog[665].args[0]).to.equal(candidateNames[winningParty]);
        expect(eventLog[665].args[1]).to.equal(maxSeats);

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("First Past the Post - Simulating an Aberafan Maesteg constitunecy election with amended votes", function () {
    // Uses the FPTP contract to simlate a single constituency election using
    // data from the Uk general election. This is used to determine the average
    // gas cost and time requirements for adding voters and casting a vote. 
    // Each vote is cast to a random value before being amended to acertain
    // the cost of amending votes
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("FPTPAmend", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })
    
    it("Simulate an Aberafan Maesteg constituency election vote", async function () {
        this.timeout(1000000);

        // Add the Aberafan Maesteg Constituency
        const constituencyName = constituencyData[0].constituencyName
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);

        // Add the election candidates
        for (let i = 0; i < candidateNames.length; i++) {
            await expect(election.addConstituencyCandidate(candidateNames[i], candidateNames[i], constituencyName))
                .to.emit(election, "CandidateAdded")
                .withArgs(candidateNames[i], candidateNames[i], constituencyName);
        }

        // Add voters to the constituency
        const constiteuncyVotes = constituencyData[0].votes;
        let totalNumberOfVoters = 0

        for (let i = 0; i < constiteuncyVotes.length; i++) {
            totalNumberOfVoters += parseInt(constiteuncyVotes[i])
        }

        console.time("AddVoters")
        let voters = [];

        for (let i = 0; i < totalNumberOfVoters; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            voters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }
        console.timeEnd("AddVoters")

        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");


        console.time("Cast Votes")

        let k = 0

        // Cast a flase vote to later be amended
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(candidateNames[0]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, candidateNames[0]);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Cast Votes")

        console.time("Amend Votes")

        k = 0

        // Cast the correct votes by amending them
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                await expect(election.connect(voterWallet).castVote(candidateNames[i]))
                    .to.emit(election, "VoteAmended")
                    .withArgs(voterWallet.address, candidateNames[i]);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Amend Votes")

        console.time("Calculate Election Results");
        const tx = await election.endElection()
        console.timeEnd("Calculate Election Results");

        const results = await tx.wait()
        const eventLog = results.logs

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Votes Tallied Event
        expect(eventLog[1].fragment.name).to.equal("VotesTallied");

        // Aberafan Maesteg Constituency Winner Event
        expect(eventLog[2].fragment.name).to.equal("ConstituencyWinner")
        expect(eventLog[2].args[0]).to.equal(ethers.encodeBytes32String("Aberafan Maesteg"))
        expect(eventLog[2].args[1]).to.equal(ethers.encodeBytes32String("Labour Party"))
        expect(eventLog[2].args[2]).to.equal(ethers.encodeBytes32String("Labour Party"))
        
        // All Constituency Winners Calculated Event
        expect(eventLog[3].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Election Results Calculated Event
        expect(eventLog[4].fragment.name).to.equal("ElectionResultsCalculated")

        // Election Winner Event
        expect(eventLog[eventLog.length - 1].fragment.name).to.equal("ElectionWinner")
        expect(eventLog[eventLog.length - 1].args[0]).to.equal(ethers.encodeBytes32String("Labour Party"))
        expect(eventLog[eventLog.length - 1].args[1]).to.equal(1)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("Additional Member System - Simulate an Aberafan Maesteg costituency election", function () {
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMS", admin);
        election = await Election.deploy(2);

        await election.waitForDeployment();
    })
    
    it("Simulate an Aberafan Maesteg constituency election vote", async function () {
        // Hypotherical scenario: Election with 1 constituency seat and 1
        // popular vote seat to be elected. Votes in the Aberafan constituency
        // are taken from the Uk General election for the constituency candiate
        // votes. While all party votes are for the Conservative party. This
        // should result in the Labour candidate being elected for the 
        // Aberafan constituency and a Conservative party seat being elected
        // for the popular vote seat
        this.timeout(1000000);

        // Add the Aberafan Maesteg Constituency
        const constituencyName = constituencyData[0].constituencyName
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);

        // Add the election candidates
        for (let i = 0; i < candidateNames.length; i++) {
            await expect(election.addConstituencyCandidate(candidateNames[i], candidateNames[i], constituencyName))
                .to.emit(election, "CandidateAdded")
                .withArgs(candidateNames[i], candidateNames[i], constituencyName);
        }

        // Add voters to the constituency
        const constiteuncyVotes = constituencyData[0].votes;
        let totalNumberOfVoters = 0

        for (let i = 0; i < constiteuncyVotes.length; i++) {
            totalNumberOfVoters += parseInt(constiteuncyVotes[i])
        }

        console.time("AddVoters")
        let voters = [];

        for (let i = 0; i < totalNumberOfVoters; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            voters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }
        console.timeEnd("AddVoters")

        // Start the election
        console.time("Start Election")
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");
        console.timeEnd("Start Election")


        console.time("Cast Votes")
        let k = 0

        // Cast Votes
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Vote is cast with constituency as per the UK general election
                // data and the party vote always for the conservative party
                await expect(election.connect(voterWallet).castVote(candidateNames[i], candidateNames[0]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, candidateNames[i], candidateNames[0]);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Cast Votes")

        console.time("Calculate Election Results");
        const tx = await election.endElection()
        console.time("Calculate Election Results");

        const results = await tx.wait()
        const eventLog = results.logs

        // Print the fragment name and index of each event in the log
        // eventLog.forEach((log, index) => {
        //     console.log(`Index: ${index}, Event: ${log.fragment.name}`);
        // });

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Aberafan Maesteg Constituency Winner Event
        expect(eventLog[1].fragment.name).to.equal("ConstituencyWinner")
        expect(eventLog[1].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[1].args[1]).to.equal(candidateNames[1])
        expect(eventLog[1].args[2]).to.equal(candidateNames[1])

        // Party Constituency Results
        // Conservative Party Constituency Results
        expect(eventLog[2].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[2].args[0]).to.equal(candidateNames[0])
        expect(eventLog[2].args[1]).to.equal(0)

        // Labour Party Constituency Results
        expect(eventLog[3].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[3].args[0]).to.equal(candidateNames[1])
        expect(eventLog[3].args[1]).to.equal(1)

        // Liberal Constituency Results
        expect(eventLog[4].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[4].args[0]).to.equal(candidateNames[2])
        expect(eventLog[4].args[1]).to.equal(0)

        // Reform Party Constituency Results
        expect(eventLog[5].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[5].args[0]).to.equal(candidateNames[3])
        expect(eventLog[5].args[1]).to.equal(0)

        // Green Party Constituency Results
        expect(eventLog[6].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[6].args[0]).to.equal(candidateNames[4])
        expect(eventLog[6].args[1]).to.equal(0)

        // Scottish National Party Constituency Results
        expect(eventLog[7].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[7].args[0]).to.equal(candidateNames[5])
        expect(eventLog[7].args[1]).to.equal(0)

        // Plaid Cymru Party Constituency Results
        expect(eventLog[8].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[8].args[0]).to.equal(candidateNames[6])
        expect(eventLog[8].args[1]).to.equal(0)

        // Democratic Unionist Party Constituency Results
        expect(eventLog[9].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[9].args[0]).to.equal(candidateNames[7])
        expect(eventLog[9].args[1]).to.equal(0)

        // Sinn Fein Party Constituency Results
        expect(eventLog[10].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[10].args[0]).to.equal(candidateNames[8])
        expect(eventLog[10].args[1]).to.equal(0)

        // Social Democratic and Labour Party Constituency Results
        expect(eventLog[11].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[11].args[0]).to.equal(candidateNames[9])
        expect(eventLog[11].args[1]).to.equal(0)

        // Ulster Unionist Party Constituency Results
        expect(eventLog[12].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[12].args[0]).to.equal(candidateNames[10])
        expect(eventLog[12].args[1]).to.equal(0)

        // Alliance Party of Nortern Ireland Party Constituency Results
        expect(eventLog[13].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[13].args[0]).to.equal(candidateNames[11])
        expect(eventLog[13].args[1]).to.equal(0)

        // All Constituency Winners Calculated Event
        expect(eventLog[14].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Additional Seat Allocated Event
        expect(eventLog[15].fragment.name).to.equal("AdditionalSeatsAllocated")
        expect(eventLog[15].args[0]).to.equal(candidateNames[0])
        expect(eventLog[15].args[1]).to.equal(1)

        // Add Additional Seats Allocated Event
        expect(eventLog[16].fragment.name).to.equal("AllAdditionalSeatsAllocated")

        // Election Results Calculated Event
        expect(eventLog[17].fragment.name).to.equal("ElectionResultsCalculated")

        // Conservative Party Results Event
        expect(eventLog[18].fragment.name).to.equal("PartyResults")
        expect(eventLog[18].args[0]).to.equal(candidateNames[0])
        expect(eventLog[18].args[1]).to.equal(1)

        // Labour Party Results Event
        expect(eventLog[19].fragment.name).to.equal("PartyResults")
        expect(eventLog[19].args[0]).to.equal(candidateNames[1])
        expect(eventLog[19].args[1]).to.equal(1)

        // Remaining Party Results Event
        for (i = 2; i < candidateNames.length; i++) {
            expect(eventLog[18+i].fragment.name).to.equal("PartyResults")
            expect(eventLog[18+i].args[0]).to.equal(candidateNames[i])
            expect(eventLog[18+i].args[1]).to.equal(0)
        }

        // Election Winner Event
        expect(eventLog[30].fragment.name).to.equal("ElectionWinner")
        expect(eventLog[30].args[0]).to.equal(candidateNames[0])
        expect(eventLog[30].args[1]).to.equal(1)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("Additional Member System - Simulate a full general election", function () {
    // This uses the AMSSimulation contract which allows a single voter to add
    // more than one vote to a candidate to speed up the election process by
    // avoiding having to add 27,720,244 voters and cast the same number of
    // votes when simulating a general election. This is then used to estimate
    // the gas costs associated with calulating the final results of a full
    // scale election using UK general election data. Since Additional Member
    // System voting requires a candidate and party vote the candidate vote
    // is repeated for the party vote. So a vote for the conservative candidate
    // in a constituency is repeated as a vote for the conservatvie party
    // globally.
    // 650 Constituency Seats - 217 Popular Vote Seats
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMSSimulation", admin);
        election = await Election.deploy(867);

        await election.waitForDeployment();
    })

    it("Simulate a full UK General Election", async function () {
        this.timeout(1000000);

        // Voters array
        let voters = [];

        console.time("Add Constituencies")
        // Add all the election constituencies
        for (let i = 0; i < constituencyData.length; i++) {
            // Add the constituency
            const constituencyName = constituencyData[i].constituencyName
            await expect(election.addConstituency(constituencyName))
                .to.emit(election, "ConstituencyAdded")
                .withArgs(constituencyName);
        }
        console.timeEnd("Add Constituencies")

        console.time("Add Candidates")
        for (let i = 0; i < constituencyData.length; i++) {
            const constituencyName = constituencyData[i].constituencyName        
            // Add the candidates to the constituency
            for (let j = 0; j < candidateNames.length; j++) {
                await expect(election.addConstituencyCandidate(candidateNames[j], candidateNames[j], constituencyName))
                    .to.emit(election, "CandidateAdded")
                    .withArgs(candidateNames[j], candidateNames[j], constituencyName);
            }
        }
        console.timeEnd("Add Candidates")

        for (let i = 0; i < constituencyData.length; i++) {
            const constituencyName = constituencyData[i].constituencyName
            // Add the votes to each constituency
            for (let j = 0; j < candidateNames.length; j++) {
                const voter = ethers.Wallet.createRandom();
                voters.push(voter);

                // Fund the voter wallet with some Ether
                const tx = await admin.sendTransaction({
                    to: voter.address,
                    value: ethers.parseEther("0.005"),
                });
                await tx.wait();

                // Add the voter to the election
                await expect(election.addVoter(voter.address, constituencyName))
                    .to.emit(election, "VoterAdded")
                    .withArgs(voter.address, constituencyName);
            }
        }

        console.time("Start Election")
        // Start the election
        await election.startElection();
        console.timeEnd("Start Election")

        // Voter index
        k = 0;

        // Cast votes in each constituency
        for (let i = 0; i < constituencyData.length; i++) {
            for (let j = 0; j < candidateNames.length; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Candidate vote, Party vote, Size of candidate vote, Size of party vot
                await expect(election.connect(voterWallet).castVote(candidateNames[j], candidateNames[j], constituencyData[i].votes[j], constituencyData[i].votes[j]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, candidateNames[j], candidateNames[j]);
                
                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;
                    
                k += 1;
            }
        }

        // End the election
        console.time("Calculate Election Results");
        const tx = await election.endElection();
        console.timeEnd("Calculate Election Results");

        const results = await tx.wait();
        const eventLog = results.logs;

        // // Print the fragment name and index of each event in the log
        // eventLog.forEach((log, index) => {
        //     console.log(`Index: ${index}, Event: ${log.fragment.name}`);
        // });

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Constiuency Winner Events
        for (let i = 0; i < constituencyData.length; i++) {
            // Index of the winning party in this constituency
            const constiteuncyWinningCandidateIndex = winningCandidateIndex(constituencyData[i].votes)

            expect(eventLog[i+1].fragment.name).to.equal("ConstituencyWinner");
            expect(eventLog[i+1].args[0]).to.equal(constituencyData[i].constituencyName)
            expect(eventLog[i+1].args[1]).to.equal(candidateNames[constiteuncyWinningCandidateIndex])
            expect(eventLog[i+1].args[2]).to.equal(candidateNames[constiteuncyWinningCandidateIndex])
        }

        // Constitunecy Party Results Events
        for (let i = 0; i < candidateNames.length; i++) {
            // Calculate the number of seats the party should have won
            let numberOfSeats = 0
            for (let j = 0; j < constituencyData.length; j++) {
                constiteuncyWinningCandidateIndex = winningCandidateIndex(constituencyData[j].votes)
                if (constiteuncyWinningCandidateIndex == i) {
                    numberOfSeats += 1;
                }
            }

            // Verify that the party has the correct number of elected seats
            expect(eventLog[i+651].fragment.name).to.equal("PartyConstituencyResults");
            expect(eventLog[i+651].args[0]).to.equal(candidateNames[i]);
            expect(eventLog[i+651].args[1]).to.equal(numberOfSeats);
        }

        // All Constituency Winners Calculated Event
        expect(eventLog[663].fragment.name).to.equal("AllConstituencyWinnersCalculated");

        // Additional Seats Allocated
        // Conservative Additional Seats
        expect(eventLog[664].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[664].args[0]).to.equal(candidateNames[0])
        expect(eventLog[664].args[1]).to.equal(84)

        // Liberal Additional Seats
        expect(eventLog[665].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[665].args[0]).to.equal(candidateNames[2])
        expect(eventLog[665].args[1]).to.equal(44)

        // Reform Additional Seats
        expect(eventLog[666].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[666].args[0]).to.equal(candidateNames[3])
        expect(eventLog[666].args[1]).to.equal(51)

        // Green Additional Seats
        expect(eventLog[667].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[667].args[0]).to.equal(candidateNames[4])
        expect(eventLog[667].args[1]).to.equal(24)

        // Scottish National Party Additional Seats
        expect(eventLog[668].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[668].args[0]).to.equal(candidateNames[5])
        expect(eventLog[668].args[1]).to.equal(9)

        // Plaid Cymru Additional Seats
        expect(eventLog[669].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[669].args[0]).to.equal(candidateNames[6])
        expect(eventLog[669].args[1]).to.equal(2)

        // Ulster Unionist Party Additional Seats
        expect(eventLog[670].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[670].args[0]).to.equal(candidateNames[10])
        expect(eventLog[670].args[1]).to.equal(1)

        // Alliance Party of Northern Ireland Additonal Seats
        expect(eventLog[671].fragment.name).to.equal("AdditionalSeatsAllocated");
        expect(eventLog[671].args[0]).to.equal(candidateNames[11])
        expect(eventLog[671].args[1]).to.equal(1)
        
        // All Additional Seats Allocated
        expect(eventLog[672].fragment.name).to.equal("AllAdditionalSeatsAllocated");

        // Election Results Calculated
        expect(eventLog[673].fragment.name).to.equal("ElectionResultsCalculated");

        // Party Results
        // Conservative Party Results
        expect(eventLog[674].fragment.name).to.equal("PartyResults");
        expect(eventLog[674].args[0]).to.equal(candidateNames[0])
        expect(eventLog[674].args[1]).to.equal(205)

        // Labour Party Results
        expect(eventLog[675].fragment.name).to.equal("PartyResults");
        expect(eventLog[675].args[0]).to.equal(candidateNames[1])
        expect(eventLog[675].args[1]).to.equal(416)

        // Liberal Party Results
        expect(eventLog[676].fragment.name).to.equal("PartyResults");
        expect(eventLog[676].args[0]).to.equal(candidateNames[2])
        expect(eventLog[676].args[1]).to.equal(116)
        
        // Reform Party Results
        expect(eventLog[677].fragment.name).to.equal("PartyResults");
        expect(eventLog[677].args[0]).to.equal(candidateNames[3])
        expect(eventLog[677].args[1]).to.equal(56)

        // Green Party Results
        expect(eventLog[678].fragment.name).to.equal("PartyResults");
        expect(eventLog[678].args[0]).to.equal(candidateNames[4])
        expect(eventLog[678].args[1]).to.equal(29)

        // Scottish National Party Results
        expect(eventLog[679].fragment.name).to.equal("PartyResults");
        expect(eventLog[679].args[0]).to.equal(candidateNames[5])
        expect(eventLog[679].args[1]).to.equal(18)

        // Plaid Cymru Party Results
        expect(eventLog[680].fragment.name).to.equal("PartyResults");
        expect(eventLog[680].args[0]).to.equal(candidateNames[6])
        expect(eventLog[680].args[1]).to.equal(6)

        // Democratic Unionist Party Results
        expect(eventLog[681].fragment.name).to.equal("PartyResults");
        expect(eventLog[681].args[0]).to.equal(candidateNames[7])
        expect(eventLog[681].args[1]).to.equal(6)

        // Sinn Fein Party Results
        expect(eventLog[682].fragment.name).to.equal("PartyResults");
        expect(eventLog[682].args[0]).to.equal(candidateNames[8])
        expect(eventLog[682].args[1]).to.equal(7)

        // Social Democratic and Labour Party Results
        expect(eventLog[683].fragment.name).to.equal("PartyResults");
        expect(eventLog[683].args[0]).to.equal(candidateNames[9])
        expect(eventLog[683].args[1]).to.equal(2)

        // Ulster Unionist Party Results
        expect(eventLog[684].fragment.name).to.equal("PartyResults");
        expect(eventLog[684].args[0]).to.equal(candidateNames[10])
        expect(eventLog[684].args[1]).to.equal(2)

        // Alliance Party of Northern Ireland Results
        expect(eventLog[685].fragment.name).to.equal("PartyResults");
        expect(eventLog[685].args[0]).to.equal(candidateNames[11])
        expect(eventLog[685].args[1]).to.equal(3)

        // ELection Winner Event
        expect(eventLog[686].fragment.name).to.equal("ElectionWinner");
        expect(eventLog[686].args[0]).to.equal(candidateNames[1])
        expect(eventLog[686].args[1]).to.equal(416)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("Additional Member System - Simulate an Aberafan Maesteg costituency election with amended votes", function () {
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("AMSAmend", admin);
        election = await Election.deploy(2);

        await election.waitForDeployment();
    })
    
    it("Simulate an Aberafan Maesteg constituency election vote", async function () {
        // Hypotherical scenario: Election with 1 constituency seat and 1
        // popular vote seat to be elected. Votes in the Aberafan constituency
        // are taken from the Uk General election for the constituency candiate
        // votes. While all party votes are for the Conservative party. This
        // should result in the Labour candidate being elected for the 
        // Aberafan constituency and a Conservative party seat being elected
        // for the popular vote seat.
        // Bogus votes are cast before being amended to acertain the costs
        // of amending a vote
        this.timeout(1000000);

        // Add the Aberafan Maesteg Constituency
        const constituencyName = constituencyData[0].constituencyName
        await expect(election.addConstituency(constituencyName))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName);

        // Add the election candidates
        for (let i = 0; i < candidateNames.length; i++) {
            await expect(election.addConstituencyCandidate(candidateNames[i], candidateNames[i], constituencyName))
                .to.emit(election, "CandidateAdded")
                .withArgs(candidateNames[i], candidateNames[i], constituencyName);
        }

        // Add voters to the constituency
        const constiteuncyVotes = constituencyData[0].votes;
        let totalNumberOfVoters = 0

        for (let i = 0; i < constiteuncyVotes.length; i++) {
            totalNumberOfVoters += parseInt(constiteuncyVotes[i])
        }

        console.time("AddVoters")
        let voters = [];

        for (let i = 0; i < totalNumberOfVoters; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            voters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }
        console.timeEnd("AddVoters")

        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");


        console.time("Cast Votes")
        let k = 0

        // Cast Incorrect Votes to be amended later
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Vote is cast with constituency as per the UK general election
                // data and the party vote always for the conservative party
                await expect(election.connect(voterWallet).castVote(candidateNames[0], candidateNames[0]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address, candidateNames[0], candidateNames[0]);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Cast Votes")

        console.time("Amend Votes")
        k = 0

        // Amend votes to the correct values
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Vote is cast with constituency as per the UK general election
                // data and the party vote always for the conservative party
                await expect(election.connect(voterWallet).castVote(candidateNames[i], candidateNames[0]))
                    .to.emit(election, "VoteAmended")
                    .withArgs(voterWallet.address, candidateNames[i], candidateNames[0]);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Amend Votes")

        console.time("Calculate Election Results");
        const tx = await election.endElection()
        console.timeEnd("Calculate Election Results");

        const results = await tx.wait()
        const eventLog = results.logs

        // Print the fragment name and index of each event in the log
        // eventLog.forEach((log, index) => {
        //     console.log(`Index: ${index}, Event: ${log.fragment.name}`);
        // });

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Votes Tallied Event
        expect(eventLog[1].fragment.name).to.equal("VotesTallied");

        // Aberafan Maesteg Constituency Winner Event
        expect(eventLog[2].fragment.name).to.equal("ConstituencyWinner")
        expect(eventLog[2].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[2].args[1]).to.equal(candidateNames[1])
        expect(eventLog[2].args[2]).to.equal(candidateNames[1])

        // Party Constituency Results
        // Conservative Party Constituency Results
        expect(eventLog[3].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[3].args[0]).to.equal(candidateNames[0])
        expect(eventLog[3].args[1]).to.equal(0)

        // Labour Party Constituency Results
        expect(eventLog[4].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[4].args[0]).to.equal(candidateNames[1])
        expect(eventLog[4].args[1]).to.equal(1)

        // Liberal Constituency Results
        expect(eventLog[5].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[5].args[0]).to.equal(candidateNames[2])
        expect(eventLog[5].args[1]).to.equal(0)

        // Reform Party Constituency Results
        expect(eventLog[6].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[6].args[0]).to.equal(candidateNames[3])
        expect(eventLog[6].args[1]).to.equal(0)

        // Green Party Constituency Results
        expect(eventLog[7].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[7].args[0]).to.equal(candidateNames[4])
        expect(eventLog[7].args[1]).to.equal(0)

        // Scottish National Party Constituency Results
        expect(eventLog[8].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[8].args[0]).to.equal(candidateNames[5])
        expect(eventLog[8].args[1]).to.equal(0)

        // Plaid Cymru Party Constituency Results
        expect(eventLog[9].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[9].args[0]).to.equal(candidateNames[6])
        expect(eventLog[9].args[1]).to.equal(0)

        // Democratic Unionist Party Constituency Results
        expect(eventLog[10].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[10].args[0]).to.equal(candidateNames[7])
        expect(eventLog[10].args[1]).to.equal(0)

        // Sinn Fein Party Constituency Results
        expect(eventLog[11].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[11].args[0]).to.equal(candidateNames[8])
        expect(eventLog[11].args[1]).to.equal(0)

        // Social Democratic and Labour Party Constituency Results
        expect(eventLog[12].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[12].args[0]).to.equal(candidateNames[9])
        expect(eventLog[12].args[1]).to.equal(0)

        // Ulster Unionist Party Constituency Results
        expect(eventLog[13].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[13].args[0]).to.equal(candidateNames[10])
        expect(eventLog[13].args[1]).to.equal(0)

        // Alliance Party of Nortern Ireland Party Constituency Results
        expect(eventLog[14].fragment.name).to.equal("PartyConstituencyResults")
        expect(eventLog[14].args[0]).to.equal(candidateNames[11])
        expect(eventLog[14].args[1]).to.equal(0)

        // All Constituency Winners Calculated Event
        expect(eventLog[15].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Additional Seat Allocated Event
        expect(eventLog[16].fragment.name).to.equal("AdditionalSeatsAllocated")
        expect(eventLog[16].args[0]).to.equal(candidateNames[0])
        expect(eventLog[16].args[1]).to.equal(1)

        // Add Additional Seats Allocated Event
        expect(eventLog[17].fragment.name).to.equal("AllAdditionalSeatsAllocated")

        // Election Results Calculated Event
        expect(eventLog[18].fragment.name).to.equal("ElectionResultsCalculated")

        // Conservative Party Results Event
        expect(eventLog[19].fragment.name).to.equal("PartyResults")
        expect(eventLog[19].args[0]).to.equal(candidateNames[0])
        expect(eventLog[19].args[1]).to.equal(1)

        // Labour Party Results Event
        expect(eventLog[20].fragment.name).to.equal("PartyResults")
        expect(eventLog[20].args[0]).to.equal(candidateNames[1])
        expect(eventLog[20].args[1]).to.equal(1)

        // Remaining Party Results Event
        for (i = 2; i < candidateNames.length; i++) {
            expect(eventLog[19+i].fragment.name).to.equal("PartyResults")
            expect(eventLog[19+i].args[0]).to.equal(candidateNames[i])
            expect(eventLog[19+i].args[1]).to.equal(0)
        }

        // Election Winner Event
        expect(eventLog[31].fragment.name).to.equal("ElectionWinner")
        expect(eventLog[31].args[0]).to.equal(candidateNames[0])
        expect(eventLog[31].args[1]).to.equal(1)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("Single Transferable Vote - Simulating an Aberafan Maesteg constituency election", function () {
    // This simulation uses data from the 2024 Uk General Election constituency
    // Aberafan Maesteg to construct a hypothetical voting scenario where
    // Left leaning voters lend their vote to other left leaning partys and
    // visa versa for right leaning parties. The constituency has 3 seats
    // available for election.

    // Hypothetical Rankings
    // Conservative - [Con, RUK, LD, PC, Green, Lab]
    // Labour - [Lab, LD, Green, PC, Con, RUK]
    // Liberal Democrats - [LD, Lab, PC, Green, Con, RUK]
    // Reform Uk - [RUK, Con, PC, LD, Green, Lab]
    // Green - [Green, LD, Lab, PC, Con, RUK]
    // Plaid Cymru - [PC, LD, Lab, Con, RUK, Green]
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        rankings = [
            [candidateNames[0], candidateNames[3], candidateNames[2], candidateNames[6], candidateNames[4], candidateNames[1]],
            [candidateNames[1], candidateNames[2], candidateNames[4], candidateNames[4], candidateNames[0], candidateNames[3]],
            [candidateNames[2], candidateNames[1], candidateNames[6], candidateNames[4], candidateNames[0], candidateNames[3]],
            [candidateNames[3], candidateNames[1], candidateNames[6], candidateNames[2], candidateNames[4], candidateNames[1]],
            [candidateNames[4], candidateNames[2], candidateNames[1], candidateNames[6], candidateNames[0], candidateNames[3]],
            [],
            [candidateNames[6], candidateNames[2], candidateNames[1], candidateNames[0], candidateNames[3], candidateNames[4]],
            
            ];

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STV", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Simulate an Aberafan Maesteg constituency election vote", async function () {
        this.timeout(100000000000000000);

        // Add the Aberafan Maesteg Constituency
        const constituencyName = constituencyData[0].constituencyName
        await expect(election.addConstituency(constituencyName, 3))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, 3);

        // Add the election candidates
        for (let i = 0; i < candidateNames.length; i++) {
            await expect(election.addConstituencyCandidate(candidateNames[i], candidateNames[i], constituencyName))
                .to.emit(election, "CandidateAdded")
                .withArgs(candidateNames[i], candidateNames[i], constituencyName);
        }

        // Add voters to the constituency
        const constiteuncyVotes = constituencyData[0].votes;
        let totalNumberOfVoters = 0

        for (let i = 0; i < constiteuncyVotes.length; i++) {
            totalNumberOfVoters += parseInt(constiteuncyVotes[i])
        }

        console.time("AddVoters")
        let voters = [];

        for (let i = 0; i < totalNumberOfVoters; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            voters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }
        console.timeEnd("AddVoters")

        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");


        console.time("Cast Votes")
        let k = 0

        // Cast Votes
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Vote is cast with constituency as per the UK general election
                // data and the party vote always for the conservative party
                await expect(election.connect(voterWallet).castVote(rankings[i]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Cast Votes")

        console.time("Calculate Election Results")
        const tx = await election.endElection()
        console.timeEnd("Calculate Election Results")

        const results = await tx.wait()
        const eventLog = results.logs

        // // Print the fragment name, index, and arguments of each event in the log
        // eventLog.forEach((log, index) => {
        //     console.log(`Index: ${index}, Event: ${log.fragment.name}`);
        // })

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Aberafan Maesteg Constituency Winner Event
        // Labour Constituency Seat Win
        expect(eventLog[1].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[1].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[1].args[1]).to.equal(candidateNames[1])
        expect(eventLog[1].args[2]).to.equal(candidateNames[1])

        // Liberal Democrats Seat Win
        expect(eventLog[2].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[2].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[2].args[1]).to.equal(candidateNames[2])
        expect(eventLog[2].args[2]).to.equal(candidateNames[2])

        // Reform UK Seat Win
        expect(eventLog[3].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[3].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[3].args[1]).to.equal(candidateNames[3])
        expect(eventLog[3].args[2]).to.equal(candidateNames[3])

        // All Constituency Winners Calculated
        expect(eventLog[4].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Election Results Calculated
        expect(eventLog[5].fragment.name).to.equal("ElectionResultsCalculated")

        // Conservative Party Results
        expect(eventLog[6].fragment.name).to.equal("PartyResults")
        expect(eventLog[6].args[0]).to.equal(candidateNames[0])
        expect(eventLog[6].args[1]).to.equal(0)
        
        // Labour Party Results
        expect(eventLog[7].fragment.name).to.equal("PartyResults")
        expect(eventLog[7].args[0]).to.equal(candidateNames[1])
        expect(eventLog[7].args[1]).to.equal(1)

        // Liberal Democrats Party Results
        expect(eventLog[8].fragment.name).to.equal("PartyResults")
        expect(eventLog[8].args[0]).to.equal(candidateNames[2])
        expect(eventLog[8].args[1]).to.equal(1)

        // Reform Uk Party Results
        expect(eventLog[9].fragment.name).to.equal("PartyResults")
        expect(eventLog[9].args[0]).to.equal(candidateNames[3])
        expect(eventLog[9].args[1]).to.equal(1)

        // Green Party Results
        expect(eventLog[10].fragment.name).to.equal("PartyResults")
        expect(eventLog[10].args[0]).to.equal(candidateNames[4])
        expect(eventLog[10].args[1]).to.equal(0)

        // Scottish National Party Results
        expect(eventLog[11].fragment.name).to.equal("PartyResults")
        expect(eventLog[11].args[0]).to.equal(candidateNames[5])
        expect(eventLog[11].args[1]).to.equal(0)
        
        // Plaid Cymru Party Results
        expect(eventLog[12].fragment.name).to.equal("PartyResults")
        expect(eventLog[12].args[0]).to.equal(candidateNames[6])
        expect(eventLog[12].args[1]).to.equal(0)

        // Democratic Unionist Party Party Results
        expect(eventLog[13].fragment.name).to.equal("PartyResults")
        expect(eventLog[13].args[0]).to.equal(candidateNames[7])
        expect(eventLog[13].args[1]).to.equal(0)

        // Sinn Fein Party Results
        expect(eventLog[14].fragment.name).to.equal("PartyResults")
        expect(eventLog[14].args[0]).to.equal(candidateNames[8])
        expect(eventLog[14].args[1]).to.equal(0)

        // Social Democratic and Labour Party Results
        expect(eventLog[15].fragment.name).to.equal("PartyResults")
        expect(eventLog[15].args[0]).to.equal(candidateNames[9])
        expect(eventLog[15].args[1]).to.equal(0)

        // Ulster Unionist Party Results
        expect(eventLog[16].fragment.name).to.equal("PartyResults")
        expect(eventLog[16].args[0]).to.equal(candidateNames[10])
        expect(eventLog[16].args[1]).to.equal(0)

        // Alliance Party of Northern Iteland Party Results
        expect(eventLog[17].fragment.name).to.equal("PartyResults")
        expect(eventLog[17].args[0]).to.equal(candidateNames[11])
        expect(eventLog[17].args[1]).to.equal(0)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})

describe.skip("Single Transferable Vote - Simulating an Aberafan Maesteg constituency election with amended votes", function () {
    // This simulation uses data from the 2024 Uk General Election constituency
    // Aberafan Maesteg to construct a hypothetical voting scenario where
    // Left leaning voters lend their vote to other left leaning partys and
    // visa versa for right leaning parties. The constituency has 3 seats
    // available for election. Votes are first cast wrongly before being
    // amended to understand the cost of amending votes

    // Hypothetical Rankings
    // Conservative - [Con, RUK, LD, PC, Green, Lab]
    // Labour - [Lab, LD, Green, PC, Con, RUK]
    // Liberal Democrats - [LD, Lab, PC, Green, Con, RUK]
    // Reform Uk - [RUK, Con, PC, LD, Green, Lab]
    // Green - [Green, LD, Lab, PC, Con, RUK]
    // Plaid Cymru - [PC, LD, Lab, Con, RUK, Green]
    let constituencyData;

    beforeEach(async function () {
        constituencyData = await readConstituencyData("./test/UK-2024-Election-Results.csv");

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

        rankings = [
            [candidateNames[0], candidateNames[3], candidateNames[2], candidateNames[6], candidateNames[4], candidateNames[1]],
            [candidateNames[1], candidateNames[2], candidateNames[4], candidateNames[4], candidateNames[0], candidateNames[3]],
            [candidateNames[2], candidateNames[1], candidateNames[6], candidateNames[4], candidateNames[0], candidateNames[3]],
            [candidateNames[3], candidateNames[1], candidateNames[6], candidateNames[2], candidateNames[4], candidateNames[1]],
            [candidateNames[4], candidateNames[2], candidateNames[1], candidateNames[6], candidateNames[0], candidateNames[3]],
            [],
            [candidateNames[6], candidateNames[2], candidateNames[1], candidateNames[0], candidateNames[3], candidateNames[4]],
            
            ];

        [admin, voter] = await ethers.getSigners();

        Election = await ethers.getContractFactory("STVAmend", admin);
        election = await Election.deploy();

        await election.waitForDeployment();
    })

    it("Simulate an Aberafan Maesteg constituency election vote", async function () {
        this.timeout(100000000000000000);

        // Add the Aberafan Maesteg Constituency
        const constituencyName = constituencyData[0].constituencyName
        await expect(election.addConstituency(constituencyName, 3))
            .to.emit(election, "ConstituencyAdded")
            .withArgs(constituencyName, 3);

        // Add the election candidates
        for (let i = 0; i < candidateNames.length; i++) {
            await expect(election.addConstituencyCandidate(candidateNames[i], candidateNames[i], constituencyName))
                .to.emit(election, "CandidateAdded")
                .withArgs(candidateNames[i], candidateNames[i], constituencyName);
        }

        // Add voters to the constituency
        const constiteuncyVotes = constituencyData[0].votes;
        let totalNumberOfVoters = 0

        for (let i = 0; i < constiteuncyVotes.length; i++) {
            totalNumberOfVoters += parseInt(constiteuncyVotes[i])
        }

        console.time("AddVoters")
        let voters = [];

        for (let i = 0; i < totalNumberOfVoters; i++) {
            const voter = ethers.Wallet.createRandom(); // Create a random wallet for each voter
            voters.push(voter); // Store the voter's address in the array

            // Fund the voter wallet with some Ether (required for gas fees)
            const tx = await admin.sendTransaction({
                to: voter.address,
                value: ethers.parseEther("0.005"), // Send 1 Ether
            });
            await tx.wait();

            // Add the voter to the election
            await expect(election.addVoter(voter.address, constituencyName))
                .to.emit(election, "VoterAdded")
                .withArgs(voter.address, constituencyName);
        }
        console.timeEnd("AddVoters")

        // Start the election
        await expect(election.startElection())
            .to.emit(election, "ElectionStarted");


        console.time("Cast Votes")
        let k = 0

        // Cast Votes wrong
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Vote is cast with constituency as per the UK general election
                // data and the party vote always for the conservative party
                await expect(election.connect(voterWallet).castVote(rankings[0]))
                    .to.emit(election, "VoteCast")
                    .withArgs(voterWallet.address);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Cast Votes")

        console.time("Amend Votes")
        k = 0

        // Cast Votes correctly by amending them
        for (let i = 0; i < candidateNames.length; i++) {
            for (let j = 0; j < constiteuncyVotes[i]; j++) {
                const voterWallet = voters[k].connect(ethers.provider);

                // Vote is cast with constituency as per the UK general election
                // data and the party vote always for the conservative party
                await expect(election.connect(voterWallet).castVote(rankings[i]))
                    .to.emit(election, "VoteAmended")
                    .withArgs(voterWallet.address);

                // Disconnect the wallet to reduce memory usage
                voterWallet.provider = null;

                k += 1;
            }
        }
        console.timeEnd("Amend Votes")

        console.time("Calculate Election Results")
        const tx = await election.endElection()
        console.timeEnd("Calculate Election Results")

        const results = await tx.wait()
        const eventLog = results.logs

        // // Print the fragment name, index, and arguments of each event in the log
        // eventLog.forEach((log, index) => {
        //     console.log(`Index: ${index}, Event: ${log.fragment.name}`);
        // })

        // Election Ended Event
        expect(eventLog[0].fragment.name).to.equal("ElectionEnded");

        // Aberafan Maesteg Constituency Winner Event
        // Labour Constituency Seat Win
        expect(eventLog[1].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[1].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[1].args[1]).to.equal(candidateNames[1])
        expect(eventLog[1].args[2]).to.equal(candidateNames[1])

        // Liberal Democrats Seat Win
        expect(eventLog[2].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[2].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[2].args[1]).to.equal(candidateNames[2])
        expect(eventLog[2].args[2]).to.equal(candidateNames[2])

        // Reform UK Seat Win
        expect(eventLog[3].fragment.name).to.equal("ConstituencyCandidateElected")
        expect(eventLog[3].args[0]).to.equal(constituencyData[0].constituencyName)
        expect(eventLog[3].args[1]).to.equal(candidateNames[3])
        expect(eventLog[3].args[2]).to.equal(candidateNames[3])

        // All Constituency Winners Calculated
        expect(eventLog[4].fragment.name).to.equal("AllConstituencyWinnersCalculated")

        // Election Results Calculated
        expect(eventLog[5].fragment.name).to.equal("ElectionResultsCalculated")

        // Conservative Party Results
        expect(eventLog[6].fragment.name).to.equal("PartyResults")
        expect(eventLog[6].args[0]).to.equal(candidateNames[0])
        expect(eventLog[6].args[1]).to.equal(0)
        
        // Labour Party Results
        expect(eventLog[7].fragment.name).to.equal("PartyResults")
        expect(eventLog[7].args[0]).to.equal(candidateNames[1])
        expect(eventLog[7].args[1]).to.equal(1)

        // Liberal Democrats Party Results
        expect(eventLog[8].fragment.name).to.equal("PartyResults")
        expect(eventLog[8].args[0]).to.equal(candidateNames[2])
        expect(eventLog[8].args[1]).to.equal(1)

        // Reform Uk Party Results
        expect(eventLog[9].fragment.name).to.equal("PartyResults")
        expect(eventLog[9].args[0]).to.equal(candidateNames[3])
        expect(eventLog[9].args[1]).to.equal(1)

        // Green Party Results
        expect(eventLog[10].fragment.name).to.equal("PartyResults")
        expect(eventLog[10].args[0]).to.equal(candidateNames[4])
        expect(eventLog[10].args[1]).to.equal(0)

        // Scottish National Party Results
        expect(eventLog[11].fragment.name).to.equal("PartyResults")
        expect(eventLog[11].args[0]).to.equal(candidateNames[5])
        expect(eventLog[11].args[1]).to.equal(0)
        
        // Plaid Cymru Party Results
        expect(eventLog[12].fragment.name).to.equal("PartyResults")
        expect(eventLog[12].args[0]).to.equal(candidateNames[6])
        expect(eventLog[12].args[1]).to.equal(0)

        // Democratic Unionist Party Party Results
        expect(eventLog[13].fragment.name).to.equal("PartyResults")
        expect(eventLog[13].args[0]).to.equal(candidateNames[7])
        expect(eventLog[13].args[1]).to.equal(0)

        // Sinn Fein Party Results
        expect(eventLog[14].fragment.name).to.equal("PartyResults")
        expect(eventLog[14].args[0]).to.equal(candidateNames[8])
        expect(eventLog[14].args[1]).to.equal(0)

        // Social Democratic and Labour Party Results
        expect(eventLog[15].fragment.name).to.equal("PartyResults")
        expect(eventLog[15].args[0]).to.equal(candidateNames[9])
        expect(eventLog[15].args[1]).to.equal(0)

        // Ulster Unionist Party Results
        expect(eventLog[16].fragment.name).to.equal("PartyResults")
        expect(eventLog[16].args[0]).to.equal(candidateNames[10])
        expect(eventLog[16].args[1]).to.equal(0)

        // Alliance Party of Northern Iteland Party Results
        expect(eventLog[17].fragment.name).to.equal("PartyResults")
        expect(eventLog[17].args[0]).to.equal(candidateNames[11])
        expect(eventLog[17].args[1]).to.equal(0)

        // Clear voters and constituency data array from memory
        voters = null;
        constituencyData = null;
    })
})