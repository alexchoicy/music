using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Music.Infrastructure.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260914000001_PartyEnrichmentProvenance")]
public sealed class PartyEnrichmentProvenance : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(name: "SourceType", table: "PartyExternalInfo", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<int>(name: "SourceType", table: "PartyImages", type: "integer", nullable: false, defaultValue: 0);
        // Historically enrichment was the only writer without an attributed user.
        migrationBuilder.Sql("""
            UPDATE "PartyExternalInfo" SET "SourceType" = 1 WHERE "AddedByUserId" IS NULL;
            UPDATE "PartyImages" SET "SourceType" = 1 WHERE "AddedByUserId" IS NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "SourceType", table: "PartyExternalInfo");
        migrationBuilder.DropColumn(name: "SourceType", table: "PartyImages");
    }
}
