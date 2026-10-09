using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExtras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExtraAlbums",
                columns: table => new
                {
                    ExtraId = table.Column<Guid>(type: "uuid", nullable: false),
                    AlbumId = table.Column<int>(type: "integer", nullable: false),
                    AlbumDiscId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtraAlbums", x => new { x.ExtraId, x.AlbumId });
                    table.ForeignKey(
                        name: "FK_ExtraAlbums_AlbumDiscs_AlbumDiscId",
                        column: x => x.AlbumDiscId,
                        principalTable: "AlbumDiscs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ExtraAlbums_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExtraAssets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExtraId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtraAssets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExtraAssets_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Extras",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    CoverAssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    CoverCropX = table.Column<int>(type: "integer", nullable: true),
                    CoverCropY = table.Column<int>(type: "integer", nullable: true),
                    CoverCropWidth = table.Column<int>(type: "integer", nullable: true),
                    CoverCropHeight = table.Column<int>(type: "integer", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Extras", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Extras_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Extras_ExtraAssets_CoverAssetId",
                        column: x => x.CoverAssetId,
                        principalTable: "ExtraAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ExtraConcerts",
                columns: table => new
                {
                    ExtraId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConcertId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtraConcerts", x => new { x.ExtraId, x.ConcertId });
                    table.ForeignKey(
                        name: "FK_ExtraConcerts_Concerts_ConcertId",
                        column: x => x.ConcertId,
                        principalTable: "Concerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExtraConcerts_Extras_ExtraId",
                        column: x => x.ExtraId,
                        principalTable: "Extras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExtraParties",
                columns: table => new
                {
                    ExtraId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtraParties", x => new { x.ExtraId, x.PartyId });
                    table.ForeignKey(
                        name: "FK_ExtraParties_Extras_ExtraId",
                        column: x => x.ExtraId,
                        principalTable: "Extras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExtraParties_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExtraAlbums_AlbumDiscId",
                table: "ExtraAlbums",
                column: "AlbumDiscId");

            migrationBuilder.CreateIndex(
                name: "IX_ExtraAlbums_AlbumId",
                table: "ExtraAlbums",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_ExtraAssets_CreatedAt",
                table: "ExtraAssets",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ExtraAssets_ExtraId_SortOrder",
                table: "ExtraAssets",
                columns: new[] { "ExtraId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ExtraAssets_FileId",
                table: "ExtraAssets",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_ExtraConcerts_ConcertId",
                table: "ExtraConcerts",
                column: "ConcertId");

            migrationBuilder.CreateIndex(
                name: "IX_ExtraParties_PartyId",
                table: "ExtraParties",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_Extras_Category",
                table: "Extras",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Extras_CoverAssetId",
                table: "Extras",
                column: "CoverAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Extras_CreatedAt",
                table: "Extras",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Extras_CreatedByUserId",
                table: "Extras",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Extras_UpdatedAt",
                table: "Extras",
                column: "UpdatedAt");

            migrationBuilder.AddForeignKey(
                name: "FK_ExtraAlbums_Extras_ExtraId",
                table: "ExtraAlbums",
                column: "ExtraId",
                principalTable: "Extras",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ExtraAssets_Extras_ExtraId",
                table: "ExtraAssets",
                column: "ExtraId",
                principalTable: "Extras",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExtraAssets_Extras_ExtraId",
                table: "ExtraAssets");

            migrationBuilder.DropTable(
                name: "ExtraAlbums");

            migrationBuilder.DropTable(
                name: "ExtraConcerts");

            migrationBuilder.DropTable(
                name: "ExtraParties");

            migrationBuilder.DropTable(
                name: "Extras");

            migrationBuilder.DropTable(
                name: "ExtraAssets");
        }
    }
}
