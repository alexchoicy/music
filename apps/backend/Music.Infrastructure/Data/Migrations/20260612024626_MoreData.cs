using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoreData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AudioChannels",
                table: "FileObjects",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BitsPerSample",
                table: "FileObjects",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Lossless",
                table: "FileObjects",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AudioChannels",
                table: "FileObjects");

            migrationBuilder.DropColumn(
                name: "BitsPerSample",
                table: "FileObjects");

            migrationBuilder.DropColumn(
                name: "Lossless",
                table: "FileObjects");
        }
    }
}
