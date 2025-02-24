const CastVote = () => {
    return (
        <>
            <div style={{ borderStyle: "solid", marginTop: "-1.5px"}}>
            <h3 style={{ fontWeight: "normal"}}>This election is ran by the <strong style={{ color: "red" }}>UK Electoral Commission</strong> with a blockchain address of <strong style={{ color: "red" }}>XXXXXX</strong></h3>
            <h3 style={{ fontWeight: "normal"}}>This election is <strong style={{ color: "red" }}>cryptographically</strong> secured via the use of <strong style={{ color: "red" }}>Blockchain and Smart Contract technology</strong></h3>
            </div>

            <div style={{ borderStyle: "solid", marginTop: "-1.5px"}}>
            <h3 style={{ fontWeight: "normal"}}>Vote for <strong style={{ color: "red" }}>only one candidate</strong> by selecting the <strong style={{ color: "red" }}>vote box</strong> next to your choice</h3>
            </div>

            {/* {proposals.map((proposal, index) => {
            const name = parseName(parseBytes(proposal.name));
            return (
            <div key={index} style={{ padding: '1rem 0' }}>
            <hr></hr>
            🗳 {name}
            <button
            style={{ marginLeft: '2em' }}
            onClick={() => voteProposal(index)}>
            Vote
            </button>
            </div>
            );
            })} */}

            <div>
            <h3 id="voteMessage"> </h3>
            </div>
        </>
    );
};

export default CastVote;