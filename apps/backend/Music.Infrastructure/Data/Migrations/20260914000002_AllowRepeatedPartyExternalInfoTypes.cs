using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Music.Infrastructure.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260914000002_AllowRepeatedPartyExternalInfoTypes")]
public sealed class AllowRepeatedPartyExternalInfoTypes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_PartyExternalInfo_PartyId_Type", table: "PartyExternalInfo");
        migrationBuilder.CreateIndex(name: "IX_PartyExternalInfo_PartyId_Type", table: "PartyExternalInfo", columns: new[] { "PartyId", "Type" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Restoring uniqueness requires callers to resolve repeated types first.
        // Do not silently delete user data on rollback.
        migrationBuilder.DropIndex(name: "IX_PartyExternalInfo_PartyId_Type", table: "PartyExternalInfo");
        migrationBuilder.CreateIndex(name: "IX_PartyExternalInfo_PartyId_Type", table: "PartyExternalInfo", columns: new[] { "PartyId", "Type" }, unique: true);
    }
}
