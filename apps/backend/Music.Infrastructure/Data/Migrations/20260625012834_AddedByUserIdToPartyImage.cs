using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedByUserIdToPartyImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AddedByUserId",
                table: "PartyImages",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_AddedByUserId",
                table: "PartyImages",
                column: "AddedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PartyImages_AspNetUsers_AddedByUserId",
                table: "PartyImages",
                column: "AddedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PartyImages_AspNetUsers_AddedByUserId",
                table: "PartyImages");

            migrationBuilder.DropIndex(
                name: "IX_PartyImages_AddedByUserId",
                table: "PartyImages");

            migrationBuilder.DropColumn(
                name: "AddedByUserId",
                table: "PartyImages");
        }
    }
}
