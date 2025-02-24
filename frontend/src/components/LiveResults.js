const LiveResults = () => {
    return (
        <>
            <h1>Live Results</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Anyone can view the live election results as this information is stored publically on the blockchain</h3>
            </div>
            {/* {proposals.map((proposal, index) => {
            const name = parseName(parseBytes(proposal.name));
            const voteCount = proposal.voteCount._hex;
            return (
                <div style={{ padding: '1rem 0' }}>
                <hr></hr>
                🗳 {name} - {Number(voteCount)}
                </div>
            );
            })} */}
        </>
    );
};

export default LiveResults;