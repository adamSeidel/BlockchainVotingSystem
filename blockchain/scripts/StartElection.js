const path = require('path');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying election contract with the account:", await deployer.getAddress());

    const accountBalance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", accountBalance.toString());

    const Token = await ethers.getContractFactory("Election");

    const candidates = [
        'Conservative and Unionist Party',
        'Labour Party',
        'Liberal Democrats',
        'Reform UK',
        'Green Party'
    ];
    const encodedCandidates = encodeCandidateNames(candidates);

    const token = await Token.deploy(encodedCandidates);
    await token.waitForDeployment();

    console.log("Election contract deployed to:", await token.getAddress());

    saveFrontendFiles(token, await token.getAddress());
}

function encodeCandidateNames(candidateNames) {
    return candidateNames.map(name => ethers.encodeBytes32String(name));
}

function saveFrontendFiles(token, address) {
    const fs = require('fs');
    const contractsDir = path.join(__dirname, '..', '..', 'frontend', 'src', 'contracts');

    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir);
    }

    fs.writeFileSync(
        path.join(contractsDir, 'contract-address.json'),
        JSON.stringify({ Election: address }, undefined, 2)
    );

    const TokenArtifact = artifacts.readArtifactSync('Election');

    fs.writeFileSync(
        path.join(contractsDir, 'Election.json'),
        JSON.stringify(TokenArtifact, null, 2)
    );
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });