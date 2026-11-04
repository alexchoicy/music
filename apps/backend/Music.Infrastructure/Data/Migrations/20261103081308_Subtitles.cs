using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Subtitles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Subtitles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrackId = table.Column<int>(type: "integer", nullable: true),
                    ConcertFileId = table.Column<int>(type: "integer", nullable: true),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Format = table.Column<int>(type: "integer", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: true),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Parsed = table.Column<string>(type: "jsonb", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subtitles", x => x.Id);
                    table.CheckConstraint("CK_Subtitles_SingleOwner", "(\"TrackId\" IS NULL) <> (\"ConcertFileId\" IS NULL)");
                    table.ForeignKey(
                        name: "FK_Subtitles_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Subtitles_ConcertFiles_ConcertFileId",
                        column: x => x.ConcertFileId,
                        principalTable: "ConcertFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Subtitles_Languages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "Languages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Subtitles_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Subtitles_ConcertFileId_Order",
                table: "Subtitles",
                columns: new[] { "ConcertFileId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_Subtitles_CreatedAt",
                table: "Subtitles",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Subtitles_CreatedByUserId",
                table: "Subtitles",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Subtitles_LanguageId",
                table: "Subtitles",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Subtitles_TrackId_Order",
                table: "Subtitles",
                columns: new[] { "TrackId", "Order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Subtitles");
        }
    }
}
