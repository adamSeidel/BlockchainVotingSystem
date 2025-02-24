const VotersWhoHaveVoted = () => {
    return (
        <>
            <h1>Display Voters That Have Voted</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Addresses listed below have <strong style={{ color: "red" }}>already voted</strong> in this election</h3>
            </div>
            {/* {votersWhoHaveVoted.map((address) => {
            return (
                <div style={{ padding: '1rem 0'}}>
                <hr></hr>
                {address}
                </div>
            );
            })} */}
        </>
    );
};

export default VotersWhoHaveVoted;