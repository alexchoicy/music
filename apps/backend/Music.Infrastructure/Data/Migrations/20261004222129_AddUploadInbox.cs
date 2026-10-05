using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUploadInbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InboxGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UploadedByUserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboxGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InboxGroups_AspNetUsers_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InboxItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Album = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Artists = table.Column<List<string>>(type: "text[]", nullable: false),
                    AlbumArtists = table.Column<List<string>>(type: "text[]", nullable: false),
                    TrackNumber = table.Column<int>(type: "integer", nullable: true),
                    TrackTotal = table.Column<int>(type: "integer", nullable: true),
                    DiscNumber = table.Column<int>(type: "integer", nullable: true),
                    DiscTotal = table.Column<int>(type: "integer", nullable: true),
                    Date = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Genres = table.Column<List<string>>(type: "text[]", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboxItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InboxItems_InboxGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "InboxGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InboxItems_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InboxGroups_CreatedAt",
                table: "InboxGroups",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_InboxGroups_UploadedByUserId",
                table: "InboxGroups",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_InboxItems_FileId",
                table: "InboxItems",
                column: "FileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InboxItems_GroupId_Position",
                table: "InboxItems",
                columns: new[] { "GroupId", "Position" });

            migrationBuilder.CreateIndex(
                name: "IX_InboxItems_Status",
                table: "InboxItems",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InboxItems");

            migrationBuilder.DropTable(
                name: "InboxGroups");
        }
    }
}
