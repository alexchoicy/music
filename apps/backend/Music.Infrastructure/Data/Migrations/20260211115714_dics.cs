using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Music.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class dics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AlbumTracks_Albums_AlbumId",
                table: "AlbumTracks");

            migrationBuilder.DropIndex(
                name: "IX_AlbumTracks_AlbumId",
                table: "AlbumTracks");

            migrationBuilder.DropIndex(
                name: "IX_AlbumTracks_AlbumId_DiscNumber_TrackNumber",
                table: "AlbumTracks");

            migrationBuilder.DropIndex(
                name: "IX_AlbumTracks_AlbumId_TrackId",
                table: "AlbumTracks");

            migrationBuilder.DropColumn(
                name: "AlbumId",
                table: "AlbumTracks");

            migrationBuilder.RenameColumn(
                name: "DiscNumber",
                table: "AlbumTracks",
                newName: "AlbumDiscId");

            migrationBuilder.CreateTable(
                name: "AlbumDiscs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlbumId = table.Column<int>(type: "integer", nullable: false),
                    DiscNumber = table.Column<int>(type: "integer", nullable: false),
                    Subtitle = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumDiscs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlbumDiscs_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumDiscId",
                table: "AlbumTracks",
                column: "AlbumDiscId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumDiscId_TrackId",
                table: "AlbumTracks",
                columns: new[] { "AlbumDiscId", "TrackId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumDiscId_TrackNumber",
                table: "AlbumTracks",
                columns: new[] { "AlbumDiscId", "TrackNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumDiscs_AlbumId",
                table: "AlbumDiscs",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumDiscs_AlbumId_DiscNumber",
                table: "AlbumDiscs",
                columns: new[] { "AlbumId", "DiscNumber" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AlbumTracks_AlbumDiscs_AlbumDiscId",
                table: "AlbumTracks",
                column: "AlbumDiscId",
                principalTable: "AlbumDiscs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AlbumTracks_AlbumDiscs_AlbumDiscId",
                table: "AlbumTracks");

            migrationBuilder.DropTable(
                name: "AlbumDiscs");

            migrationBuilder.DropIndex(
                name: "IX_AlbumTracks_AlbumDiscId",
                table: "AlbumTracks");

            migrationBuilder.DropIndex(
                name: "IX_AlbumTracks_AlbumDiscId_TrackId",
                table: "AlbumTracks");

            migrationBuilder.DropIndex(
                name: "IX_AlbumTracks_AlbumDiscId_TrackNumber",
                table: "AlbumTracks");

            migrationBuilder.RenameColumn(
                name: "AlbumDiscId",
                table: "AlbumTracks",
                newName: "DiscNumber");

            migrationBuilder.AddColumn<int>(
                name: "AlbumId",
                table: "AlbumTracks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumId",
                table: "AlbumTracks",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumId_DiscNumber_TrackNumber",
                table: "AlbumTracks",
                columns: new[] { "AlbumId", "DiscNumber", "TrackNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumId_TrackId",
                table: "AlbumTracks",
                columns: new[] { "AlbumId", "TrackId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AlbumTracks_Albums_AlbumId",
                table: "AlbumTracks",
                column: "AlbumId",
                principalTable: "Albums",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
