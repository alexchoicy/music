using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Music.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class External : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Parties",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MusicBrainzId",
                table: "Parties",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PartyExternalInfo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ExternalIds = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartyExternalInfo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartyExternalInfo_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PartyExternalInfo_ExternalIds",
                table: "PartyExternalInfo",
                column: "ExternalIds");

            migrationBuilder.CreateIndex(
                name: "IX_PartyExternalInfo_PartyId",
                table: "PartyExternalInfo",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyExternalInfo_PartyId_Type",
                table: "PartyExternalInfo",
                columns: new[] { "PartyId", "Type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartyExternalInfo_Type",
                table: "PartyExternalInfo",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartyExternalInfo");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Parties");

            migrationBuilder.DropColumn(
                name: "MusicBrainzId",
                table: "Parties");
        }
    }
}
