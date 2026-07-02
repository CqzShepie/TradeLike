using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class TeamPlusEntitlementsReportsAndJobNumbering : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "JobNumber",
                table: "Jobs",
                type: "int",
                nullable: true);

            migrationBuilder.Sql("""
                WITH NumberedJobs AS (
                    SELECT
                        Id,
                        ROW_NUMBER() OVER (PARTITION BY TenantId ORDER BY ScheduledDate, Id) AS TenantJobNumber
                    FROM Jobs
                    WHERE JobNumber IS NULL
                )
                UPDATE Jobs
                SET JobNumber = NumberedJobs.TenantJobNumber
                FROM Jobs
                INNER JOIN NumberedJobs ON Jobs.Id = NumberedJobs.Id;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_TenantId_JobNumber",
                table: "Jobs",
                columns: new[] { "TenantId", "JobNumber" },
                unique: true,
                filter: "[JobNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Jobs_TenantId_JobNumber",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "JobNumber",
                table: "Jobs");
        }
    }
}
