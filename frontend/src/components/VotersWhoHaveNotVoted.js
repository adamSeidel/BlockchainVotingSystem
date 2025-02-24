const VotersWhoHaveNotVoted = () => {
    return (
        <>
            <h1>Display Voters That Have Not Voted</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Addresses listed below have <strong style={{ color: "red" }}>not yet voted</strong> in this election</h3>
            </div>
            {/* {votersWhoHaveNotVoted.map((address) => {
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

export default VotersWhoHaveNotVoted;