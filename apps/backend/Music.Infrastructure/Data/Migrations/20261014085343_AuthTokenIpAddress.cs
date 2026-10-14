using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AuthTokenIpAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "AuthTokens",
                type: "text",
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "IpAddress", table: "AuthTokens");
        }
    }
}
