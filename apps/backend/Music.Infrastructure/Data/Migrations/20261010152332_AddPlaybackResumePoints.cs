using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaybackResumePoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlaybackResumePoints",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AlbumTrackId = table.Column<int>(type: "integer", nullable: false),
                    PositionMs = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaybackResumePoints", x => new { x.UserId, x.DeviceId });
                    table.ForeignKey(
                        name: "FK_PlaybackResumePoints_AlbumTracks_AlbumTrackId",
                        column: x => x.AlbumTrackId,
                        principalTable: "AlbumTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaybackResumePoints_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlaybackResumePoints_AlbumTrackId",
                table: "PlaybackResumePoints",
                column: "AlbumTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaybackResumePoints_UserId_UpdatedAt",
                table: "PlaybackResumePoints",
                columns: new[] { "UserId", "UpdatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlaybackResumePoints");
        }
    }
}
