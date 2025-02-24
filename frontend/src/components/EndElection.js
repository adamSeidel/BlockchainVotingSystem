const EndElection = () => {
    return (
        <>
            <h1>End the Election</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only the <strong style={{ color: "red" }}>UK Electoral Commission</strong> with a blockchain address of <strong style={{ color: "red" }}>xxx</strong> can end the election</h3>
            </div>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
            {/* <button onClick={endElection}>End Election</button> */}
            <button>End Election</button>
            <h3 id="endElectionMessage"> </h3>
            </div>
        </>
    );
};

export default EndElection;