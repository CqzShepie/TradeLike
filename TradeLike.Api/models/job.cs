namespace TradeLike.Api.Models
{
    public class Job
    {
        public int Id { get; set; }

        public string Customer { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string JobTitle { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public string Time { get; set; } = string.Empty;

        public string Status { get; set; } = "Scheduled";
    }
}