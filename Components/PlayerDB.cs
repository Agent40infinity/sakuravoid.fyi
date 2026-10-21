namespace sakuravoid.fyi.Components
{
    public class PlayerDbResponse
    {
        public bool Success { get; set; }
        public PlayerDbData? Data { get; set; }
    }

    public class PlayerDbData
    {
        public PlayerDbUser? Player { get; set; }
    }

    public class PlayerDbUser
    {
        public string Id { get; set; } = "";
        public string Username { get; set; } = "";
    }
}
