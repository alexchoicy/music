using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Music.Infrastructure.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260923020000_UseUuidPartyRelationshipId")]
public sealed class UseUuidPartyRelationshipId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Assign UUIDs to existing relationships; the application generates new IDs.
        migrationBuilder.AddColumn<Guid>(
            name: "Id",
            table: "PartyMemberships",
            type: "uuid",
            nullable: false,
            defaultValueSql: "gen_random_uuid()"
        );
        migrationBuilder.AlterColumn<Guid>(
            name: "Id",
            table: "PartyMemberships",
            type: "uuid",
            nullable: false,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldDefaultValueSql: "gen_random_uuid()"
        );

        migrationBuilder.CreateIndex(
            name: "IX_PartyMemberships_PartyId_MemberId_Type",
            table: "PartyMemberships",
            columns: ["PartyId", "MemberId", "Type"],
            unique: true
        );

        migrationBuilder.DropPrimaryKey(name: "PK_PartyMemberships", table: "PartyMemberships");
        migrationBuilder.AddPrimaryKey(
            name: "PK_PartyMemberships",
            table: "PartyMemberships",
            column: "Id"
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropPrimaryKey(name: "PK_PartyMemberships", table: "PartyMemberships");
        migrationBuilder.AddPrimaryKey(
            name: "PK_PartyMemberships",
            table: "PartyMemberships",
            columns: ["PartyId", "MemberId", "Type"]
        );
        migrationBuilder.DropIndex(
            name: "IX_PartyMemberships_PartyId_MemberId_Type",
            table: "PartyMemberships"
        );
        migrationBuilder.DropColumn(name: "Id", table: "PartyMemberships");
    }
}
