using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonalPlaylists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Playlists",
                columns: table => new
                {
                    Id = table
                        .Column<int>(type: "integer", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    Name = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
                    OwnerUserId = table.Column<string>(type: "text", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    UpdatedAt = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Playlists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Playlists_AspNetUsers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "PlaylistEntries",
                columns: table => new
                {
                    Id = table
                        .Column<int>(type: "integer", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    PlaylistId = table.Column<int>(type: "integer", nullable: false),
                    AlbumTrackId = table.Column<int>(type: "integer", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaylistEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlaylistEntries_AlbumTracks_AlbumTrackId",
                        column: x => x.AlbumTrackId,
                        principalTable: "AlbumTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "FK_PlaylistEntries_Playlists_PlaylistId",
                        column: x => x.PlaylistId,
                        principalTable: "Playlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_PlaylistEntries_AlbumTrackId",
                table: "PlaylistEntries",
                column: "AlbumTrackId"
            );

            migrationBuilder.CreateIndex(
                name: "IX_PlaylistEntries_PlaylistId_AlbumTrackId",
                table: "PlaylistEntries",
                columns: new[] { "PlaylistId", "AlbumTrackId" },
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_PlaylistEntries_PlaylistId_Position",
                table: "PlaylistEntries",
                columns: new[] { "PlaylistId", "Position" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Playlists_OwnerUserId_UpdatedAt",
                table: "Playlists",
                columns: new[] { "OwnerUserId", "UpdatedAt" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PlaylistEntries");

            migrationBuilder.DropTable(name: "Playlists");
        }
    }
}
