using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Music.Infrastructure.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260923000000_AddPartyRelationshipType")]
public sealed class AddPartyRelationshipType : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing rows already represent membership, which is MemberOf (0).
        migrationBuilder.AddColumn<int>(
            name: "Type",
            table: "PartyMemberships",
            type: "integer",
            nullable: false,
            defaultValue: 0
        );

        migrationBuilder.DropPrimaryKey(name: "PK_PartyMemberships", table: "PartyMemberships");
        migrationBuilder.AddPrimaryKey(
            name: "PK_PartyMemberships",
            table: "PartyMemberships",
            columns: ["PartyId", "MemberId", "Type"]
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Do not silently turn voice acting or affiliation into membership on rollback.
        migrationBuilder.Sql(
            """
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM "PartyMemberships" WHERE "Type" <> 0) THEN
                    RAISE EXCEPTION 'Cannot remove relationship types while non-membership relationships exist.';
                END IF;
            END $$;
            """
        );

        migrationBuilder.DropPrimaryKey(name: "PK_PartyMemberships", table: "PartyMemberships");
        migrationBuilder.DropColumn(name: "Type", table: "PartyMemberships");
        migrationBuilder.AddPrimaryKey(
            name: "PK_PartyMemberships",
            table: "PartyMemberships",
            columns: ["PartyId", "MemberId"]
        );
    }
}
