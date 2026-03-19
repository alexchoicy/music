using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Music.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Concert : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Concerts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    NormalizedTitle = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Concerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Concerts_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConcertAlbums",
                columns: table => new
                {
                    ConcertId = table.Column<int>(type: "integer", nullable: false),
                    AlbumId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConcertAlbums", x => new { x.ConcertId, x.AlbumId });
                    table.ForeignKey(
                        name: "FK_ConcertAlbums_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConcertAlbums_Concerts_ConcertId",
                        column: x => x.ConcertId,
                        principalTable: "Concerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ConcertCovers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConcertId = table.Column<int>(type: "integer", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    CropX = table.Column<int>(type: "integer", nullable: true),
                    CropY = table.Column<int>(type: "integer", nullable: true),
                    CropWidth = table.Column<int>(type: "integer", nullable: true),
                    CropHeight = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConcertCovers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConcertCovers_Concerts_ConcertId",
                        column: x => x.ConcertId,
                        principalTable: "Concerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConcertCovers_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConcertFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConcertId = table.Column<int>(type: "integer", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConcertFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConcertFiles_Concerts_ConcertId",
                        column: x => x.ConcertId,
                        principalTable: "Concerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConcertFiles_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConcertParties",
                columns: table => new
                {
                    ConcertId = table.Column<int>(type: "integer", nullable: false),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConcertParties", x => new { x.ConcertId, x.PartyId, x.Role });
                    table.ForeignKey(
                        name: "FK_ConcertParties_Concerts_ConcertId",
                        column: x => x.ConcertId,
                        principalTable: "Concerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConcertParties_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConcertAlbums_AlbumId",
                table: "ConcertAlbums",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertCovers_ConcertId",
                table: "ConcertCovers",
                column: "ConcertId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConcertCovers_CreatedAt",
                table: "ConcertCovers",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertCovers_FileId",
                table: "ConcertCovers",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertFiles_ConcertId",
                table: "ConcertFiles",
                column: "ConcertId");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertFiles_ConcertId_Order",
                table: "ConcertFiles",
                columns: new[] { "ConcertId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_ConcertFiles_CreatedAt",
                table: "ConcertFiles",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertFiles_FileId",
                table: "ConcertFiles",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertFiles_Type",
                table: "ConcertFiles",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertParties_ConcertId_Role",
                table: "ConcertParties",
                columns: new[] { "ConcertId", "Role" });

            migrationBuilder.CreateIndex(
                name: "IX_ConcertParties_PartyId",
                table: "ConcertParties",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_ConcertParties_Role",
                table: "ConcertParties",
                column: "Role");

            migrationBuilder.CreateIndex(
                name: "IX_Concerts_CreatedAt",
                table: "Concerts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Concerts_CreatedByUserId",
                table: "Concerts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Concerts_Date",
                table: "Concerts",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Concerts_NormalizedTitle",
                table: "Concerts",
                column: "NormalizedTitle");

            migrationBuilder.CreateIndex(
                name: "IX_Concerts_UpdatedAt",
                table: "Concerts",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConcertAlbums");

            migrationBuilder.DropTable(
                name: "ConcertCovers");

            migrationBuilder.DropTable(
                name: "ConcertFiles");

            migrationBuilder.DropTable(
                name: "ConcertParties");

            migrationBuilder.DropTable(
                name: "Concerts");
        }
    }
}
