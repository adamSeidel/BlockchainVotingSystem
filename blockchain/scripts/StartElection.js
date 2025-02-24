function encodeCandidateNames(candidateNames) {
    return candidateNames.map(name => ethers.encodeBytes32String(name));
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying election contract with the account:", deployer.address);

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
}
main()